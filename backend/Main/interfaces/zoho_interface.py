import json
import logging
import os
import time

import requests
from requests.exceptions import RequestException

from Config.settings import (
    ZOHO_ACCESS_KEY, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET,
    ZOHO_DOMAIN_URL, ZOHO_ENV_ID, ZOHO_REFRESH_TOKEN,
)

logger = logging.getLogger(__name__)

_TOKEN_CACHE = {"access_key": None, "expires_at": 0.0}
_TOKEN_TTL = 3540  # 59 minutes


def _get_cached_token(fallback=None):
    now = time.monotonic()
    if _TOKEN_CACHE["access_key"] and now < _TOKEN_CACHE["expires_at"]:
        return _TOKEN_CACHE["access_key"]
    try:
        from Main.models.integration_token import IntegrationToken
        token_obj = IntegrationToken.objects.filter(service='zoho').first()
        if token_obj:
            _TOKEN_CACHE["access_key"] = token_obj.access_token
            _TOKEN_CACHE["expires_at"] = now + _TOKEN_TTL
            return _TOKEN_CACHE["access_key"]
    except Exception as exc:
        logger.warning("Could not load Zoho token from DB: %s", exc)
    token = fallback or os.getenv('ZOHO_ACCESS_KEY')
    if token:
        _TOKEN_CACHE["access_key"] = token
        _TOKEN_CACHE["expires_at"] = now + _TOKEN_TTL
    return token


def _invalidate_token_cache():
    _TOKEN_CACHE["access_key"] = None
    _TOKEN_CACHE["expires_at"] = 0.0


class ZohoApiInterface(json.JSONEncoder):

    def __init__(
        self,
        domain=ZOHO_DOMAIN_URL,
        env_id=ZOHO_ENV_ID,
        access_key=ZOHO_ACCESS_KEY,
        client_id=ZOHO_CLIENT_ID,
        client_secret=ZOHO_CLIENT_SECRET,
        refresh_token=ZOHO_REFRESH_TOKEN,
    ):
        self.domain = domain
        self.env_id = env_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        self.access_key = _get_cached_token(access_key)

    def update_access_token(self, new_access_token):
        try:
            from Main.models.integration_token import IntegrationToken
            IntegrationToken.objects.update_or_create(
                service='zoho',
                defaults={'access_token': new_access_token},
            )
            self.access_key = new_access_token
            _TOKEN_CACHE["access_key"] = new_access_token
            _TOKEN_CACHE["expires_at"] = time.monotonic() + _TOKEN_TTL
            logger.info("Zoho access token updated in database and cache.")
        except Exception as exc:
            logger.error("Failed to save Zoho token to database: %s", exc)
            # Keep the fresh token in the per-worker memory cache even if the
            # DB save failed. Invalidating here caused a token refresh on EVERY
            # request (expired env token → 401 → refresh), which tripped
            # Zoho's rate limit on token generation and took the whole
            # integration down with 400s.
            self.access_key = new_access_token
            _TOKEN_CACHE["access_key"] = new_access_token
            _TOKEN_CACHE["expires_at"] = time.monotonic() + _TOKEN_TTL

    def refresh_access_token(self, group_name, request_type, url, payload):
        logger.info("Refreshing Zoho access token...")
        try:
            response = requests.post(
                "https://accounts.zoho.com/oauth/v2/token",
                data={
                    "refresh_token": self.refresh_token,
                    "client_id": self.client_id,
                    "client_secret": self.client_secret,
                    "grant_type": "refresh_token",
                },
                timeout=10,
            )
            response.raise_for_status()
            data = response.json()
        except RequestException as exc:
            logger.error("Zoho token refresh network error: %s", exc)
            _invalidate_token_cache()
            return None

        if "access_token" not in data:
            logger.error("Zoho token refresh failed — response: %s", data)
            _invalidate_token_cache()
            return None

        self.update_access_token(data["access_token"])
        logger.info("Zoho token refreshed successfully.")
        return self.make_zoho_request(group_name, request_type, url, payload, _retry=False)

    def make_zoho_request(self, group_name, request_type, url, payload, _retry=True):
        headers = {'Authorization': f'Zoho-oauthtoken {self.access_key}'}
        base_params = {'organization_id': self.env_id}
        full_url = self.domain + url

        try:
            method = getattr(requests, request_type.lower())

            if request_type.lower() == 'delete':
                response = method(
                    full_url, headers=headers, params=base_params, timeout=30,
                )
            elif url == '/items':
                response = method(
                    full_url,
                    headers=headers,
                    params={
                        **base_params,
                        'search_text': 'description',
                        'description_contains': group_name,
                    },
                    timeout=30,
                )
            else:
                response = method(
                    full_url,
                    headers=headers,
                    params=base_params,
                    json=payload,
                    timeout=30,
                )
        except RequestException as exc:
            logger.error("Zoho API network error [%s %s]: %s", request_type, url, exc)
            return None

        # FIX: response.json() can itself raise ValueError if Zoho returns
        # a non-JSON body (e.g. HTML error page). Guard with try/except so
        # we don't crash while checking for code==57, and treat a
        # non-parseable body on 401 as an expired token.
        if _retry and response.status_code == 401:
            logger.warning("Zoho token expired (401), refreshing...")
            _invalidate_token_cache()
            return self.refresh_access_token(group_name, request_type, url, payload)

        if _retry:
            try:
                body = response.json()
                if body.get('code') == 57:
                    logger.warning("Zoho token expired (code 57), refreshing...")
                    _invalidate_token_cache()
                    return self.refresh_access_token(group_name, request_type, url, payload)
            except ValueError:
                pass  # Non-JSON body — not a token error, fall through

        if not response.ok:
            logger.error(
                "Zoho API error [%s %s] status=%s body=%s",
                request_type, url, response.status_code, response.text[:500],
            )

        return response