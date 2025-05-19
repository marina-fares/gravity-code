from ..models.models_sessions import Session, Product, Booking
from datetime import datetime, date, time, timedelta
from django.utils import timezone

def check_sessions():
    product = "Park"
    start_date = date.today()
    end_date = start_date.replace(year=start_date.year + 1)
    default_start_time = datetime.strptime("09:00", "%H:%M").time()
    start_time = datetime.strptime("09:00", "%H:%M").time()
    default_end_time = datetime.strptime("09:00", "%H:%M").time()
    end_time = datetime.strptime("09:00", "%H:%M").time()
    old_sessions = Session.objects.filter(product=product, start_time=datetime.combine(start_date, start_time))


def delete_session(product, start_time, day):
    Session.objects.filter(product=product, start_time__hour=start_time.hour, weekday=day).delete()

def create_session(product, start_date, end_date, start_time, weekdays):
    sessions = []
    print("------------------21")
    print(start_date)
    print(end_date)
    combined = datetime.combine(datetime.today(), start_time)
    end_time = (combined + product.duration).time()

    
    current_date = start_date
    while current_date <= end_date:
        print("-----------------30")
        print(current_date)
        start_session_dt = timezone.make_aware(datetime.combine(current_date,start_time))
        end_session_dt = timezone.make_aware(datetime.combine(current_date, end_time))

        if str(start_session_dt.strftime('%A')) in weekdays:
            # Check if this session already exists
            new_session, created = Session.objects.get_or_create(
                product=product,
                start_time=start_session_dt,
                end_time=end_session_dt,
                defaults={'available_seats': product.max_num},
                weekday = str(start_session_dt.strftime('%A'))
            )
            

            sessions.append(new_session)
        current_date += timedelta(days=1)
    for session in sessions:
        session.save()


    return sessions


















