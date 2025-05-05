import datetime
from django.utils.translation import gettext_lazy as _
from django.contrib.admin import SimpleListFilter

class CalendarFilter(SimpleListFilter):
    title = _('Start Time')  # Label in the admin panel
    parameter_name = 'start_time'

    def lookups(self, request, model_admin):
        return [
            ("today", _("Today")),
            ("this_week", _("This Week")),
            ("this_month", _("This Month")),
        ]

    def queryset(self, request, queryset):
        value = self.value()
        now = datetime.datetime.now()

        if value == "today":
            return queryset.filter(start_time__date=now.date())
        elif value == "this_week":
            start_week = now - datetime.timedelta(days=now.weekday())
            return queryset.filter(start_time__date__gte=start_week.date())
        elif value == "this_month":
            start_month = now.replace(day=1)
            return queryset.filter(start_time__date__gte=start_month.date())
        return queryset
