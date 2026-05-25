from datetime import timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(os.path.join(
    os.path.dirname(os.path.dirname(__file__)), '.env'))

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY')

# Fail fast at startup if SECRET_KEY is missing or too short.
# A missing key means Django starts with SECRET_KEY=None — all sessions and
# CSRF tokens are forgeable. A key under 32 bytes triggers InsecureKeyLengthWarning
# from PyJWT on every token verification request (visible in container logs).
if not SECRET_KEY:
    raise RuntimeError(
        "SECRET_KEY environment variable is not set. "
        "Add a random 50+ character string to your .env file."
    )
if len(SECRET_KEY.encode()) < 32:
    import warnings
    warnings.warn(
        f"SECRET_KEY is only {len(SECRET_KEY.encode())} bytes. "
        "Django and PyJWT recommend at least 32 bytes (50+ recommended). "
        "Update SECRET_KEY in your .env file.",
        stacklevel=2,
    )

PLATFORM = os.getenv('PLATFORM')

if PLATFORM == 'DEVELOPMENT':
    DEBUG = True
    ALLOWED_HOSTS = ['*']
else:
    DEBUG = False
    ALLOWED_HOSTS = [
        'fobook.gravitycode.me',
        'localhost',
        '127.0.0.1',
        'gravity-app',
    ]

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',  # FIXED — was floating outside INSTALLED_APPS as a bare string
    'drf_yasg',
    'corsheaders',
    'django_crontab',
    'Main',
]

CRONJOBS = [
    # 02:00 Cairo — generate sessions for the next 365 days
    ('0 2 * * *', 'django.core.management.call_command', ['run_midnight_task']),
    # 03:00 Cairo — delete sessions, bookings, and shift history older than 1 year
    ('0 3 * * *', 'django.core.management.call_command', ['run_cleanup_task']),
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'whitenoise.middleware.WhiteNoiseMiddleware',          # position 2 — correct
    'corsheaders.middleware.CorsMiddleware',               # FIXED — moved above CommonMiddleware
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',           # only once — FIXED (was duplicated)
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    'Main.middleware.APILogMiddleware',
]

CORS_ALLOWED_ORIGINS = [
    'https://fobook.gravitycode.me',
    'https://fodev.gravitycode.me',
    'http://localhost:3000',
    'http://localhost:3001',
]

CSRF_TRUSTED_ORIGINS = [
    'https://fobook.gravitycode.me',
    'https://fodev.gravitycode.me',
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:5000',    # ADDED — needed for admin login POST from browser
    'http://127.0.0.1:5000',   # ADDED — needed for admin login POST from browser
]

# CORS_ALLOW_ALL_ORIGINS = True  # keep this commented — it overrides the whitelist

ROOT_URLCONF = 'Config.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'Config.wsgi.application'

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql_psycopg2',
        'USER': os.environ.get('PGUSER'),        # FIXED — was 'USER:' with a colon (typo)
        'PASSWORD': os.environ.get('PGPASSWORD'),
        'HOST': os.environ.get('PGHOST'),
        'PORT': os.environ.get('PGPORT'),
        'NAME': os.environ.get('PGDATABASE'),
        'CONN_MAX_AGE': 60,
    }
}

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    # Deny unauthenticated requests by default — explicit AllowAny required
    # to opt out. Prevents accidental data exposure if a new endpoint is added
    # without a permission_classes declaration.
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    # Rate limiting: anonymous requests (login brute-force) and authenticated
    # requests (API abuse). Adjust limits to match your expected traffic.
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '60/minute',    # covers /api/token/ brute-force
        'user': '600/minute',   # generous for authenticated kiosk polling
    },
    # Cursor pagination is safer than page-number for large datasets
    # (no COUNT(*) query, stable ordering). Apply per-view or globally.
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 50,
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=30),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=1),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
}

SWAGGER_SETTINGS = {
    'SECURITY_DEFINITIONS': {
        'Bearer': {
            'type': 'apiKey',
            'name': 'Authorization',
            'in': 'header'
        }
    }
}

AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator'},
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator'},
    {'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator'},
    {'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator'},
]

LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Cairo'
USE_I18N = True
USE_L10N = True
USE_TZ = True

STATIC_URL = '/django_static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'static')

# WhiteNoise — serves static files directly from Gunicorn.
# CompressedStaticFilesStorage works without a manifest file.
# Use CompressedManifestStaticFilesStorage only when collectstatic
# runs as part of the build and you can guarantee the manifest exists.
STATICFILES_STORAGE = 'whitenoise.storage.CompressedStaticFilesStorage'  # FIXED

# ---------------------------------------------------------------------------
# HTTPS / Security Headers (production only)
# ---------------------------------------------------------------------------
if PLATFORM != 'DEVELOPMENT':
    # SECURE_SSL_REDIRECT: Do NOT enable this when running behind an nginx/load
    # balancer that terminates SSL externally (the standard Docker setup here).
    # With SSL termination at the proxy, Gunicorn only ever sees plain HTTP on
    # the internal network — SECURE_SSL_REDIRECT would redirect EVERY request
    # including /health/ health checks to HTTPS, causing 301 loops.
    #
    # The correct approach is to let nginx enforce HTTPS externally and use
    # SECURE_PROXY_SSL_HEADER so Django knows the original connection was secure.
    SECURE_SSL_REDIRECT = False          # proxy handles SSL, not Gunicorn

    SECURE_HSTS_SECONDS = 31536000          # 1 year
    SECURE_HSTS_INCLUDE_SUBDOMAINS = True
    SECURE_HSTS_PRELOAD = True
    SECURE_PROXY_SSL_HEADER = ('HTTP_X_FORWARDED_PROTO', 'https')
    SESSION_COOKIE_SECURE = True
    CSRF_COOKIE_SECURE = True
    SECURE_BROWSER_XSS_FILTER = True
    SECURE_CONTENT_TYPE_NOSNIFF = True
    X_FRAME_OPTIONS = 'DENY'



DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Third-party API keys — all from environment, never hardcoded
SQUARE_API_URL = os.environ.get('SQUARE_API_URL')
SQUARE_API_KEY = os.environ.get('SQUARE_API_KEY')

BOOKEO_API_URL = os.environ.get('BOOKEO_API_URL')
BOOKEO_API_KEY = os.environ.get('BOOKEO_API_KEY')
BOOKEO_API_SECRET = os.environ.get('BOOKEO_API_SECRET')

ZOHO_ACCESS_KEY = os.environ.get('ZOHO_ACCESS_KEY')
ZOHO_ENV_ID = os.environ.get('ZOHO_ENV_ID')
ZOHO_DOMAIN_URL = os.environ.get('ZOHO_DOMAIN_URL')
ZOHO_REFRESH_TOKEN = os.environ.get('ZOHO_REFRESH_TOKEN')
ZOHO_CLIENT_ID = os.environ.get('ZOHO_CLIENT_ID')
ZOHO_CLIENT_SECRET = os.environ.get('ZOHO_CLIENT_SECRET')
# Log Django errors to stderr so they appear in docker logs
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['console'],
            'level': 'ERROR',
        },
    },
}