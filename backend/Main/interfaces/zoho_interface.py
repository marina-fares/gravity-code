from Config.settings import (
    ZOHO_DOMAIN_URL, ZOHO_ENV_ID, ZOHO_ACCESS_KEY,
    ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
)
import requests
import json
import os
import logging

logger = logging.getLogger(__name__)


class ZohoApiInterface(json.JSONEncoder):

    def __init__(
        self,
        domain=ZOHO_DOMAIN_URL,
        env_id=ZOHO_ENV_ID,
        access_key=ZOHO_ACCESS_KEY,
        client_id=ZOHO_CLIENT_ID,
        client_secret=ZOHO_CLIENT_SECRET,
        refresh_token=ZOHO_REFRESH_TOKEN
    ):
        self.domain = domain
        self.env_id = env_id
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token
        # Always load the latest token from DB on init, fall back to .env
        self.access_key = self._load_token(access_key)

    # ------------------------------------------------------------------
    # Token management
    # ------------------------------------------------------------------

    def _load_token(self, fallback=None):
        """
        Load the current Zoho access token from the database.
        Falls back to the value passed in (from settings/.env) if no DB
        record exists yet. This runs at __init__ time so every request
        always starts with the freshest token.
        """
        # Lazy import — avoids ModuleNotFoundError during Django startup
        # when urls.py imports this file before models are fully loaded.
        try:
            from Main.models.integration_token import IntegrationToken
            token = IntegrationToken.objects.filter(service='zoho').first()
            if token:
                return token.access_token
        except Exception as e:
            logger.warning("Could not load Zoho token from DB: %s", e)
        return fallback or os.getenv('ZOHO_ACCESS_KEY')

    def update_access_token(self, new_access_token):
        """
        Persist a new Zoho access token to the database.
        This replaces the old pattern of writing to the .env file,
        which caused race conditions and lost tokens on container restart.
        """
        try:
            from Main.models.integration_token import IntegrationToken
            IntegrationToken.objects.update_or_create(
                service='zoho',
                defaults={'access_token': new_access_token}
            )
            self.access_key = new_access_token
            logger.info("Zoho access token updated in database.")
        except Exception as e:
            logger.error("Failed to save Zoho token to database: %s", e)
            # Still update in memory so the current request can continue
            self.access_key = new_access_token

    def refresh_access_token(self, group_name, request_type, url, payload):
        """
        Exchange the refresh token for a new access token.
        Called automatically by make_zoho_request when a 401 is received.
        """
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
        except requests.RequestException as e:
            logger.error("Zoho token refresh network error: %s", e)
            return None

        if "access_token" not in data:
            logger.error("Zoho token refresh failed — response: %s", data)
            return None

        self.update_access_token(data["access_token"])
        logger.info("Zoho token refreshed successfully.")
        # Retry the original request once with the new token
        return self.make_zoho_request(
            group_name, request_type, url, payload, _retry=False
        )

    # ------------------------------------------------------------------
    # API requests
    # ------------------------------------------------------------------

    def make_zoho_request(self, group_name, request_type, url, payload, _retry=True):
        """
        Make an authenticated request to the Zoho Books API.

        _retry=True  — will attempt a token refresh on 401 and retry once.
        _retry=False — already retrying after a refresh; do not loop.
        """
        headers = {
            'Authorization': f'Zoho-oauthtoken {self.access_key}',
        }
        base_params = {'organization_id': self.env_id}
        full_url = self.domain + url

        try:
            method = getattr(requests, request_type.lower())

            if request_type.lower() == 'delete':
                response = method(
                    full_url,
                    headers=headers,
                    params=base_params,
                    timeout=30,
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

        except requests.RequestException as e:
            logger.error("Zoho API network error [%s %s]: %s", request_type, url, e)
            return None

        # Token expired — refresh and retry once
        if _retry and (
            response.status_code == 401
            or response.json().get('code') == 57
        ):
            logger.warning("Zoho token expired (status %s), refreshing...", response.status_code)
            return self.refresh_access_token(group_name, request_type, url, payload)

        if not response.ok:
            logger.error(
                "Zoho API error [%s %s] status=%s body=%s",
                request_type, url, response.status_code, response.text[:500]
            )

        return response