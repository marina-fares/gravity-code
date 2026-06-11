"""
models_sessions.py
==================
"""

from datetime import timedelta

from django.contrib.auth.models import Group
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import F, Sum
from django.utils import timezone


# ---------------------------------------------------------------------------
# Product
# ---------------------------------------------------------------------------

class Product(models.Model):
    """
    Represents a bookable activity type (e.g. "VR Arena 1 Hour").
    ``max_num`` is the hard capacity ceiling for any Session of this Product.
    """

    name = models.CharField(max_length=30)
    nick_name = models.CharField("Nick Name", max_length=30, blank=True, null=True)
    duration = models.DurationField(default=timedelta(0))
    min_num = models.IntegerField(default=0, null=True, blank=True)
    max_num = models.IntegerField(default=0, null=True, blank=True)
    # FIX #1: FloatField for money loses precision (e.g. 99.9 → 99.89999999999).
    # DecimalField stores exact values in the DB.
    price = models.DecimalField(max_digits=10, decimal_places=2)
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            models.Index(fields=["group"], name="product_group_idx"),
        ]

    def clean(self):
        if self.max_num is not None and self.max_num <= 0:
            raise ValidationError(
                "The Max number should be more than 0, as this is the session capacity"
            )

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Session
# ---------------------------------------------------------------------------

def _default_block_seats():
    """
    Module-level default factory for Session.block_seats_obj.

    Must be at module level, not a @staticmethod inside the class.
    Django's JSONField system check (fields.E010) requires the default to be
    a plain callable. A staticmethod descriptor satisfies this on some Django
    versions but raises E010 on others. Module-level is unambiguous.
    """
    return {"number": 0, "note": "none"}


class Session(models.Model):
    """
    A single scheduled time slot for a Product.

    ``available_seats`` is a *denormalised cache* kept in sync by:
        added_seats + product.max_num − active_booking_sum − block_seats

    Use Booking.calculate_available_seats(session) whenever you need an
    authoritative value — that helper runs a fresh SQL aggregate.
    """

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, null=True, blank=True
    )
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    available_seats = models.IntegerField(null=True, blank=True)
    block_seats = models.IntegerField(null=True, blank=True, default=0)
    block_seats_obj = models.JSONField(
        "Block Seats Obj",
        # FIX: @staticmethod inside a class body is a descriptor, not a plain
        # callable. When Django's system check evaluates `default=default_block_seats`
        # at class definition time, it sees a staticmethod object and raises E010.
        # Fix: reference the module-level function defined below the class,
        # which is a plain callable with no descriptor wrapping.
        default=_default_block_seats,
        null=True,
        blank=True,
    )
    weekday = models.CharField(max_length=10, null=True, blank=True)
    added_seats = models.IntegerField(default=0, null=True, blank=True)

    class Meta:
        indexes = [
            # Hottest read: filter(product=X, start_time__date=Y)
            models.Index(
                fields=["product", "start_time"],
                name="session_product_start_idx",
            ),
            # filter(id__gte=X, start_time__date=Y) and admin CalendarFilter
            models.Index(fields=["start_time"], name="session_start_time_idx"),
        ]

    def delete(self, *args, **kwargs):
        """Prevent deletion of sessions that have attached bookings."""
        if Booking.objects.filter(session=self).exists():
            raise ValidationError(
                "Cannot delete this session because it has bookings attached."
            )
        super().delete(*args, **kwargs)

    def __str__(self):
        product_name = self.product.name if self.product else "—"
        return f"{product_name} - {self.start_time}"


# ---------------------------------------------------------------------------
# Schedule
# ---------------------------------------------------------------------------

class Schedule(models.Model):
    """
    Defines the recurring time template used to auto-generate Sessions.
    """

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, null=True, blank=True
    )
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    weekday = models.CharField(max_length=20, null=True, blank=True)
    except_hours = ArrayField(
        models.CharField(max_length=10),
        blank=True,
        default=list,
    )

    class Meta:
        indexes = [
            models.Index(fields=["product"], name="schedule_product_idx"),
        ]
    
    def __str__(self):
        product_name = self.product.name if self.product else "—"
        return f"{product_name} - {self.weekday} {self.start_time} to {self.end_time}"


# ---------------------------------------------------------------------------
# Customer
# ---------------------------------------------------------------------------

