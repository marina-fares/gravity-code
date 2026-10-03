from django.contrib import admin
from ..models.models_sessions import Session, Product, Booking, Schedule
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin
from django import forms

import datetime as datetime
import zoneinfo
from django.core.exceptions import ValidationError
from django.contrib.admin import SimpleListFilter
from django.utils.translation import gettext_lazy as _
import os
from rangefilter.filters import DateRangeFilter
from django.contrib.admin.filters import DateFieldListFilter
from django.http import HttpResponse ,HttpRequest
from django.urls import path, reverse

_CAIRO_TZ = zoneinfo.ZoneInfo("Africa/Cairo")
from django.shortcuts import redirect, render
from django.contrib import messages
from django.utils import timezone

from Main.admin.create_new_sessions import create_session, delete_session
from Main.management.commands.repair_sessions import repair_sessions_for_range

class ProductNameFilter(SimpleListFilter):
    title = 'Product'  # The label shown in the filter
    parameter_name = 'product'

    def lookups(self, request, model_admin):
        """Returns list of (value, label) tuples for the dropdown"""
        return [(p.id, p.name) for p in Product.objects.all()]

    def queryset(self, request, queryset):
        """Filters the queryset based on the selected value"""
        if self.value():
            return queryset.filter(product__id=self.value())


class ChangeSessionAdminForm(forms.ModelForm):

    class Meta:
        model = Session
        fields = '__all__'

