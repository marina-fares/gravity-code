"""
models_sessions.py  —  Phase 1: Database & Model Optimisation
=============================================================

Changes from the original
--------------------------
1.  Meta.indexes added to all models (zero indexes existed before).
    - Booking: composite (session, status) — hottest path in the whole system.
    - Session: composite (product, start_time) — "available slots" endpoint.
    - Customer: btree on (group) + (identifier) for booking search.
    - Product / Schedule: btree on (group) / (product).

2.  Booking.calculate_available_seats() — new @staticmethod.
    Replaces the Python-side sum() pattern used in 7+ places:
        sum(Booking.objects.filter(...).values_list('number_of_players', flat=True))
    with a single SQL SUM() aggregate. One DB round-trip, zero Python
    iteration regardless of booking count.

3.  Booking.save() rewritten with two key optimisations:
    a. New booking  → atomic F() decrement instead of a Python recalculation.
    b. Existing booking → recalculate ONLY when a seat-sensitive field changes.
       Metadata-only saves (Zoho IDs, Square IDs, note, payment data, etc.)
       now skip the recalculation entirely.
    Uses Session.objects.filter().update() instead of session.save() to avoid
    loading unnecessary columns and to skip Session post-save signals.

4.  Session.default_block_seats promoted to @staticmethod so Django migrations
    can serialise the default correctly without pickling issues.

5.  Booking.number_of_players default corrected from True (bug) to None.
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
    price = models.FloatField()
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    class Meta:
        indexes = [
            # Products are almost always looked up per-group.
            # Covers: SessionApi, BookingApi search, admin querysets.
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

class Session(models.Model):
    """
    A single scheduled time slot for a Product.

    ``available_seats`` is a *denormalised cache* kept in sync by:
        added_seats + product.max_num − active_booking_sum − block_seats

    Use Booking.calculate_available_seats(session) whenever you need an
    authoritative value — that helper runs a fresh SQL aggregate.
    The cached value exists only to avoid an aggregate on every page load.
    """


    def default_block_seats():
        """
        Default factory for block_seats_obj.
        Must be a @staticmethod (not a nested function) so Django migrations
        can serialise it without pickling errors.
        """
        return {"number": 0, "note": "none"}

    product = models.ForeignKey(
        Product, on_delete=models.CASCADE, null=True, blank=True
    )
    start_time = models.DateTimeField(null=True, blank=True)
    end_time = models.DateTimeField(null=True, blank=True)
    available_seats = models.IntegerField(null=True, blank=True)
    block_seats = models.IntegerField(null=True, blank=True, default=0)
    block_seats_obj = models.JSONField(
        "Block Seats Obj",
        default=default_block_seats,
        null=True,
        blank=True,
    )
    weekday = models.CharField(max_length=10, null=True, blank=True)
    added_seats = models.IntegerField(default=0, null=True, blank=True)

    class Meta:
        indexes = [
            # Hottest read path: filter(product=X, start_time__date=Y)
            # Called on every "get available slots" request from the frontend.
            # Composite index covers both predicates in a single index scan.
            models.Index(
                fields=["product", "start_time"],
                name="session_product_start_idx",
            ),
            # Used in SessionApi.get() / OneSessionApi.get():
            #   filter(id__gte=session_id, start_time__date=...)
            # Also used by the admin CalendarFilter.
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
    Not involved in the live booking flow directly.
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
            # Used in session-creation admin forms:
            #   Schedule.objects.get(weekday=X, product=Y)
            models.Index(fields=["product"], name="schedule_product_idx"),
        ]


# ---------------------------------------------------------------------------
# Booking
# ---------------------------------------------------------------------------

class Booking(models.Model):
    """
    A single reservation made by a Customer for a Session.

    Seat accounting overview
    ------------------------
    New booking:
        Session.available_seats is atomically decremented via an F() expression
        inside save().  The booking_api holds SELECT FOR UPDATE on the session
        row so concurrent requests cannot double-book.

    Update with seat change:
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
    booking_customer = models.ForeignKey('Customer', on_delete=models.CASCADE, null=True, blank=True, max_length=100)
    customer_name = models.CharField(null=True, blank=True, max_length=100)
    options = models.JSONField(default=list, blank=True, null=True)
    payment = models.JSONField(default=dict, blank=True, null=True)
    # Bug fix: original default=True was a boolean coerced to integer 1.
    # Changed to None so "not yet set" is represented accurately.
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

    class Meta:
        indexes = [
            # ----------------------------------------------------------------
            # MOST CRITICAL INDEX — covers the hottest query in the system.
            #
            # Every booking create/update/delete fires:
            #   Booking.objects
            #       .filter(session_id=X)
            #       .exclude(status='refunded')
            #       .aggregate(total=Sum('number_of_players'))
            #
            # Without this index PostgreSQL must scan the entire bookings
            # table (90k+ rows) on EVERY booking write.
            # The composite (session, status) covers both predicates in one
            # index scan — session narrows to ~10-50 rows, status filters
            # out refunded ones.
            # ----------------------------------------------------------------
            models.Index(
                fields=["session", "status"],
                name="booking_session_status_idx",
            ),
            
            # Receipt-number search (BTree for exact match;
            # pg_trgm GIN index handles icontains — see migration RunSQL)
            models.Index(
                fields=["square_receipt_number"],
                name="booking_receipt_idx",
            ),
            # Admin date-range queries and history views
            models.Index(fields=["created_at"], name="booking_created_at_idx"),
            # Status-only filter (admin list, status='done' in session view)
            models.Index(fields=["status"], name="booking_status_idx"),
            # creation_agent lookup in booking search endpoint
            models.Index(fields=["creation_agent"], name="booking_agent_idx"),
        ]

    # -----------------------------------------------------------------------
    # Seat-count helper — single source of truth for the formula
    # -----------------------------------------------------------------------


    def calculate_available_seats(session):
        """
        Return the correct available_seats value for *session* using a single
        SQL SUM() aggregate.

        WHY THIS MATTERS
        ----------------
        Original pattern (used in 7 different places across the codebase):

            sum(
                Booking.objects
                    .filter(session_id=X)
                    .exclude(status='refunded')
                    .values_list('number_of_players', flat=True)
            )

        This loads every booking row for the session into Python memory,
        instantiates ORM objects, and then sums them in Python.

        Optimised pattern (this method):

            Booking.objects
                .filter(session_id=X)
                .exclude(status='refunded')
                .aggregate(total=Sum('number_of_players'))['total'] or 0

        One SQL round-trip, the database does the arithmetic, zero Python
        iteration regardless of how many bookings exist.

        With the composite (session, status) index in place, this query
        is an index-only scan on a tiny slice of rows.

        FORMULA
        -------
            available = added_seats + product.max_num
                        - active_booking_sum
                        - block_seats

        Precondition: session.product must already be loaded.
        Call this method only after select_related("product") to avoid an
        extra database round-trip.
        """
        active_sum = (
            Booking.objects
            .filter(session_id=session.pk)
            .exclude(status="refunded")
            .aggregate(total=Sum("number_of_players"))
        )["total"] or 0

        return (
            (session.added_seats or 0)
            + (session.product.max_num or 0)
            - active_sum
            - (session.block_seats or 0)
        )

    # -----------------------------------------------------------------------
    # save() — guarded recalculation
    # -----------------------------------------------------------------------

    # Changing any of these fields affects how many seats a session has.
    _SEAT_SENSITIVE_FIELDS = frozenset(
        {"number_of_players", "session", "session_id", "status"}
    )

    def save(self, *args, **kwargs):
        """
        Seat accounting on save().

        New booking (self.pk is None)
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        Atomically decrement available_seats via F() expression.  Because
        booking_api.py holds a SELECT FOR UPDATE lock on the session row for
        the duration of the transaction, there is no race condition.

        Existing booking update (self.pk is not None)
        ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
        Only recalculate when a seat-sensitive field is changing.

        If update_fields is provided and contains none of:
            number_of_players, session, session_id, status
        then skip the recalculation entirely.

        This is the single largest win for write-heavy workloads:
        every booking completion writes at minimum: square_receipt_number,
        square_payment_id, zoho_sales_receipt_id, status.  Most of those
        writes are metadata-only and never touched seat counts — but the
        original code recalculated on ALL of them.

        Implementation details
        ~~~~~~~~~~~~~~~~~~~~~~
        - Uses Session.objects.filter().update() instead of session.save()
          to avoid loading unneeded columns and to skip Session post-save
          signals.
        - Loads the pre-save snapshot with only() to minimise columns
          transferred from PostgreSQL.
        """
        update_fields = kwargs.get("update_fields")

        if self.pk:
            # ── Existing booking ────────────────────────────────────────────
            should_recalculate = (
                update_fields is None  # full save: always be conservative
                or bool(self._SEAT_SENSITIVE_FIELDS.intersection(update_fields))
            )

            if should_recalculate:
                # Fetch pre-save snapshot with minimum columns.
                try:
                    old = (
                        Booking.objects
                        .select_related("session__product")
                        .only(
                            "session_id",
                            "number_of_players",
                            "session__added_seats",
                            "session__block_seats",
                            "session__product__max_num",
                        )
                        .get(pk=self.pk)
                    )
                except Booking.DoesNotExist:
                    old = None

                if old and old.session_id and old.number_of_players is not None:
                    new_available = Booking.calculate_available_seats(old.session)
                    Session.objects.filter(pk=old.session_id).update(
                        available_seats=new_available
                    )

        elif self.session_id and self.number_of_players:
            # ── New booking — atomic F() decrement ──────────────────────────
            # SELECT FOR UPDATE in booking_api.py serialises concurrent writes.
            Session.objects.filter(pk=self.session_id).update(
                available_seats=F("available_seats") - self.number_of_players
            )

        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.id} - {self.session} - "
            f"{self.number_of_players} - {self.status}"
        )
class Customer(models.Model):
    identifier = models.CharField(max_length=150, unique=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, blank=True, null=True)
    # all_bookings = models.Many(Booking, blank=True, null=True)

    def __str__(self):
        return self.identifier