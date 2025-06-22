from django.core.management.base import BaseCommand
from Main.models.models_sessions import Schedule, Product, Session
from dateutil.relativedelta import relativedelta
from datetime import datetime, timedelta
from django.utils import timezone


def my_midnight_function():
    products = Product.objects.all()
    for product in products:
            latest_session = Session.objects.filter(product_id=product.id).order_by('-end_time').first()
            if latest_session:
                start_date = latest_session.end_time.date()  + timedelta(days=1)
                end_date = (timezone.now() + relativedelta(years=1)).date()
                # loop for all days to create the sessions in it
                while start_date <= end_date:
                    # here i should get the schedule of the day from the schedule table and create the sessions to this day based on the schedule 
                    weekday = start_date.strftime('%A')
                    selected_schedule = Schedule.objects.get(product__id=product.id,weekday=weekday)
                    start_time = selected_schedule.start_time
                    end_time = selected_schedule.end_time
                    start_dt = timezone.make_aware(datetime.combine(start_date, start_time))
                    end_dt = timezone.make_aware(datetime.combine(start_date, end_time))
                    while start_dt <= end_dt:
                        session_end = start_dt + product.duration
                        new_session, created = Session.objects.get_or_create(
                            product=product,
                            start_time=start_dt,
                            end_time=session_end,
                            defaults={'available_seats': product.max_num},
                            weekday = str(start_dt.strftime('%A'))
                        )
                        new_session.save()
                        start_dt = session_end
                    start_date +=timedelta(days=1)


class Command(BaseCommand):
    help = 'Run function at midnight'

    def handle(self, *args, **kwargs):
        my_midnight_function()
        self.stdout.write("Midnight task executed")
