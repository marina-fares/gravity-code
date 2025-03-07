FROM python:3.9-slim

ENV PYTHONUNBUFFERED=1
ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

# Install essential dependencies and tools
RUN apt-get update -qq && apt-get install -y --no-install-recommends \
    gettext \
    libpq-dev \
    postgresql-client \
    gcc \
    libffi-dev \
    python3-dev \
    && apt-get clean

WORKDIR /usr/src/app

# Ensure pip is installed and working
RUN pip --version
RUN python --version

# Clean any existing packages and upgrade pip, setuptools, and pipenv
RUN pip uninstall -y pipenv setuptools virtualenv
RUN pip install --upgrade pip
RUN pip install pipenv --upgrade

# Copy Pipfile and Pipfile.lock, then install dependencies using pipenv
COPY Pipfile.lock /usr/src/app/
COPY Pipfile /usr/src/app/
RUN pipenv install --deploy --ignore-pipfile
COPY .env /usr/src/app/.env

# Add entrypoint script
COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]

EXPOSE 5000

