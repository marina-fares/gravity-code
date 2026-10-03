"""
run_midnight_task
=================

Auto-creates Session records for every Product based on the recurring
Schedule template. Runs daily so the system always has ~1 year of
bookable sessions ahead of "today".

Designed to be safely re-runnable:
- get_or_create() makes session creation idempotent
- Per-product try/except ensures one bad product cannot abort the rest
- Missing weekday schedules are skipped with a clear log line
"""

import logging
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from Main.models.models_sessions import Schedule, Product, Session


# How far ahead to keep sessions populated. Daily runs mean a slight
# leap-year drift doesn't matter; 365 days is simpler than pulling in
# python-dateutil as a dependency.
LOOKAHEAD_DAYS = 365


logger = logging.getLogger(__name__)


def my_midnight_function():
    products = Product.objects.all()
    total_created = 0
    total_failed_products = 0

    for product in products:
        try:
            # BUG FIX #1: zero duration causes an infinite inner loop.
            if not product.duration:
                logger.warning(
                    "Skipping product %s (%s): duration is zero or unset",
                    product.id, getattr(product, 'name', '?'),
                )
                continue

            latest_session = (
                Session.objects
                .filter(product_id=product.id)
                .order_by('-end_time')
                .first()
            )

            today = timezone.now().date()

            if not latest_session:
                # BUG FIX #2: new products (or products whose sessions were all
                # deleted) were silently skipped. Start from today instead.
                start_date = today
            else:
                # BUG FIX #3: clamp to today so we never waste time iterating
                # over past dates when the latest session is old.
                start_date = max(
                    latest_session.end_time.date() + timedelta(days=1),
                    today,
                )

            end_date = (timezone.now() + timedelta(days=LOOKAHEAD_DAYS)).date()

            if start_date > end_date:
                logger.info(
                    "Product %s (%s): sessions already populated through %s, nothing to do",
                    product.id, getattr(product, 'name', '?'), end_date,
                )
                continue

            product_created = 0
            while start_date <= end_date:
                weekday = start_date.strftime('%A')

                selected_schedule = Schedule.objects.filter(
                    product__id=product.id,
                    weekday=weekday,
                ).first()

                if not selected_schedule or not selected_schedule.start_time or not selected_schedule.end_time:
                    start_date += timedelta(days=1)
                    continue

                start_dt = timezone.make_aware(
                    datetime.combine(start_date, selected_schedule.start_time)
                )
                end_dt = timezone.make_aware(
                    datetime.combine(start_date, selected_schedule.end_time)
                )

                # BUG FIX #4: except_hours was never read. The Schedule stores
                # time strings like "10:00:00" (Python str(time) format) for
                # slots that should be skipped. Build a set for O(1) lookup.
                except_hours = set(selected_schedule.except_hours or [])

                while start_dt <= end_dt:
                    session_end = start_dt + product.duration

                    if str(start_dt.time()) in except_hours:
                        start_dt = session_end
                        continue

                    _, created = Session.objects.get_or_create(
                        product=product,
                        start_time=start_dt,
                        end_time=session_end,
                        defaults={
                            'available_seats': product.max_num,
                            'weekday': str(start_dt.strftime('%A')),
                        },
                    )
                    if created:
                        product_created += 1

                    start_dt = session_end

                start_date += timedelta(days=1)

            total_created += product_created
            logger.info(
                "Product %s (%s): created %d new sessions",
                product.id, getattr(product, 'name', '?'), product_created,
            )

        except Exception as exc:
            total_failed_products += 1
            logger.exception(
                "Midnight task failed for product %s (%s): %s",
                product.id, getattr(product, 'name', '?'), exc,
            )
            continue

    logger.info(
        "Midnight task complete. Sessions created: %d. Failed products: %d.",
        total_created, total_failed_products,
    )
    return total_created, total_failed_products


class Command(BaseCommand):
    help = 'Run function at midnight'

    def handle(self, *args, **kwargs):
        created, failed = my_midnight_function()
        self.stdout.write(
            f"Midnight task executed. Sessions created: {created}. "
            f"Failed products: {failed}."
        )