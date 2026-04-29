"""
admin/bookings.py
=================

ROOT CAUSE of the slow admin booking detail (change) page
----------------------------------------------------------
Django renders ForeignKey fields as <select> dropdowns by default.
For the Booking model, that means:

  - `session`          → SELECT * FROM Main_session   (thousands of timeslot rows)
  - `booking_customer` → SELECT * FROM Main_customer  (thousands of customer rows)

Every time you open ONE booking in the admin, Django fetches EVERY row from
both tables to populate those two dropdowns. With years of session data and
thousands of customers this is the dominant cause of the slow detail page.

PRIMARY FIX: raw_id_fields + autocomplete_fields
-------------------------------------------------
  raw_id_fields = ("session",)
      Replaces the full Session <select> with a plain integer input + popup
      search. Django no longer loads the entire session table on form render.

  autocomplete_fields = ("booking_customer",)
      Replaces the full Customer <select> with a live-search input that only
      queries when the user types. Requires CustomerAdmin to define
      search_fields (see CustomerAdmin below).

Additional list-view fixes
--------------------------
  list_select_related   — prevents N+1 on the list page
  list_per_page = 50    — halves the default 100-row load
  show_full_result_count = False — removes the COUNT(*) on every list page
  explicit list_display — prevents Django rendering all fields + JSON fields
  ordering = ("-created_at",) — uses the booking_created_at_idx index
"""

from django.contrib import admin
from django.db import transaction

from ..models.models_sessions import Booking, Customer, Session


# ---------------------------------------------------------------------------
# CustomerAdmin — MUST be registered here so BookingAdmin can use
# autocomplete_fields = ("booking_customer",).
# Django requires the FK target admin to define search_fields.
# ---------------------------------------------------------------------------

@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    search_fields = ("identifier",)
    list_display = ("id", "identifier", "group")
    list_filter = ("group",)
    list_per_page = 50
    show_full_result_count = False

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("group")
        if request.user.is_superuser:
            return qs
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(group__name__in=group_names)


# ---------------------------------------------------------------------------
# BookingAdmin
# ---------------------------------------------------------------------------

@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):

    # ── PRIMARY FIX ─────────────────────────────────────────────────────────
    # These two lines are the main fix for the slow detail page.
    # Before: Django fetched ALL sessions + ALL customers on every form open.
    # After:  Django fetches nothing extra — user searches via popup/autocomplete.
    raw_id_fields = ("session",)
    autocomplete_fields = ("booking_customer",)

    # ── List view ────────────────────────────────────────────────────────────
    list_display = (
        "id",
        "get_session_label",
        "booking_customer",
        "customer_name",
        "number_of_players",
        "status",
        "creation_agent",
        "square_receipt_number",
        "created_at",
    )
    search_fields = ("id", "square_receipt_number", "booking_customer__identifier")
    list_filter = ("status",)
    date_hierarchy = "created_at"
    ordering = ("-created_at",)

    # Forces list view to join session+product+customer in ONE query
    # (prevents N+1 per row)
    list_select_related = ("booking_customer", "session__product")

    # Default is 100 — halving it halves the rows loaded per page
    list_per_page = 50

    # Removes the full COUNT(*) query fired on every list page load
    show_full_result_count = False

    # Write-once external IDs — readonly prevents edits and avoids
    # rendering editable widgets for these fields
    readonly_fields = (
        "square_receipt_number",
        "square_order_id",
        "square_payment_id",
        "zoho_sales_receipt_id",
        "zoho_sales_receipt_num",
        "created_at",
    )

    # ── Custom column ────────────────────────────────────────────────────────

    def get_session_label(self, obj):
        """
        Shows product name + start time without an extra DB query.
        select_related("session__product") in get_queryset() ensures
        obj.session.product is already loaded.
        """
        if obj.session_id is None:
            return "—"
        s = obj.session
        product_name = s.product.name if s.product_id else "?"
        return f"{product_name} — {s.start_time}"

    get_session_label.short_description = "Session"
    get_session_label.admin_order_field = "session__start_time"

    # ── Queryset ─────────────────────────────────────────────────────────────

    def get_queryset(self, request):
        """
        select_related on BOTH session__product AND booking_customer.
        The previous version had a trailing comma with nothing after it,
        meaning booking_customer was NOT being joined — one extra query
        per row in the list.
        """
        qs = Booking.objects.select_related(
            "session__product",
            "booking_customer",
        )
        if request.user.is_superuser:
            return qs
        group_names = list(
            request.user.groups.values_list("name", flat=True)
        )
        return qs.filter(session__product__group__name__in=group_names)

    # ── Bulk delete ──────────────────────────────────────────────────────────

    def delete_queryset(self, request, queryset):
        """
        Bulk-delete and recalculate seats in O(N_unique_sessions) queries.
        """
        affected_session_ids = list(
            queryset.values_list("session_id", flat=True).distinct()
        )
        with transaction.atomic():
            queryset.delete()
            sessions = (
                Session.objects
                .select_related("product")
                .filter(pk__in=affected_session_ids)
            )
            for session in sessions:
                new_available = Booking.calculate_available_seats(session)
                Session.objects.filter(pk=session.pk).update(
                    available_seats=new_available
                )