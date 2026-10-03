"""
run_cleanup_task
================

Deletes records older than one year to keep the database lean:

  - Booking        — deleted first (FK to Session is PROTECT, so bookings
                     must go before their sessions can be removed)
  - Session        — only sessions with no remaining bookings are deleted
  - ProfileHistory — shift history snapshots
  - SubShiftHistory — sub-shift history snapshots

Runs daily at 03:00 Cairo time (registered in settings.CRONJOBS).

Safe to re-run: all deletes are idempotent queryset operations.
Per-model try/except ensures one failure never aborts the rest.
"""

import logging
from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from Main.models.models_sessions import Booking, Session
from Main.models.models import ProfileHistory
from Main.models.models_sub_shift import SubShiftHistory


RETENTION_DAYS = 365

logger = logging.getLogger(__name__)


def run_cleanup():
    cutoff = timezone.now() - timedelta(days=RETENTION_DAYS)
    logger.info("Cleanup task started. Deleting records created before %s", cutoff.date())

    results = {}

    # ------------------------------------------------------------------
    # 1. Bookings
    #    Must be deleted BEFORE sessions because Booking.session is a
    #    ForeignKey with on_delete=PROTECT — PostgreSQL will reject a
    #    session DELETE if any booking still references it.
    # ------------------------------------------------------------------
    try:
        deleted, _ = Booking.objects.filter(created_at__lt=cutoff).delete()
        results['bookings'] = deleted
        logger.info("Deleted %d booking(s) older than %s", deleted, cutoff.date())
    except Exception as exc:
        results['bookings'] = 'ERROR'
        logger.exception("Failed to delete old bookings: %s", exc)

    # ------------------------------------------------------------------
    # 2. Sessions
    #    Only sessions with NO remaining bookings are removed.
    #    A session older than 1 year that somehow still has a recent
    #    booking (edge case) is left untouched rather than crashing.
    # ------------------------------------------------------------------
    try:
        deleted, _ = (
            Session.objects
            .filter(start_time__lt=cutoff)
            .filter(booking__isnull=True)   # reverse FK — no bookings left
            .delete()
        )
        results['sessions'] = deleted
        logger.info("Deleted %d session(s) older than %s", deleted, cutoff.date())
    except Exception as exc:
        results['sessions'] = 'ERROR'
        logger.exception("Failed to delete old sessions: %s", exc)

    # ------------------------------------------------------------------
    # 3. ProfileHistory  (shift snapshots)
    # ------------------------------------------------------------------
    try:
        deleted, _ = ProfileHistory.objects.filter(date__lt=cutoff).delete()
        results['profile_history'] = deleted
        logger.info("Deleted %d profile history record(s) older than %s", deleted, cutoff.date())
    except Exception as exc:
        results['profile_history'] = 'ERROR'
        logger.exception("Failed to delete old profile history: %s", exc)

    # ------------------------------------------------------------------
    # 4. SubShiftHistory  (sub-shift snapshots)
    # ------------------------------------------------------------------
    try:
        deleted, _ = SubShiftHistory.objects.filter(date__lt=cutoff).delete()
        results['subshift_history'] = deleted
        logger.info("Deleted %d sub-shift history record(s) older than %s", deleted, cutoff.date())
    except Exception as exc:
        results['subshift_history'] = 'ERROR'
        logger.exception("Failed to delete old sub-shift history: %s", exc)

    logger.info(
        "Cleanup task complete. Results: bookings=%s, sessions=%s, "
        "profile_history=%s, subshift_history=%s",
        results.get('bookings'), results.get('sessions'),
        results.get('profile_history'), results.get('subshift_history'),
    )
    return results


class Command(BaseCommand):
    help = 'Delete sessions, bookings, and shift history older than one year'

    def handle(self, *args, **kwargs):
        results = run_cleanup()
        self.stdout.write(
            f"Cleanup complete. "
            f"Bookings deleted: {results.get('bookings')} | "
            f"Sessions deleted: {results.get('sessions')} | "
            f"Profile history deleted: {results.get('profile_history')} | "
            f"Sub-shift history deleted: {results.get('subshift_history')}"
        )
