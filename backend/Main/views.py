from django.contrib.auth.forms import SetPasswordForm
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.core.exceptions import PermissionDenied
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.urls import reverse
from django.contrib.auth import get_user_model

User = get_user_model()


@staff_member_required
def admin_change_user_password(request, user_id):
    """
    Allow staff to change a user's password.

    SECURITY FIX: The original had @staff_member_required only, meaning any
    staff user could change ANY other user's password — including superusers
    or users from a different branch/group.

    Added group-scope check: non-superusers can only change passwords for
    users who share at least one group with them.
    """
    target_user = get_object_or_404(User, id=user_id)

    # Superusers can change anyone's password
    if not request.user.is_superuser:
        # Staff can only change passwords for users in their own group(s)
        requester_groups = set(request.user.groups.values_list('id', flat=True))
        target_groups = set(target_user.groups.values_list('id', flat=True))
        if not requester_groups.intersection(target_groups):
            raise PermissionDenied(
                "You do not have permission to change the password of a user "
                "outside your group."
            )
        # Staff cannot escalate to changing a superuser's password
        if target_user.is_superuser:
            raise PermissionDenied(
                "You do not have permission to change a superuser's password."
            )

    if request.method == 'POST':
        form = SetPasswordForm(target_user, request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, f"Password updated successfully for {target_user.username}")
            return redirect(reverse('admin:Main_gravityuser_change', args=[target_user.id]))
    else:
        form = SetPasswordForm(target_user)

    return render(request, 'admin/change_user_password.html', {
        'form': form,
        'user': target_user,
    })