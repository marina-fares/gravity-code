FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1 \
    APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

# Install system dependencies
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    gettext \
    libpq-dev \
    postgresql-client \
    gcc \
    libffi-dev \
    python3-dev \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Set working directory
WORKDIR /usr/src/app

# Install pipenv and other Python deps
RUN pip install --upgrade pip pipenv python-dotenv

# Copy dependency files and install
COPY Pipfile Pipfile.lock ./
RUN pipenv install --deploy --ignore-pipfile

# Copy environment and source code
COPY .env .env
COPY . .

# Set up entrypoint
COPY entrypoint.sh /usr/bin/entrypoint.sh
RUN chmod +x /usr/bin/entrypoint.sh
ENTRYPOINT ["/usr/bin/entrypoint.sh"]

EXPOSE 5000
