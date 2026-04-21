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

Group.add_to_class('cash_threshold_amount',  models.IntegerField(default=500, null = True, blank= True))
Group.add_to_class('visa_threshold_amount',  models.IntegerField(default=500, null = True, blank= True))

class PromoCode(models.Model):
    """
    This class is used to create a model for the promo codes.
    """
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=200, unique=False, null=True)
    percentage = models.CharField(max_length=200, unique=False, null=True)    
    code = models.CharField(max_length=200, unique=False)
    description = models.CharField(max_length=100)
    duration = models.IntegerField(default=0)
    square_pre = models.IntegerField(default=0)

    def __str__(self):
        return self.code


class ProfileHistory(models.Model):
    """
    This class is used to create a model for the promo codes.
    """
    date = models.DateTimeField( null=True)
    profile = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='profile_history', unique=False,  null=True, blank=True)
    json_data = models.JSONField(null=True)
    
    def save_profile_history(sender, instance, **kwargs):
        '''
        while saving any change in the Profile model
        '''
        current_user = User.objects.get(
            username=instance)
        history = ProfileHistory.objects.create(
            date=datetime.now(), profile=current_user, pdf='/home/marina/receipt.pdf')
        history.save()

    def __str__(self):
        return str(self.profile) + ' ' + str(self.date)


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    password = models.CharField(max_length=200, unique=False, null=True)
    sub_shift_round = models.IntegerField(default=0, null=True, blank=True, unique=False)
    amount_cash_limit = models.FloatField(default=0, null=True)
    amount_visa_limit = models.FloatField(default=0, null=True)
    endshift_page_password = models.CharField(max_length=200, unique=False, blank=True, null=True, default = '123')
    square_team_member_id = models.CharField(
        max_length=255, null=True, blank=True)
    customer_id = models.CharField(max_length=255, null=True, blank=True)
    square_location_id = models.CharField(
        max_length=255, null=True, blank=True)
    branch_name = models.CharField(max_length=255, null=True, blank=True)
    location_name = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
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
    options = models.JSONField(default=dict, null=True, blank=True)
    bookeo_api_key = models.CharField(max_length=255, null=True, blank=True)
    bookeo_secrete = models.CharField(max_length=255, null=True, blank=True)

    options2 = ArrayField(models.JSONField(default=dict, null=True, blank=True), default=list,blank=True, null=True)
    square_secret = models.CharField(max_length=255, null=True, blank=True)


    @property
    def first_name(self):
        return self.user.first_name

    @property
    def last_name(self):
        return self.user.last_name

    def __str__(self):
        return self.user.username


@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):

    
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_profile(sender, instance, **kwargs):
    instance.profile.save()


@receiver(post_save, sender=User)
def create_square_profile(sender, instance, created, **kwargs):
    from Main.apis.square_api import SquareAPI

    if not created and instance.first_name and instance.last_name and instance.email and not instance.profile.square_team_member_id and instance.profile.square_secret:
        data = {
            "request_type": "post",
            "url": "/team-members",
            "payload": {
                "team_member": {
                    "email_address": instance.email,
                    "family_name":  instance.last_name,
                    "given_name":  instance.first_name,
                    "status": "ACTIVE"
                }
            }
        }

        response = SquareApiInterface(
            key=instance.profile.square_secret).make_square_request(**data)
        if response.status_code == 200:
            instance.profile.square_team_member_id = response.json()[
                'team_member']['id']
            instance.profile.save()

@admin.register(Profile)
class StandaloneProfileAdmin(admin.ModelAdmin):
    list_filter = ('user__groups',)
    search_fields = ('user__username',)
    def get_queryset(self, request):
        qs = super().get_queryset(request)
        if request.user.is_superuser:
            return qs
        return qs.filter(user__groups__in=request.user.groups.all()).distinct()


#admin.site.register(PromoCode)
# admin.site.register(Profile)
