from urllib import request
from django.db import models
from django.contrib.auth.models import User, Group
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_save
from django.contrib import admin
from Main.interfaces.square_interface import SquareApiInterface
from datetime import datetime, timedelta
from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.contrib.postgres.fields import ArrayField


class Product(models.Model):
    """
    This class is used to create a model for the promo codes.
    """
    name = models.CharField(max_length=30, unique=False)
    nick_name = models.CharField("Nick Name", max_length=30, unique=False, blank=True, null=True)
    duration = models.DurationField(default=timedelta(hours=0, minutes=0, seconds=0))
    min_num = models.IntegerField(default=0, null=True, blank=True, unique=False)
    max_num = models.IntegerField(default=0, null=True, blank=True, unique=False)
    price = models.FloatField()
    group = models.ForeignKey(Group, on_delete=models.CASCADE)

    
    def clean(self):
        """Ensure duration is in whole hours only (00 minutes, 00 seconds)."""
        total_seconds = self.duration.total_seconds()
        input_max_num = self.max_num
        
        if total_seconds % 3600 != 0:
            raise ValidationError("Duration must be in whole hours (e.g., 1:00:00, 2:00:00).")
        
        if input_max_num <= 0:
            raise ValidationError("The Max number should be more than 0, as this is the session capacity")



    
    def __str__(self):
        return str(self.name) 

  
class Session(models.Model):
    """
    This class is used to create a model for the promo codes.
    """
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, unique=False)
    start_time = models.DateTimeField(null=True, blank=True, unique=False)
    end_time = models.DateTimeField(null=True, blank=True, unique=False)
    available_seats = models.IntegerField(null=True, blank=True, unique=False)
    block_seats = models.IntegerField(null=True, blank=True, unique=False, default=0)
    weekday = models.CharField(max_length=10, null=True, blank=True) 
    added_seats = models.IntegerField(default=0, null=True, blank=True, unique=False) 

    def delete(self, *args, **kwargs):
        # Check if any ModelB instances are referencing this object
        if Booking.objects.filter(session=self).exists():
            raise ValidationError("Cannot delete this object because it is referenced by ModelB.")

    def __str__(self):
        return str(self.product.name) + ' - ' + str(self.start_time) 
    


class Schedule(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, null=True, blank=True, unique=False)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    weekday = models.CharField(max_length=20,null=True, blank=True)
    except_hours = ArrayField(
        models.CharField(max_length=2),  # '11', '12', etc.
        blank=True,
        default=list
    )
    

class Booking(models.Model):
    """
    This class is used to create a model for the promo codes.
    """
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("done", "Done"),
        ("refunded", "Refunded"),
        ("hold", "Hold")
    ]

    session = models.ForeignKey(Session, on_delete=models.PROTECT, null=True, blank=True)
    booking_customer = models.ForeignKey('Customer', on_delete=models.CASCADE, null=True, blank=True, max_length=100)
    options = models.JSONField(default=list, blank=True, null=True)
    payment = models.JSONField(default=dict, blank=True, null=True)
    number_of_players = models.IntegerField(null=True, default=True)
    type_of_players = models.CharField(null=True, blank=True, max_length=20)
    creation_agent = models.CharField(null = True, blank=True, max_length=100)
    created_at = models.DateTimeField(null=True, blank=True, default=timezone.now)
    square_receipt_number = models.CharField(null = True, blank=True, max_length=20)
    square_order_id = models.CharField(null = True, blank=True, max_length= 100)
    square_payment_id = models.CharField(null = True, blank=True, max_length= 100)
    zoho_sales_receipt_id = models.CharField(null = True, blank=True, max_length= 100)
    zoho_sales_receipt_num = models.CharField(null = True, blank=True, max_length= 50)
    note = models.CharField(null = True, blank=True, max_length=100)
    status = models.CharField(null = True, blank=True, choices=STATUS_CHOICES, max_length=100)

    def save(self, commit=True, *args, **kwargs):
        if self.pk:  # Only for existing instances (not new ones)
            old_instance = self.__class__.objects.get(pk=self.pk)
            # update the number of players in the session
            current_session = Session.objects.get(id=old_instance.session.id)
            product = Product.objects.get(id=current_session.product.id)
            all_bookings_num = sum(
                Booking.objects.filter(session_id=current_session.id).exclude(status='refunded').values_list('number_of_players', flat=True)
            )
            new_sessions_seats = current_session.added_seats + current_session.product.max_num - all_bookings_num - current_session.block_seats 
            current_session.available_seats = new_sessions_seats
            current_session.save()

            

        else:
            session_new = self.session 
            session_new.available_seats -= self.number_of_players
            session_new.save()


        super().save(*args, **kwargs)

        


    def __str__(self):
        return str(self.id) + ' - ' + str(self.session) + ' - ' + str(self.number_of_players) 


class Customer(models.Model):
    identifier = models.CharField(max_length=30, unique=False)
    group = models.ForeignKey(Group, on_delete=models.CASCADE, blank=True, null=True)
    # all_bookings = models.Many(Booking, blank=True, null=True)

    def __str__(self):
        return self.identifier

    




