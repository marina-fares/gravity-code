import logging

import requests
from requests.exceptions import RequestException

from Config.settings import BOOKEO_API_KEY, BOOKEO_API_URL, BOOKEO_API_SECRET

logger = logging.getLogger(__name__)

# FIX N: Default timeout for all Bookeo API calls.
REQUEST_TIMEOUT = 30


class BookeoApiInterface:

    def __init__(self, url=BOOKEO_API_URL, key=BOOKEO_API_KEY, secret_key=BOOKEO_API_SECRET):
        self.url = url
        # key and secret_key are per-user — read from user.profile at call time.

    def make_bookeo_request(self, request_type, url, payload, user):
        """
        Make an authenticated request to the Bookeo API.

        FIX N: Added timeout=REQUEST_TIMEOUT and try/except RequestException
        so a slow or unreachable Bookeo doesn't block the worker indefinitely
        and doesn't surface as an unhandled exception with a stack trace.
        """
        method = getattr(requests, request_type.lower(), None)
        if method is None:
            logger.error("bookeo_interface: unknown request_type '%s'", request_type)
            return None

        params = {
            'apiKey': user.profile.bookeo_api_key,
            'secretKey': user.profile.bookeo_secrete,
        }

        try:
            if request_type.lower() == 'get':
                params.update(payload)
                response = method(
                    self.url + url,
                    params=params,
                    timeout=REQUEST_TIMEOUT,
                )
            else:
                response = method(
                    self.url + url,
                    params=params,
                    json=payload,
                    timeout=REQUEST_TIMEOUT,
                )
        except RequestException as exc:
            logger.error("Bookeo API network error [%s %s]: %s", request_type, url, exc)
            return None

        if not response.ok:
            logger.error(
                "Bookeo API error [%s %s] status=%s body=%s",
                request_type, url, response.status_code, response.text[:500],
            )

        return response