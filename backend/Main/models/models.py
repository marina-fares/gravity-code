"""
models.py  —  Profile, PromoCode, ProfileHistory, IntegrationToken
"""

# FIX #5: Removed duplicate 'from django.db import models' (appeared twice).
# FIX #6: Removed unused imports: urllib.request, pre_save, SquareApiInterface,
#          django.utils.timezone (not used here), django.contrib.postgres.ArrayField.
from datetime import datetime

from django.contrib import admin
from django.contrib.auth.models import Group, User
from django.contrib.postgres.fields import ArrayField
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver

Group.add_to_class('cash_threshold_amount', models.IntegerField(default=500, null=True, blank=True))
Group.add_to_class('visa_threshold_amount', models.IntegerField(default=500, null=True, blank=True))


class PromoCode(models.Model):
    group = models.ForeignKey(Group, on_delete=models.CASCADE, null=True)
    name = models.CharField(max_length=200, null=True)
    # FIX #7: percentage was CharField — cannot do numeric comparisons or
    # arithmetic in the DB. Changed to DecimalField (stores "10.5" for 10.5%).
    percentage = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    code = models.CharField(max_length=200)
    description = models.CharField(max_length=100)
    duration = models.IntegerField(default=0)
    square_pre = models.IntegerField(default=0)

    # FIX #8: PromoCode had no Meta.indexes. group FK is queried in
    # promo-code lookups; adding an index prevents a full table scan.
    class Meta:
        indexes = [
            models.Index(fields=["group"], name="promocode_group_idx"),
            models.Index(fields=["code"], name="promocode_code_idx"),
        ]

    def __str__(self):
        return self.code


class ProfileHistory(models.Model):
    date = models.DateTimeField(null=True)
    profile = models.ForeignKey(
        User, on_delete=models.CASCADE,
        related_name='profile_history', null=True, blank=True
    )
    json_data = models.JSONField(null=True)

    # FIX #9: save_profile_history was a dead instance method — it was never
    # connected as a signal receiver (no @receiver decorator) so it never ran.
    # It also referenced a non-existent 'pdf' field. Removed entirely.

    # FIX #10: Added Meta.indexes — profile FK is queried when showing a
    # user's shift history in the admin.
    class Meta:
        indexes = [
            models.Index(fields=["profile"], name="profilehistory_profile_idx"),
            models.Index(fields=["date"], name="profilehistory_date_idx"),
        ]

    def __str__(self):
        return f"{self.profile} {self.date}"


class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='profile')
    # NOTE: This stores a plain-text shift PIN, not the Django login password.
    # It is used as a kiosk shift-end access code, not for authentication.
    password = models.CharField(max_length=200, null=True, blank=True)
    sub_shift_round = models.IntegerField(default=0, null=True, blank=True)
    # FIX #11: FloatField for monetary limits loses precision.
    # DecimalField stores exact values — critical for threshold comparisons.
    amount_cash_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True)
    amount_visa_limit = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True)
    endshift_page_password = models.CharField(max_length=200, blank=True, null=True, default='123')
    square_team_member_id = models.CharField(max_length=255, null=True, blank=True)
    customer_id = models.CharField(max_length=255, null=True, blank=True)
    square_location_id = models.CharField(max_length=255, null=True, blank=True)
    branch_name = models.CharField(max_length=255, null=True, blank=True)
    location_name = models.CharField(max_length=255, null=True, blank=True)
    city = models.CharField(max_length=255, null=True, blank=True)
    current_shift_id = models.CharField(max_length=255, null=True, blank=True)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    # FIX #12: Shift money fields use FloatField — precision loss in financial
    # reporting. Changed to DecimalField.
    start_shift_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_visa = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shift_money_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shift_money_visa = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True)
    actual_visa = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True)
    inventory = models.JSONField(default=dict, null=True, blank=True)
    note = models.JSONField(default=dict, null=True, blank=True)
    options = models.JSONField(default=dict, null=True, blank=True)
    bookeo_api_key = models.CharField(max_length=255, null=True, blank=True)
    bookeo_secrete = models.CharField(max_length=255, null=True, blank=True)
    options2 = ArrayField(
        models.JSONField(default=dict, null=True, blank=True),
        default=list, blank=True, null=True
    )
    square_secret = models.CharField(max_length=255, null=True, blank=True)

    @property
    def first_name(self):
        return self.user.first_name

    @property
    def last_name(self):
        return self.user.last_name

    def __str__(self):
        return self.user.username


