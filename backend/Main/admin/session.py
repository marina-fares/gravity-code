from django.contrib import admin
from ..models.models_sessions import Session, Product, Booking, Schedule
from django.contrib.auth.models import User, Group
from django.contrib.auth.admin import UserAdmin
from django import forms

import datetime as datetime
from django.core.exceptions import ValidationError
from django.contrib.admin import SimpleListFilter
from django.utils.translation import gettext_lazy as _
import os
from rangefilter.filters import DateRangeFilter
from django.contrib.admin.filters import DateFieldListFilter
from django.http import HttpResponse ,HttpRequest
from django.urls import path, reverse
from django.shortcuts import redirect, render
from django.contrib import messages
from django.utils import timezone

from Main.admin.create_new_sessions import create_session, delete_session

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
            print("-------------------88")
            print(start_time_str)
            print(end_time_str)
            if except_hours_flag and start_time_str and end_time_str:
                try:
                    start_hour = int(start_time_str.split(":")[0])
                    end_hour = int(end_time_str.split(":")[0])

                    # Ensure choices are string-formatted to match submitted values
                    hour_choices = [(str(h), f"{h}:00") for h in range(start_hour, end_hour + 1)]
                    self.fields['except_hours'].choices = hour_choices
                except Exception:
                    pass  # Safe fail, clean() will handle it later



    def clean(self):
        cleaned_data = super().clean()  # Call the parent class's clean method to get cleaned data
        start_time = cleaned_data.get("start_time_input")
        end_time = cleaned_data.get("end_time_input")
        except_hours_flag = cleaned_data.get("except_hours_flag")
        except_hours = cleaned_data.get("except_hours")
        # print(start_date.weekday)
        
        # Ensure minutes and seconds are zero for start time
        if start_time and (start_time.minute != 0 or start_time.second != 0):
            raise ValidationError("Start time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        # Ensure minutes and seconds are zero for end time
        if end_time and (end_time.minute != 0 or end_time.second != 0):
            raise ValidationError("End time must be on the hour (e.g., 08:00, 14:00, etc.).")
        

        if except_hours_flag and start_time and end_time:
            hour_choices = [(str(h), f"{h}:00") for h in range(start_time.hour, end_time.hour + 1)]
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
        except_hours_input = self.cleaned_data.get("except_hours")


        weekdays = self.cleaned_data.get("weekdays")
        default_start_time = None
        default_end_time = None
        days_label = []
        created_sessions = None

        for day in weekdays:
            days_label.append(dict(WEEKDAYS).get(day))

        if except_hour_flag and not except_hours_input:
            print("Except hour flag is on but no hours selected.")
            return None  # don't save anything
        
        if except_hour_flag and except_hours_input:
            print("-----------------------143", except_hours_input)

        print("-----------------------30", product, start_time_input, end_time_input, except_hour_flag)
        print(days_label)
        # replace the except hour str with time


        for day_input in days_label:
            try:
                obj = Schedule.objects.get(weekday=str(day_input), product=product)
                created = False
            except Schedule.DoesNotExist:
                # Second: If not found, create it
                obj = Schedule.objects.create(start_time=start_time_input, end_time=end_time_input, weekday=str(day_input), product=product, except_hours=except_hours_input)
                created = True
            
            if created:
                for i in range(start_time_input.hour, end_time_input.hour + 1):
                    print("-----------185", i)
                    print(except_hours_input)
                    if str(i) not in except_hours_input:
                        created_sessions = create_session(product, start_date, end_date, datetime.time(i,0), day_input)
            
            else:
                default_start_time = obj.start_time
                default_end_time = obj.end_time
                print("Schedule already existed:", obj)

                default_time_list = []
                input_time_list = []
                
                for i in range(default_start_time.hour, default_end_time.hour + 1):
                    default_time_list.append(datetime.time(i,0))

                for i in range(start_time_input.hour, end_time_input.hour + 1):
                    if str(i) not in except_hours_input:
                        input_time_list.append(datetime.time(i,0))

                for i in default_time_list:
                    if i not in input_time_list:
                        delete_session(product, i, day_input)
                print("-----------------208", input_time_list)
                for i in input_time_list:
                    if i not in default_time_list:
                        created_sessions = create_session(product, start_date, end_date, i, day_input)
                        print("-------------new sessions", i)

                
                Schedule.objects.filter(weekday=str(day_input), product=product).update(start_time=start_time_input, end_time=end_time_input, except_hours=except_hours_input)
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
            print("-------------------88")
            print(start_time_str)
            print(end_time_str)
            if except_hours_flag and start_time_str and end_time_str:
                try:
                    start_hour = int(start_time_str.split(":")[0])
                    end_hour = int(end_time_str.split(":")[0])

                    # Ensure choices are string-formatted to match submitted values
                    hour_choices = [(str(h), f"{h}:00") for h in range(start_hour, end_hour + 1)]
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
        
        # Ensure minutes and seconds are zero for start time
        if start_time and (start_time.minute != 0 or start_time.second != 0):
            raise ValidationError("Start time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        # Ensure minutes and seconds are zero for end time
        if end_time and (end_time.minute != 0 or end_time.second != 0):
            raise ValidationError("End time must be on the hour (e.g., 08:00, 14:00, etc.).")
        
        # if start_date < datetime.datetime.today():
        #     raise ValidationError("The Start Date should be today or after today")
        
        if except_hours_flag and start_time and end_time:
            print("---------------------311")
            print(except_hours_flag)
            print(start_time)
            print(end_time)
            hour_choices = [(str(h), f"{h}:00") for h in range(start_time.hour, end_time.hour + 1)]
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
            print("Except hour flag is on but no hours selected.")
            return None  # don't save anything
        

        print("-----------------------30", product, start_time_input, end_time_input, except_hour_flag, weekdays)
        print(days_label)
        # replace the except hour str with time


        for day_input in days_label:
            try:
                print("-------------361")
                print(day_input)
                print(product)
                obj = Schedule.objects.get(weekday=str(day_input), product=product)

                created = False
            except Schedule.DoesNotExist:
                # Second: If not found, create it
                raise ValueError('Kindly create the default Schedule For {day_input} First')

            
            if not created:
                default_start_time = obj.start_time
                default_end_time = obj.end_time
                print("Schedule already existed:", obj)

                default_time_list = []
                input_time_list = []
                
                for i in range(default_start_time.hour, default_end_time.hour + 1):
                    default_time_list.append(datetime.time(i,0))

                for i in range(start_time_input.hour, end_time_input.hour + 1):
                    if str(i) not in except_hours_input:
                        input_time_list.append(datetime.time(i,0))

                for i in default_time_list:
                    if i not in input_time_list:
                        delete_session(product, i, day_input)
                print("-----------------208", input_time_list)
                for i in input_time_list:
                    if i not in default_time_list:
                        created_sessions = create_session(product, start_date, end_date, i, day_input)
                        print("-------------new sessions", i)

                
                Schedule.objects.filter(weekday=str(day_input), product=product).update(start_time=start_time_input, end_time=end_time_input, except_hours=except_hours_input)
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
                date_value = datetime.datetime.strptime(value, "%Y-%m-%d").date()
                return queryset.filter(start_time__date=date_value)
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

        current_user = request.user
        if current_user.is_superuser:
            return Session.objects.all()
        else:
            current_user_groups = current_user.groups.all()
            current_user_group_names = [
                group.name for group in current_user_groups]
            return Session.objects.filter(groups__name__in=current_user_group_names)

    def get_product_duration(self, obj):
        return obj.product.duration if obj.product else "N/A"

    def get_urls(self):
        urls = super().get_urls()
        custom_urls = [
            path('create-custom/', self.admin_site.admin_view(self.create_custom_session), name='create_custom_session'),
            path('create-new/', self.admin_site.admin_view(self.create_default_session), name='create_default_session'),
        ]
        return custom_urls + urls

    def create_custom_session(self, request):
        # Redirect to the default add page with a custom form
        print("this is custom session --------------")
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
            print("Form type from session:", form_type)
            
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

    get_product_duration.short_description = "Product Duration"
    
#admin.site.unregister(User)
admin.site.register( Session, SessionAdmin)
