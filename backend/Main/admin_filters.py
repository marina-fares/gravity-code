import datetime
import zoneinfo

from django.utils.translation import gettext_lazy as _
from django.contrib.admin import SimpleListFilter

_CAIRO_TZ = zoneinfo.ZoneInfo("Africa/Cairo")


def _cairo_now():
    """Return the current moment as a Cairo-aware datetime."""
    return datetime.datetime.now(tz=_CAIRO_TZ)


def _cairo_day_start(dt):
    """Return midnight Cairo time on the same local day as *dt*, as an aware datetime."""
    local = dt.astimezone(_CAIRO_TZ)
    return datetime.datetime(local.year, local.month, local.day, 0, 0, 0, tzinfo=_CAIRO_TZ)


class CalendarFilter(SimpleListFilter):
    title = _('Start Time')
    parameter_name = 'start_time'

    def lookups(self, request, model_admin):
        return [
            ("today", _("Today")),
            ("this_week", _("This Week")),
            ("this_month", _("This Month")),
        ]

    def queryset(self, request, queryset):
        value = self.value()
        now = _cairo_now()
        today_start = _cairo_day_start(now)

        if value == "today":
            today_end = today_start + datetime.timedelta(days=1)
            return queryset.filter(
                start_time__gte=today_start,
                start_time__lt=today_end,
            )
        elif value == "this_week":
            week_start = today_start - datetime.timedelta(days=now.weekday())
            return queryset.filter(start_time__gte=week_start)
        elif value == "this_month":
            month_start = _cairo_day_start(now.replace(day=1))
            return queryset.filter(start_time__gte=month_start)
        return queryset