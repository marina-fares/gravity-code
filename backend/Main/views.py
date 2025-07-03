
# admin_views.py
from django.contrib.auth.forms import SetPasswordForm
from django.contrib.admin.views.decorators import staff_member_required
from django.contrib.auth.models import User
from django.shortcuts import render, get_object_or_404, redirect
from django.contrib import messages
from django.urls import reverse
from django.contrib.auth import get_user_model


User = get_user_model()

@staff_member_required
def admin_change_user_password(request, user_id):
    user = get_object_or_404(User, id=user_id)
    if request.method == 'POST':
        form = SetPasswordForm(user, request.POST)
        if form.is_valid():
            form.save()
            messages.success(request, f"Password updated successfully for {user.username}")
            return redirect(reverse('admin:Main_gravityuser_change', args=[user.id]))
    else:
        form = SetPasswordForm(user)

    return render(request, 'admin/change_user_password.html', {'form': form, 'user': user})

