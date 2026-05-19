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
from dateutil.relativedelta import relativedelta

from Main.models.models_sessions import Schedule, Product, Session


logger = logging.getLogger(__name__)


def my_midnight_function():
    products = Product.objects.all()
    total_created = 0
    total_failed_products = 0

    for product in products:
        try:
            latest_session = (
                Session.objects
                .filter(product_id=product.id)
                .order_by('-end_time')
                .first()
            )
            if not latest_session:
                logger.info(
                    "Skipping product %s (%s): no existing session to extend from",
                    product.id, getattr(product, 'name', '?'),
                )
                continue

            start_date = latest_session.end_time.date() + timedelta(days=1)
            end_date = (timezone.now() + relativedelta(years=1)).date()

            product_created = 0
            while start_date <= end_date:
                weekday = start_date.strftime('%A')

                # filter().first() — never crash on a missing weekday schedule
                selected_schedule = Schedule.objects.filter(
                    product__id=product.id,
                    weekday=weekday,
                ).first()

                if not selected_schedule or not selected_schedule.start_time or not selected_schedule.end_time:
                    # No schedule for this weekday — skip this day for this product
                    start_date += timedelta(days=1)
                    continue

                start_dt = timezone.make_aware(
                    datetime.combine(start_date, selected_schedule.start_time)
                )
                end_dt = timezone.make_aware(
                    datetime.combine(start_date, selected_schedule.end_time)
                )

                while start_dt <= end_dt:
                    session_end = start_dt + product.duration

                    # weekday belongs INSIDE defaults — it should not be a
                    # lookup field. get_or_create already saves the row, so
                    # there is no redundant save() call afterward.
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
            # Never let one bad product abort the whole midnight job
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