class DefaultSessionAdminForm(forms.ModelForm):
    WEEKDAYS = [
    ('5', 'Saturday'),
    ('6', 'Sunday'),
    ('0', 'Monday'),
    ('1', 'Tuesday'),
    ('2', 'Wednesday'),
    ('3', 'Thursday'),
    ('4', 'Friday'),
    ]

    product = forms.ModelChoiceField(queryset=Product.objects.all(), required=True)
    start_date = datetime.date.today()
    end_date = datetime.date.today()
    start_time_input = forms.TimeField(required=True, widget=forms.TimeInput(format='%H:%M', attrs={'type': 'time'}), label="Start Hour", initial=datetime.time(9, 0))
    end_time_input = forms.TimeField(required=True, widget=forms.TimeInput(format='%H:%M', attrs={'type': 'time'}), label="End Hour", initial=datetime.time(9, 0))
    weekdays = forms.MultipleChoiceField(
        choices=WEEKDAYS,
        widget=forms.CheckboxSelectMultiple,
        required=False,
        initial=['0','1', '2', '3', '4', '5', '6']  # Default all weekdays selected
    )
    except_hours_flag = forms.BooleanField(
        required=False,
        label="Add Except Hours",
        initial=False
    )

    except_hours = forms.MultipleChoiceField(
        required=False,
        choices=[],
        widget=forms.CheckboxSelectMultiple  # or any suitable widget
    )

    class Meta:
        model = Session
        fields = ["product", "start_time_input", "end_time_input", "weekdays", "except_hours_flag", "except_hours"]

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.is_bound:
            data = self.data
            except_hours_flag = data.get("except_hours_flag")
            start_time_str = data.get("start_time_input")
            end_time_str = data.get("end_time_input")
            product_input = data.get("product")
            product = Product.objects.get(id=product_input) if product_input else None
            print("this is the init phase", except_hours_flag, start_time_str, end_time_str, product)
            if except_hours_flag and start_time_str and end_time_str:
                try:
                    start_hour = datetime.datetime.strptime(start_time_str, "%H:%M").time()
                    end_hour = datetime.datetime.strptime(end_time_str, "%H:%M").time()

                    today = datetime.date.today()
                    start_datetime = datetime.datetime.combine(today, start_hour)
                    end_datetime = datetime.datetime.combine(today, end_hour)

                    # Handle overnight range (e.g., 23:00 → 02:00)
                    if end_datetime <= start_datetime:
                        end_datetime += datetime.timedelta(days=1)

                    hour_choices = []
                    current_datetime = start_datetime

                    while current_datetime <= end_datetime:
                        current_time = current_datetime.time()

                        hour_choices.append(
                            (str(current_time), f"{current_time.hour}:{current_time.minute:02d}")
                        )

                        current_datetime += product.duration  # must be timedelta

                    self.fields['except_hours'].choices = hour_choices

                except Exception:
                    pass  # Safe fail, clean() will handle it later



    def clean(self):
        cleaned_data = super().clean()  # Call the parent class's clean method to get cleaned data
        start_time = cleaned_data.get("start_time_input")
        end_time = cleaned_data.get("end_time_input")
        except_hours_flag = cleaned_data.get("except_hours_flag")
        except_hours = cleaned_data.get("except_hours")
        product = cleaned_data.get("product")
        # product = Product.objects.get(id=product_input) if product_input else None
        print("this is the clean phase", start_time, end_time, except_hours_flag, except_hours, product)
        # Ensure minutes and seconds are zero for start time
        if start_time and (start_time.minute != 0 or start_time.second != 0):
            raise ValidationError("Start time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        # Ensure minutes and seconds are zero for end time
        if end_time and (end_time.minute != 0 or end_time.second != 0):
            raise ValidationError("End time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        if not product:
            raise ValidationError("Product is required.")

        if except_hours_flag and start_time and end_time:
            hour_choices = []

            today = datetime.date.today()
            start_datetime = datetime.datetime.combine(today, start_time)
            end_datetime = datetime.datetime.combine(today, end_time)

            # Handle overnight case (e.g., 23:00 → 02:00)
            if end_datetime <= start_datetime:
                end_datetime += datetime.timedelta(days=1)

            current_datetime = start_datetime

            while current_datetime <= end_datetime:
                current_time = current_datetime.time()

                hour_choices.append(
                    (str(current_time), f"{current_time.hour}:{current_time.minute:02d}")
                )

                current_datetime += product.duration  # must be timedelta

            self.fields['except_hours'].choices = hour_choices


            if not except_hours:
                raise forms.ValidationError("Kindly select at least one except hour.")

        return cleaned_data


    def save(self, commit=True, *args, **kwargs):
        session_save = super().save(commit=False)
        WEEKDAYS = [
            ('5', 'Saturday'),
            ('6', 'Sunday'),
            ('0', 'Monday'),
            ('1', 'Tuesday'),
            ('2', 'Wednesday'),
            ('3', 'Thursday'),
            ('4', 'Friday'),
        ]

        product = self.cleaned_data.get("product")
        start_time_input = self.cleaned_data.get("start_time_input")
        end_time_input = self.cleaned_data.get("end_time_input")
        start_date = datetime.date.today()
        end_date = start_date.replace(year=start_date.year + 1)
        except_hour_flag = self.cleaned_data.get("except_hours_flag")
        except_hours_input = self.cleaned_data.get("except_hours") or []

        weekdays = self.cleaned_data.get("weekdays")
        default_start_time = None
        default_end_time = None
        days_label = []
        created_sessions = None

        for day in weekdays:
            days_label.append(dict(WEEKDAYS).get(day))

        print("-----------------177")
        if except_hour_flag and not except_hours_input:
            return None  # don't do anything

        for day_input in days_label:
            try:
                obj = Schedule.objects.get(weekday=str(day_input), product=product)
                created = False
            except Schedule.DoesNotExist:
                obj = Schedule.objects.create(
                    start_time=start_time_input,
                    end_time=end_time_input,
                    weekday=str(day_input),
                    product=product,
                    except_hours=except_hours_input,
                )
                created = True

            # استخدم datetime بدل time
            today = datetime.date.today()
            current_datetime = datetime.datetime.combine(today, start_time_input)
            end_datetime = datetime.datetime.combine(today, end_time_input)

            if created:
                # Handle overnight case (e.g., 23:00 → 02:00)
                if end_datetime <= current_datetime:
                    end_datetime += datetime.timedelta(days=1)

                while current_datetime <= end_datetime:
                    current_time = current_datetime.time()

                    if str(current_time) not in except_hours_input:
                        create_session(
                            product,
                            start_date,
                            end_date,
                            current_time,
                            day_input,
                        )

                    current_datetime += product.duration  # must be timedelta

            else:
                default_start_datetime = datetime.datetime.combine(today, obj.start_time)
                default_end_datetime = datetime.datetime.combine(today, obj.end_time)

                default_time_list = []
                input_time_list = []

                # Build default_time_list
                current_default_dt = default_start_datetime
                while current_default_dt <= default_end_datetime:
                    default_time_list.append(current_default_dt.time())
                    current_default_dt += product.duration

                # Build input_time_list
                current_input_dt = datetime.datetime.combine(today, start_time_input)
                while current_input_dt <= end_datetime:
                    if str(current_input_dt.time()) not in except_hours_input:
                        input_time_list.append(current_input_dt.time())
                    current_input_dt += product.duration

                # Delete missing sessions
                for t in default_time_list:
                    if t not in input_time_list:
                        # delete_session signature is
                        # (product, start_date, end_date, start_time, day)
                        delete_session(product, start_date, end_date, t, day_input)

                # Create new sessions
                for t in input_time_list:
                    if t not in default_time_list:
                        created_sessions = create_session(
                            product, start_date, end_date, t, day_input
                        )

                # Update schedule
                Schedule.objects.filter(weekday=str(day_input), product=product).update(
                    start_time=start_time_input,
                    end_time=end_time_input,
                    except_hours=except_hours_input,
                )

        if created_sessions is not None:
            return created_sessions[0]
        else:
            return Session.objects.all()[0]




    def save_m2m(self):
        """ Override save_m2m to prevent admin errors """
        pass

class CustomSessionAdminForm(forms.ModelForm):
    WEEKDAYS = [
    ('5', 'Saturday'),
    ('6', 'Sunday'),
    ('0', 'Monday'),
    ('1', 'Tuesday'),
    ('2', 'Wednesday'),
    ('3', 'Thursday'),
    ('4', 'Friday'),
    ]

    product = forms.ModelChoiceField(queryset=Product.objects.all(), required=True)
    start_date = forms.DateField(required=True, widget=forms.SelectDateWidget,  initial=datetime.date.today)
    end_date = forms.DateField(required=True, widget=forms.SelectDateWidget, initial=datetime.date.today)
    start_time_input = forms.TimeField(required=True, widget=forms.TimeInput(format='%H:%M', attrs={'type': 'time'}), label="Start Hour", initial=datetime.time(9, 0))
    end_time_input = forms.TimeField(required=True, widget=forms.TimeInput(format='%H:%M', attrs={'type': 'time'}), label="End Hour", initial=datetime.time(9, 0))
    weekdays = forms.MultipleChoiceField(
        choices=WEEKDAYS,
        widget=forms.CheckboxSelectMultiple,
        required=False
    )
    except_hours_flag = forms.BooleanField(
        required=False,
        label="Add Except Hours",
        initial=False
    )

    except_hours = forms.MultipleChoiceField(
        required=False,
        choices=[],
        widget=forms.CheckboxSelectMultiple  # or any suitable widget
    )

    class Meta:
        model = Session
        fields = ["product", "start_date", "end_date", "start_time_input", "end_time_input", "weekdays", "except_hours_flag", "except_hours"]


    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        if self.is_bound:
            data = self.data
            except_hours_flag = data.get("except_hours_flag")
            start_time_str = data.get("start_time_input")
            end_time_str = data.get("end_time_input")
            product_input = data.get("product")
            product = Product.objects.get(id=product_input) if product_input else None
            print("this is the init phase", except_hours_flag, start_time_str, end_time_str, product)
            if except_hours_flag and start_time_str and end_time_str:
                try:
                    start_hour = datetime.datetime.strptime(start_time_str, "%H:%M").time()
                    end_hour = datetime.datetime.strptime(end_time_str, "%H:%M").time()

                    today = datetime.date.today()
                    start_datetime = datetime.datetime.combine(today, start_hour)
                    end_datetime = datetime.datetime.combine(today, end_hour)

                    hour_choices = []
                    current_datetime = start_datetime

                    while current_datetime <= end_datetime:
                        current_time = current_datetime.time()
                        print("current time in init", current_time, end_hour)
                        
                        hour_choices.append(
                            (str(current_time), f"{current_time.hour}:{current_time.minute:02d}")
                        )
                        
                        current_datetime += product.duration  # timedelta
                        
                    self.fields['except_hours'].choices = hour_choices
                except Exception:
                    pass  # Safe fail, clean() will handle it later




    def clean(self):
        cleaned_data = super().clean()  # Call the parent class's clean method to get cleaned data
        start_time = cleaned_data.get("start_time_input")
        end_time = cleaned_data.get("end_time_input")
        start_date = cleaned_data.get("start_date")
        end_date = cleaned_data.get("end_date")
        except_hours_flag = cleaned_data.get("except_hours_flag")
        except_hours = cleaned_data.get("except_hours")
        product = cleaned_data.get("product")
        print("this is the clean phase", start_time, end_time, except_hours_flag, except_hours, product)
        # Ensure minutes and seconds are zero for start time
        if start_time and (start_time.minute != 0 or start_time.second != 0):
            raise ValidationError("Start time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        # Ensure minutes and seconds are zero for end time
        if end_time and (end_time.minute != 0 or end_time.second != 0):
            raise ValidationError("End time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        if not product:
            raise ValidationError("Product is required.")
        #     raise ValidationError("The Start Date should be today or after today")
        
        if except_hours_flag and start_time and end_time:
            hour_choices = []
            today = datetime.date.today()
            start_datetime = datetime.datetime.combine(today, start_time)
            end_datetime = datetime.datetime.combine(today, end_time)

            # Handle overnight case (e.g., 23:00 → 02:00)
            if end_datetime <= start_datetime:
                end_datetime += datetime.timedelta(days=1)

            current_datetime = start_datetime

            while current_datetime <= end_datetime:
                current_time = current_datetime.time()
                
                hour_choices.append(
                    (str(current_time), f"{current_time.hour}:{current_time.minute:02d}")
                )
                
                current_datetime += product.duration  # must be timedelta

            self.fields['except_hours'].choices = hour_choices

            if not except_hours:
                raise forms.ValidationError("Kindly select at least one except hour.")

            if not except_hours:
                raise forms.ValidationError("Kindly select at least one except hour.")

        return cleaned_data


    def save(self, commit=True, *args, **kwargs):
        session_save = super().save(commit=False)
        WEEKDAYS = [
        ('5', 'Saturday'),
        ('6', 'Sunday'),
        ('0', 'Monday'),
        ('1', 'Tuesday'),
        ('2', 'Wednesday'),
        ('3', 'Thursday'),
        ('4', 'Friday'),
        ]
        product = self.cleaned_data.get("product")
        start_time_input = self.cleaned_data.get("start_time_input")
        end_time_input = self.cleaned_data.get("end_time_input")
        start_date = self.cleaned_data.get("start_date")
        end_date = self.cleaned_data.get("end_date")
        except_hour_flag = self.cleaned_data.get("except_hours_flag")
        except_hours_input = self.cleaned_data.get("except_hours")


        weekdays = self.cleaned_data.get("weekdays")
        default_start_time = None
        default_end_time = None
        days_label = []
        created_sessions = None

        for day in weekdays:
            days_label.append(dict(WEEKDAYS).get(day))

        if except_hour_flag and not except_hours_input:
            return None  # don't save anything
        

        # replace the except hour str with time


        for day_input in days_label:
            try:
                obj = Schedule.objects.get(weekday=str(day_input), product=product)
                created = False
            except Schedule.DoesNotExist:
                # Second: If not found, create it
                raise ValueError('Kindly create the default Schedule For {day_input} First')

            
            if not created:
                default_start_time = obj.start_time
                default_end_time = obj.end_time

                default_time_list = []
                input_time_list = []

                today = datetime.date.today()

                # --- Build default_time_list safely ---
                default_start_datetime = datetime.datetime.combine(today, default_start_time)
                default_end_datetime = datetime.datetime.combine(today, default_end_time)

                if default_end_datetime <= default_start_datetime:
                    default_end_datetime += datetime.timedelta(days=1)

                current_datetime = default_start_datetime

                while current_datetime <= default_end_datetime:
                    default_time_list.append(current_datetime.time())
                    current_datetime += product.duration


                # --- Build input_time_list safely ---
                input_start_datetime = datetime.datetime.combine(today, start_time_input)
                input_end_datetime = datetime.datetime.combine(today, end_time_input)

                if input_end_datetime <= input_start_datetime:
                    input_end_datetime += datetime.timedelta(days=1)

                current_datetime = input_start_datetime

                while current_datetime <= input_end_datetime:
                    current_time = current_datetime.time()

                    if str(current_time) not in except_hours_input:
                        input_time_list.append(current_time)

                    current_datetime += product.duration


                for i in default_time_list:
                    if i not in input_time_list:
                        delete_session(product, start_date, end_date,i, day_input)
                for i in input_time_list:
                    if i not in default_time_list:
                        created_sessions = create_session(product, start_date, end_date, i, day_input)

                
        if created_sessions is not None:
            return created_sessions[0] 
        else:
            return Session.objects.all()[0]
     
   



        
    def save_m2m(self):
        """ Override save_m2m to prevent admin errors """
        pass
   



class CalendarFilter(SimpleListFilter):
    title = _('Start Time')  # Label in the admin panel
    parameter_name = 'start_time'

    def lookups(self, request, model_admin):
        """
        This method is required but won't be used since we want a calendar input.
        """
        return []

    def queryset(self, request, queryset):
        value = request.GET.get(self.parameter_name)
        if value:
            try:
                local_date = datetime.datetime.strptime(value, "%Y-%m-%d").date()
                day_start = datetime.datetime(
                    local_date.year, local_date.month, local_date.day,
                    0, 0, 0, tzinfo=_CAIRO_TZ,
                )
                day_end = datetime.datetime(
                    local_date.year, local_date.month, local_date.day,
                    23, 59, 59, tzinfo=_CAIRO_TZ,
                )
                return queryset.filter(
                    start_time__gte=day_start,
                    start_time__lte=day_end,
                )
            except ValueError:
                pass  # Ignore invalid dates
        return queryset

class SessionAdmin(admin.ModelAdmin):
    change_list_template = "admin/Main/session/change_list.html"



    class Media:
        js = ('admin/js/session_title.js',)  

    list_display = ('id', 'product',  'start_time', 'end_time', 'get_product_duration', 'available_seats')  # Show in table
    list_filter = ( CalendarFilter, 'product__name')  # Optional: Filter by date
    search_fields = ('start_time', 'product__name',)
    ordering = ('start_time',)

    change_form_template = "admin/Main/session/change_form_title.html"

    # Dynamically change the title
    def get_context(self, request, object_id=None, form_url='', obj=None):
        context = super().get_context(request, object_id, form_url, obj)
        # Check if the form is being used for adding a new session
        if not obj:
            context['title'] = 'Add Custom Session'  # Set the title when creating a new session
        else:
            context['title'] = f'Edit Session: {obj.name}'  # Set a dynamic title when editing an existing session
        return context


    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related("product__group")
        if request.user.is_superuser:
            return qs
        # FIX: Session has no direct 'groups' field. Must traverse via product.
        # Also replaced Python loop with values_list() — one query not two.
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(product__group__name__in=group_names)

    def get_product_duration(self, obj):
        return obj.product.duration if obj.product else "N/A"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('create-custom/', self.admin_site.admin_view(self.create_custom_session), name='create_custom_session'),
            path('create-new/', self.admin_site.admin_view(self.create_default_session), name='create_default_session'),
            path('repair-sessions/', self.admin_site.admin_view(self.repair_sessions_view), name='repair_sessions_tool'),
        ]
        return custom_urls + urls

    def repair_sessions_view(self, request):
        context = {
            **self.admin_site.each_context(request),
            'title': 'Repair Sessions',
            'products': Product.objects.all().order_by('name'),
            'result': None,
            'dry_run': False,
        }

        if request.method == 'POST':
            start_raw = request.POST.get('start_date', '').strip()
            end_raw = request.POST.get('end_date', '').strip()
            product_id = request.POST.get('product_id', '').strip()
            dry_run = request.POST.get('dry_run') == 'on'

            errors = []

            try:
                start_date = datetime.date.fromisoformat(start_raw)
            except ValueError:
                errors.append(f"Invalid start date: '{start_raw}'")
                start_date = None

            try:
                end_date = datetime.date.fromisoformat(end_raw)
            except ValueError:
                errors.append(f"Invalid end date: '{end_raw}'")
                end_date = None

            if start_date and end_date and start_date > end_date:
                errors.append("Start date must be on or before end date.")

            if errors:
                for msg in errors:
                    messages.error(request, msg)
            else:
                product_ids = [int(product_id)] if product_id else None
                result = repair_sessions_for_range(
                    start_date=start_date,
                    end_date=end_date,
                    product_ids=product_ids,
                    dry_run=dry_run,
                )
                context['result'] = result
                context['dry_run'] = dry_run
                context['start_date'] = start_raw
                context['end_date'] = end_raw

                label = " [DRY RUN]" if dry_run else ""
                messages.success(
                    request,
                    f"Repair complete{label}: {result['created']} created, "
                    f"{result['deleted']} deleted, {result['errors']} errors.",
                )

        return render(request, 'admin/Main/session/repair_sessions.html', context)

    def create_custom_session(self, request):
        # Redirect to the default add page with a custom form
        request.session['form_type'] = 'custom'  # Set a session variable to indicate a custom form
        return redirect(f"{reverse('admin:Main_session_add')}?form_type=custom")

    def create_default_session(self, request):
        # Redirect to the default add page with a new form

        request.session['form_type'] = 'default'  # Set a session variable to indicate a regular form
        return redirect(f"{reverse('admin:Main_session_add')}?form_type=default")
    
    def get_form(self, request, obj=None, **kwargs):
        # Get the form type from the session (set when redirecting)
        if obj is not None:
            # Change form for existing objects
            kwargs['form'] = ChangeSessionAdminForm
        else:
            # Add form for new objects
            form_type = request.session.get('form_type')
            
            if form_type == 'custom':
                kwargs['form'] = CustomSessionAdminForm
            else:
                kwargs['form'] = DefaultSessionAdminForm

        return super().get_form(request, obj, **kwargs)
    
    def get_context(self, request, object_id=None, form_url='', obj=None):
        context = super().get_context(request, object_id, form_url, obj)

        form_type = request.GET.get('form_type', 'default')
        context['form_type'] = form_type

        return context
    
    def changelist_view(self, request, extra_context=None):
        extra_context = extra_context or {}
        
        # If there's a query parameter 'form_type', pass it to the template
        form_type = request.GET.get('form_type', None)
        extra_context['form_type'] = form_type

        return super().changelist_view(request, extra_context=extra_context)

    def save_model(self, request, obj, form, change):
        if change and obj.product_id:
            # Keep block_seats_obj.number in sync with the block_seats integer.
            if not isinstance(obj.block_seats_obj, dict):
                obj.block_seats_obj = {"number": 0, "note": "none"}
            obj.block_seats_obj["number"] = obj.block_seats or 0

            # Only recalculate available_seats if the admin did NOT manually
            # change it. If they explicitly set a value, respect it.
            if 'available_seats' not in form.changed_data:
                obj.available_seats = Booking.calculate_available_seats(obj)

        super().save_model(request, obj, form, change)

    get_product_duration.short_description = "Product Duration"
    
class ScheduleAdmin(admin.ModelAdmin):
    list_display = ('__str__', 'product', 'weekday', 'start_time', 'end_time')
    list_filter = ('product__name', 'weekday')

    def get_queryset(self, request):
        qs = super().get_queryset(request).select_related('product__group')
        if request.user.is_superuser:
            return qs
        group_names = list(request.user.groups.values_list("name", flat=True))
        return qs.filter(product__group__name__in=group_names)


admin.site.register( Session, SessionAdmin)
admin.site.register( Schedule, ScheduleAdmin)