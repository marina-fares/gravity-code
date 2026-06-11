"""
repair_sessions_api.py
======================

Admin-only API endpoint to trigger a session repair over a date range.

POST /repair-sessions/
{
    "start_date": "2026-06-10",
    "end_date":   "2026-06-12",
    "product_ids": [1, 2],   // optional — omit to repair all products
    "dry_run": false          // optional — true to preview without DB changes
}

Response 200:
{
    "created": 3,
    "deleted": 1,
    "errors":  0,
    "dry_run": false
}
"""

from datetime import date

from django.contrib.admin.views.decorators import staff_member_required
from django.utils.decorators import method_decorator
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import IsAdminUser

from Main.management.commands.repair_sessions import repair_sessions_for_range


@method_decorator(staff_member_required, name='dispatch')
class RepairSessionsApi(APIView):
    permission_classes = [IsAdminUser]

    def post(self, request):
        data = request.data

        start_raw = data.get('start_date')
        end_raw = data.get('end_date')

        if not start_raw or not end_raw:
            return Response(
                {"error": "start_date and end_date are required (YYYY-MM-DD)"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            start_date = date.fromisoformat(str(start_raw))
            end_date = date.fromisoformat(str(end_raw))
        except ValueError:
            return Response(
                {"error": f"Invalid date format. Expected YYYY-MM-DD, got '{start_raw}' / '{end_raw}'"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if start_date > end_date:
            return Response(
                {"error": "start_date must be <= end_date"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        max_range = 60
        if (end_date - start_date).days > max_range:
            return Response(
                {"error": f"Date range too large. Maximum {max_range} days per request."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        product_ids = data.get('product_ids') or None
        dry_run = bool(data.get('dry_run', False))

        result = repair_sessions_for_range(
            start_date=start_date,
            end_date=end_date,
            product_ids=product_ids,
            dry_run=dry_run,
        )

        result['dry_run'] = dry_run
        return Response(result, status=status.HTTP_200_OK)
