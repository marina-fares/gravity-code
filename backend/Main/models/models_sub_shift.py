"""
models_sub_shift.py  —  SubShift and SubShiftHistory
"""

# FIX #16: Removed all unused imports:
#   urllib.request, pre_save, admin, SquareApiInterface, timezone, ArrayField
# FIX #17: Removed duplicate 'from django.db import models'
from datetime import datetime

from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import post_save
from django.dispatch import receiver


class SubShiftHistory(models.Model):
    """
    Records a snapshot of a sub-shift when it ends.
    """
    date = models.DateTimeField(null=True)
    cash_amount = models.IntegerField(null=True, blank=True)
    visa_amount = models.IntegerField(null=True, blank=True)
    sub_shift_round = models.IntegerField(default=0, null=True, blank=True)
    sub_shift = models.ForeignKey(
        User, on_delete=models.CASCADE, null=True, blank=True
    )
    json_data = models.JSONField(null=True)

    # FIX #18: save_sub_shift_history was a dead instance method — it referenced
    # a non-existent 'pdf' field and was never connected as a signal receiver.
    # Removed entirely to avoid confusion.

    # FIX #19: Added Meta.indexes — sub_shift FK and date are the two fields
    # queried when loading a user's history in the shift-end view.
    class Meta:
        indexes = [
            models.Index(fields=["sub_shift"], name="subshifthistory_user_idx"),
            models.Index(fields=["date"], name="subshifthistory_date_idx"),
        ]

    def __str__(self):
        return f"{self.sub_shift} {self.date} -- {self.sub_shift_round}"


class SubShift(models.Model):
    """
    Tracks the current active sub-shift state for a staff member.
    OneToOne with User — one row per user, updated in place.
    """
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    current_shift_id = models.CharField(max_length=255, null=True, blank=True)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    # FIX #20: All monetary fields changed from FloatField to DecimalField.
    # FloatField cannot represent amounts like 99.90 exactly in IEEE 754.
    # Shift reporting that sums these values accumulates rounding errors.
    start_shift_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    refund_visa = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shift_money_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    shift_money_visa = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    actual_cash = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True)
    actual_visa = models.DecimalField(max_digits=10, decimal_places=2, default=0, null=True)
    inventory = models.JSONField(default=dict, null=True, blank=True)
    note = models.JSONField(default=dict, null=True, blank=True)

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
    """Create a SubShift row the first time a User is saved."""
    if created:
        SubShift.objects.create(user=instance)


@receiver(post_save, sender=User)
def save_sub_shift(sender, instance, **kwargs):
    """
    Keep SubShift in sync when User changes.

    FIX #21: Uses hasattr() guard — safe, already fixed in the repo.
    Same optimisation as save_profile: use filter().update() with only
    the user FK rather than a full subshift.save() to avoid writing all
    SubShift columns on every User.save() (including token refreshes).
    """
    if hasattr(instance, 'subshift'):
        SubShift.objects.filter(user=instance).update(user_id=instance.pk)