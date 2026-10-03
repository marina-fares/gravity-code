# =================================================================
# Stage 1 — builder
# Creates a virtualenv and installs all packages into it.
# The virtualenv path is fixed and predictable — no path guessing.
# =================================================================
FROM python:3.9-slim AS builder

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1 \
    VIRTUAL_ENV=/opt/venv

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    gcc \
    libffi-dev \
    python3-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtualenv at a fixed, known path
RUN python -m venv $VIRTUAL_ENV
ENV PATH="$VIRTUAL_ENV/bin:$PATH"

WORKDIR /build

RUN pip install pipenv==2023.12.1
COPY Pipfile Pipfile.lock ./
RUN pipenv requirements > requirements.txt

# Install everything into the virtualenv
RUN pip install -r requirements.txt && \
    pip install \
        "gunicorn==21.2.0" \
        "typing-extensions>=4.6" \
        "python-dotenv>=1.0"

# Verify everything is installed correctly before leaving builder
RUN python -c "import django; print('Django', django.__version__)" && \
    python -c "import typing_extensions; print('typing_extensions OK')" && \
    python -c "import gunicorn; print('gunicorn OK')" && \
    python -c "import psycopg2; print('psycopg2 OK')"


# =================================================================
# Stage 2 — production runtime
# Copies the entire virtualenv — no path ambiguity possible.
# =================================================================
FROM python:3.9-slim AS runtime

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    DJANGO_SETTINGS_MODULE=Config.settings \
    VIRTUAL_ENV=/opt/venv \
    PATH="/opt/venv/bin:$PATH" \
    APP_HOME=/usr/src/app

RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    libpq5 \
    gettext \
    cron \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy the entire virtualenv from builder — same fixed path, guaranteed to work
COPY --from=builder /opt/venv /opt/venv

# Verify packages are reachable in runtime stage
RUN python -c "import django; print('Django', django.__version__, 'OK')" && \
    python -c "import typing_extensions; print('typing_extensions OK')" && \
    python -c "import gunicorn; print('gunicorn OK')" && \
    python -c "import psycopg2; print('psycopg2 OK')"

WORKDIR $APP_HOME

# Copy source code — .env is NOT copied, passed at runtime via env_file
COPY . .

RUN chmod +x entrypoint.sh

# Collect static files at build time with throwaway env values
RUN SECRET_KEY=build-time-only-not-used-at-runtime \
    PLATFORM=PRODUCTION \
    PGHOST=localhost PGPORT=5432 \
    PGUSER=x PGPASSWORD=x PGDATABASE=x \
    python manage.py collectstatic --noinput

# Create a non-root owner for the app files (cron daemon still needs root to
# start at runtime, so we do NOT set USER here — entrypoint.sh starts cron
# as root then continues as root; Gunicorn itself drops privileges per-worker
# via its own --user flag if needed).
RUN useradd --no-create-home --shell /bin/false appuser \
    && chown -R appuser:appuser $APP_HOME

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:5000/health/ || exit 1

ENTRYPOINT ["./entrypoint.sh"]