from urllib import request
from django.db import models
from django.contrib.auth.models import User, Group
from django.dispatch import receiver
from django.db.models.signals import post_save, pre_save
from django.contrib import admin
from Main.interfaces.square_interface import SquareApiInterface
from datetime import datetime
from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField

class SubShiftHistory(models.Model):
    """
    This class is used to create a model for the promo codes.
    """
    date = models.DateTimeField( null=True)
    cash_amount = models.IntegerField( null=True, blank=True, unique=False)
    visa_amount = models.IntegerField( null=True, blank=True, unique=False)
    sub_shift_round = models.IntegerField(default=0, null=True, blank=True, unique=False)
    sub_shift = models.ForeignKey(
        User, on_delete=models.CASCADE, unique=False,  null=True, blank=True)
    json_data = models.JSONField(null=True)
    
    def save_sub_shift_history(sender, instance, **kwargs):
        '''
        while saving any change in the Shift model
        '''
        current_user = User.objects.get(
            username=instance)
        history = SubShiftHistory.objects.create(
            date=datetime.now(), sub_shift=current_user, pdf='/home/marina/receipt.pdf')
        history.save()

    def __str__(self):
        return str(self.sub_shift) + ' ' + str(self.date)  + '--' + str(self.sub_shift_round)


class SubShift(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    current_shift_id = models.CharField(max_length=255, null=True, blank=True)
    
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    start_shift_cash = models.FloatField(default=0)
    refund_cash = models.FloatField(default=0)
    refund_visa = models.FloatField(default=0)
    shift_money_cash = models.FloatField(default=0)
    shift_money_visa = models.FloatField(default=0)
    actual_cash = models.FloatField(default=0, null=True)
    actual_visa = models.FloatField(default=0, null=True)
    inventory = models.JSONField(default=dict, null=True, blank=True)
    note = models.JSONField(default=dict, null=True, blank=True)
    #options2 = ArrayField(models.JSONField(default=dict, null=True, blank=True), default=list, null=True)
    
    @property
    def first_name(self):
        return self.user.first_name

    @property
    def last_name(self):
        return self.user.last_name

    def __str__(self):
        return self.user.username


@receiver(post_save, sender=User)
def create_sub_shift(sender, instance, created, **kwargs):
    if created:
        SubShift.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_sub_shift(sender, instance, **kwargs):
    if(SubShift.objects.filter(user = instance)):
        instance.subshift.save()
    else:
        SubShift.objects.create(user=instance)



#admin.site.register(PromoCode)
#admin.site.register(SubShift)
#admin.site.register(SubShiftHistory)
