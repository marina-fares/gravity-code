from datetime import timedelta
import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv(os.path.join(
    os.path.dirname(os.path.dirname(__file__)), '.env'))

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('SECRET_KEY')

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
    ('0 2 * * *', 'django.core.management.call_command', ['run_midnight_task']),
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
    )
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