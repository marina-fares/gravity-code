from django.contrib import admin
from django.http import HttpResponse
from django.urls import path, re_path, include
from rest_framework import permissions
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from drf_yasg.views import get_schema_view
from drf_yasg import openapi

# SECURITY FIX: Swagger UI was public=True with AllowAny — anyone could
# browse your full API schema without authentication. Restricted to staff.
schema_view = get_schema_view(
    openapi.Info(
        title="Gravity Booking API",
        default_version='v1',
        description="Internal API documentation",
    ),
    public=False,
    permission_classes=[permissions.IsAdminUser],
)

urlpatterns = [
    # Health check — must be first, must return 200 with no redirects.
    # Docker healthcheck hits http://localhost:8000/health/ from inside the
    # container over plain HTTP. Any redirect (301/302) means the container
    # is marked unhealthy and killed. This view bypasses authentication,
    # HTTPS enforcement, and all middleware that could produce a redirect.
    path('health/', lambda request: HttpResponse('ok', content_type='text/plain'), name='health'),

    path('api/token/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('api/token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # API docs — staff only
    re_path(r'^swagger(?P<format>\.json|\.yaml)$',
            schema_view.without_ui(cache_timeout=0), name='schema-json'),
    re_path(r'^swagger/$',
            schema_view.with_ui('swagger', cache_timeout=0), name='schema-swagger-ui'),
    re_path(r'^redoc/$',
            schema_view.with_ui('redoc', cache_timeout=0), name='schema-redoc'),

    path('admin/', admin.site.urls),
    path('api/', include('Main.urls')),
]