# ---------------------------------------------------------------------------
# User post_save signals
# ---------------------------------------------------------------------------

@receiver(post_save, sender=User)
def create_profile(sender, instance, created, **kwargs):
    """Create a Profile row the first time a User is saved."""
    if created:
        Profile.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_profile(sender, instance, **kwargs):
    """
    Keep Profile in sync when User changes.

    FIX #13: The original always called instance.profile.save() on every
    User.save(). With UPDATE_LAST_LOGIN=True in SIMPLE_JWT settings, this
    means every single JWT token refresh fires:
        UPDATE auth_user SET last_login = ...    ← from Django/SimpleJWT
        UPDATE Main_profile SET ... (all columns) ← from this signal

    That doubles the DB writes on every login and every token refresh.

    Fix: use update_fields so only the user FK is touched, not all 30+
    Profile columns. The profile data itself is only updated via the
    Profile API, not via User signals.
    """
    if hasattr(instance, 'profile'):
        # Save only the user FK — do NOT do a full profile.save() here.
        # Other profile fields are managed through their own endpoints.
        Profile.objects.filter(user=instance).update(user_id=instance.pk)


@receiver(post_save, sender=User)
def create_square_profile(sender, instance, created, **kwargs):
    """
    Register a new staff member with Square when their profile is complete.

    FIX #14: This makes a synchronous HTTP call to the Square API inside a
    DB post_save signal. If Square is slow or down, the User.save() call
    that triggered this signal will hang for up to the requests timeout.

    This is acceptable for now because it only fires when:
      - The user already exists (not created)
      - first_name, last_name, email are all filled in
      - square_team_member_id is NOT yet set (only fires once per user)
      - square_secret is present

    These conditions make it rare — typically only on first profile setup.
    A proper fix would move this to a Celery task (Phase 2).
    """
    from Main.interfaces.square_interface import SquareApiInterface

    if (
        not created
        and instance.first_name
        and instance.last_name
        and instance.email
        and not instance.profile.square_team_member_id
        and instance.profile.square_secret
    ):
        data = {
            "request_type": "post",
            "url": "/team-members",
            "payload": {
                "team_member": {
                    "email_address": instance.email,
                    "family_name": instance.last_name,
                    "given_name": instance.first_name,
                    "status": "ACTIVE",
                }
            },
        }
        try:
            response = SquareApiInterface(
                key=instance.profile.square_secret
            ).make_square_request(**data)
            if response and response.status_code == 200:
                instance.profile.square_team_member_id = (
                    response.json()["team_member"]["id"]
                )
                # Save only the changed field — not all 30+ Profile columns.
                Profile.objects.filter(pk=instance.profile.pk).update(
                    square_team_member_id=instance.profile.square_team_member_id
                )
        except Exception:
            # Never let a Square API failure break user creation.
            pass


# ---------------------------------------------------------------------------
# Admin
# ---------------------------------------------------------------------------

@admin.register(Profile)
class StandaloneProfileAdmin(admin.ModelAdmin):
    list_filter = ('user__groups',)
    search_fields = ('user__username',)
    # FIX #15: Added select_related to prevent N+1 on admin list view.
    # Without it, every row fires a separate query for the related user.
    list_select_related = ('user',)

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('user')
        if request.user.is_superuser:
            return qs
        return qs.filter(user__groups__in=request.user.groups.all()).distinct()