class Customer(models.Model):
    """
    A lightweight customer record used to track who made a booking.
    ``identifier`` is typically a phone number or name entered at the kiosk.

    A pg_trgm GIN index on ``identifier`` is added in migration
    0002_phase1_performance_indexes for fast icontains search.
    """

    identifier = models.CharField(max_length=150)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, blank=True, null=True)

    # FIX #2: Customer was missing its Meta.indexes entirely — it was placed
    # AFTER the Booking class in the file, outside any class block, so Django
    # never saw these indexes as part of the Customer model definition.
    # Moved Customer BEFORE Booking so the FK in Booking can use a string
    # reference and the indexes are properly attached.
    class Meta:
        indexes = [
            models.Index(fields=["group"], name="customer_group_idx"),
            models.Index(fields=["identifier"], name="customer_identifier_idx"),
        ]

    def __str__(self):
        return self.identifier


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class Booking(models.Model):
    """
    A single reservation made by a Customer for a Session.

    Seat accounting overview
    ------------------------
    New booking:
        Session.available_seats is atomically decremented via F() inside
        save(). booking_api holds SELECT FOR UPDATE on the session row.

    Update with seat-sensitive field change:
        Full recalculation via calculate_available_seats() — one SQL aggregate.

    Metadata-only update (payment IDs, note, Zoho IDs, etc.):
        No recalculation — the save() guard skips it entirely.

    Delete:
        booking_api calls calculate_available_seats() AFTER deletion so the
        aggregate excludes the deleted booking automatically.
    """

    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("done", "Done"),
        ("refunded", "Refunded"),
        ("hold", "Hold"),
    ]

    session = models.ForeignKey(
        Session, on_delete=models.PROTECT, null=True, blank=True
    )
    # FIX #3: max_length is not a valid argument on ForeignKey — Django ignores
    # it silently but it is misleading and generates migration noise.
    booking_customer = models.ForeignKey(
        Customer, on_delete=models.CASCADE, null=True, blank=True
    )
    customer_name = models.CharField(null=True, blank=True, max_length=100)
    options = models.JSONField(default=list, blank=True, null=True)
    payment = models.JSONField(default=dict, blank=True, null=True)
    number_of_players = models.IntegerField(null=True, default=None)
    type_of_players = models.CharField(null=True, blank=True, max_length=20)
    creation_agent = models.CharField(null=True, blank=True, max_length=100)
    created_at = models.DateTimeField(null=True, blank=True, default=timezone.now)
    square_receipt_number = models.CharField(null=True, blank=True, max_length=20)
    square_order_id = models.CharField(null=True, blank=True, max_length=100)
    square_payment_id = models.CharField(null=True, blank=True, max_length=100)
    zoho_sales_receipt_id = models.CharField(null=True, blank=True, max_length=100)
    zoho_sales_receipt_num = models.CharField(null=True, blank=True, max_length=50)
    note = models.CharField(null=True, blank=True, max_length=100)
    status = models.CharField(
        null=True, blank=True, choices=STATUS_CHOICES, max_length=100
    )
    refunded_by = models.ForeignKey(
        "auth.User",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="refunded_bookings",
    )
    refunded_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        indexes = [
            # MOST CRITICAL: covers seat recalculation on every booking write
            models.Index(
                fields=["session", "status"],
                name="booking_session_status_idx",
            ),
            # FK lookup: booking search + admin list
            models.Index(
                fields=["booking_customer"],
                name="booking_customer_idx",
            ),
            # Receipt-number BTree (GIN trigram index in migration)
            models.Index(
                fields=["square_receipt_number"],
                name="booking_receipt_idx",
            ),
            # Admin date_hierarchy and history views
            models.Index(fields=["created_at"], name="booking_created_at_idx"),
            # Status-only filter (admin, status='done' in session view)
            models.Index(fields=["status"], name="booking_status_idx"),
            # creation_agent in booking search endpoint
            models.Index(fields=["creation_agent"], name="booking_agent_idx"),
        ]

    # -----------------------------------------------------------------------
    # FIX #4: @staticmethod decorator was missing from calculate_available_seats.
    # Without it, calling Booking.calculate_available_seats(session) works
    # but calling instance.calculate_available_seats(session) would pass
    # `instance` as the first argument instead of `session`, causing a
    # silent wrong result or AttributeError.
    # -----------------------------------------------------------------------

    @staticmethod
    def calculate_available_seats(session):
        """
        Return the correct available_seats for *session* via a single SQL aggregate.

        Formula: added_seats + product.max_num - active_booking_sum - block_seats

        Precondition: session.product must already be loaded via select_related.
        """
        active_sum = (
            Booking.objects
            .filter(session_id=session.pk)
            .exclude(status="refunded")
            .aggregate(total=Sum("number_of_players"))
        )["total"] or 0

        return max(
            0,
            (session.added_seats or 0)
            + (session.product.max_num or 0)
            - active_sum
            - (session.block_seats or 0)
        )

    def save(self, *args, **kwargs):
        """
        Plain save — seat accounting is handled entirely by the API layer
        (booking_api.py) AFTER the booking is committed to the database.

        Doing seat maths here was unreliable because:
        - For new bookings the row doesn't exist in the DB yet, so
          calculate_available_seats() cannot include it.
        - For updates (e.g. status → refunded) the old value is still in the
          DB when save() runs, so calculate_available_seats() returns the
          pre-change count.
        Both cases produced wrong available_seats values.
        The API calls _recalculate_session_seats() after every save(), which
        runs calculate_available_seats() against the fully committed state.
        """
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.id} - {self.session} - "
            f"{self.number_of_players} - {self.status}"
        )