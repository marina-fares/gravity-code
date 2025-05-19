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
    duration = models.DurationField(default=timedelta(hours=0, minutes=0, seconds=0))
    min_num = models.IntegerField(default=0, null=True, blank=True, unique=False)
    max_num = models.IntegerField(default=0, null=True, blank=True, unique=False)
    price = models.FloatField()
    group = models.ForeignKey(Group, on_delete=models.CASCADE)
    
    def clean(self):
        """Ensure duration is in whole hours only (00 minutes, 00 seconds)."""
        total_seconds = self.duration.total_seconds()
        if total_seconds % 3600 != 0:
            raise ValidationError("Duration must be in whole hours (e.g., 1:00:00, 2:00:00).")

    
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
    weekday = models.CharField(max_length=10, null=True, blank=True) 

    def delete(self, *args, **kwargs):
        # Check if any ModelB instances are referencing this object
        print("--------------------------49")
        if Booking.objects.filter(session=self).exists():
            print("----------------yes")
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
    ]

    session = models.ForeignKey(Session, on_delete=models.PROTECT, null=True, blank=True)
    customer = models.CharField(null=True, blank=True, max_length=100)
    options = ArrayField(
        models.CharField(max_length=100),  # Define the type of each element
        blank=True, 
        default=list  # Default value as an empty list
    )
    payment = models.JSONField(default=dict)
    number_of_players = models.IntegerField(null=True, default=True)
    type_of_players = models.CharField(null=True, blank=True, max_length=20)
    creation_agent = models.CharField(null = True, blank=True, max_length=100)
    square_receipt_number = models.CharField(null = True, blank=True, max_length=20)
    square_order_id = models.CharField(null = True, blank=True, max_length= 20)
    zoho_sales_receipt_id = models.CharField(null = True, blank=True, max_length= 20)
    zoho_sales_receipt_num = models.CharField(null = True, blank=True, max_length= 20)
    note = models.CharField(null = True, blank=True, max_length=100)
    status = models.CharField(null = True, blank=True, choices=STATUS_CHOICES, max_length=100)

    def save(self, commit=True, *args, **kwargs):
        if self.pk:  # Only for existing instances (not new ones)
            old_instance = self.__class__.objects.get(pk=self.pk)
            booking_session = Session.objects.get(id=old_instance.session.id)
            print("---------------------------------94",self._meta.fields)
            old_value = old_instance.number_of_players
            new_value = self.number_of_players
            print(old_value, new_value, "-----------values------")
            if old_value != new_value:
                booking_session.available_seats = booking_session.available_seats + old_value - new_value
                booking_session.save()

        else:
            session_new = self.session 
            session_new.available_seats -= self.number_of_players
            session_new.save()


        super().save(*args, **kwargs)

        


    def __str__(self):
        return str(self.id) + ' - ' + str(self.session)
    


    




