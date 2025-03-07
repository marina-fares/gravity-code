FROM python:3.9

ENV PYTHONUNBUFFERED=1
ENV APT_KEY_DONT_WARN_ON_DANGEROUS_USAGE=DontWarn

RUN apt-get update -qq \
    && apt-get install -y --no-install-recommends \
    gettext \
    libpq-dev \
    postgresql-client

WORKDIR /usr/src/app

RUN pip install pipenv
COPY Pipfile.lock /usr/src/app/
COPY Pipfile /usr/src/app/
RUN pipenv install --system

COPY entrypoint.sh /usr/bin/
RUN chmod +x /usr/bin/entrypoint.sh

ENTRYPOINT ["entrypoint.sh"]

EXPOSE 5000
