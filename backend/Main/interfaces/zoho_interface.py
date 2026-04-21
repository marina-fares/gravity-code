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

# FIX P: Module-level token cache so we don't hit the DB on every
# ZohoApiInterface() instantiation. Zoho tokens last ~3600 seconds.
# We refresh 60 s early to avoid using an expired token mid-request.
_TOKEN_CACHE = {
    "access_key": None,
    "expires_at": 0.0,   # unix timestamp
}
_TOKEN_TTL = 3540  # 59 minutes — refresh 1 minute before expiry


def _get_cached_token(fallback=None):
    """
    Return a valid Zoho token from the module-level cache.
    Falls back to the DB (IntegrationToken) on first call or after expiry,
    and ultimately to the env-var fallback.
    """
    now = time.monotonic()
    if _TOKEN_CACHE["access_key"] and now < _TOKEN_CACHE["expires_at"]:
        return _TOKEN_CACHE["access_key"]

    # Cache miss — load from DB
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
    """Force the next call to re-read from DB (used after a token refresh)."""
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
        # FIX P: Use the module-level cache instead of a per-instance DB query.
        # Before this fix, every ZohoApiInterface() fired an IntegrationToken
        # DB query, meaning every Zoho API call (booking completion, receipt
        # creation, etc.) was preceded by an unneeded SELECT.
        self.access_key = _get_cached_token(access_key)

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    def update_access_token(self, new_access_token):
        """Persist a new Zoho access token to the DB and update the cache."""
        try:
            from Main.models.integration_token import IntegrationToken
            IntegrationToken.objects.update_or_create(
                service='zoho',
                defaults={'access_token': new_access_token},
            )
            self.access_key = new_access_token
            # Update cache so other workers benefit immediately
            _TOKEN_CACHE["access_key"] = new_access_token
            _TOKEN_CACHE["expires_at"] = time.monotonic() + _TOKEN_TTL
            logger.info("Zoho access token updated in database and cache.")
        except Exception as exc:
            logger.error("Failed to save Zoho token to database: %s", exc)
            self.access_key = new_access_token
            _invalidate_token_cache()

    def refresh_access_token(self, group_name, request_type, url, payload):
        """Exchange the refresh token for a new access token, then retry."""
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

    # ------------------------------------------------------------------
    # API requests
    # ------------------------------------------------------------------

    def make_zoho_request(self, group_name, request_type, url, payload, _retry=True):
        """
        Make an authenticated request to the Zoho Books API.

        _retry=True  — will attempt a token refresh on 401 and retry once.
        _retry=False — already retrying after a refresh; do not loop.
        """
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

        # Token expired — refresh and retry once
        if _retry and (
            response.status_code == 401
            or response.json().get('code') == 57
        ):
            logger.warning("Zoho token expired (status %s), refreshing...", response.status_code)
            _invalidate_token_cache()
            return self.refresh_access_token(group_name, request_type, url, payload)

        if not response.ok:
            logger.error(
                "Zoho API error [%s %s] status=%s body=%s",
                request_type, url, response.status_code, response.text[:500],
            )

        return response