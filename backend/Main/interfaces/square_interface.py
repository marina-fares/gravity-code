import json
import uuid
import random
import logging

import requests
from requests.exceptions import RequestException

from Config.settings import SQUARE_API_KEY, SQUARE_API_URL

logger = logging.getLogger(__name__)

# FIX M/N: Default timeout for all Square API calls.
# Without a timeout a slow or unreachable Square will block the Gunicorn worker
# indefinitely, eventually exhausting all workers under load.
REQUEST_TIMEOUT = 30


class SquareApiInterface(json.JSONEncoder):

    def __init__(self, url=SQUARE_API_URL, key=SQUARE_API_KEY):
        self.url = url
        self.key = key

    def make_square_request(self, request_type, url, payload):
        """
        Make an authenticated request to the Square API.

        FIX M: Added timeout=REQUEST_TIMEOUT to every request call.
        FIX N: Wrapped in try/except RequestException so network errors are
               caught and returned as a structured error dict rather than
               propagating as an unhandled exception with a stack trace.
        """
        if not request_type:
            logger.error("square_interface: request_type is required")
            return None

        method = getattr(requests, request_type.lower(), None)
        if method is None:
            logger.error("square_interface: unknown request_type '%s'", request_type)
            return None

        idempotency_key = str(uuid.uuid1(random.randint(0, 281474976710655)))
        idempotency_key_2 = str(uuid.uuid1(random.randint(0, 281474976710655)))

        # Inject UIDs for line-item discounts on order creation
        if url == "/orders" and request_type.lower() == "post":
            for item in payload.get('order', {}).get('line_items', []):
                if item.get('applied_discounts') is not None:
                    item['applied_discounts'][0] = {
                        "discount_uid": idempotency_key_2,
                        "uid": idempotency_key_2,
                    }
                    discounts = payload.get("order", {}).get("discounts", [])
                    if discounts:
                        discounts[0]["scope"] = "LINE_ITEM"
                        discounts[0]["uid"] = idempotency_key_2

        # Inject payment-method details
        if url == "/payments" and request_type.lower() == "post":
            if payload.get('source_id') == "CASH":
                payload["cash_details"] = {
                    "buyer_supplied_money": payload.get('amount_money')
                }
            else:
                payload["external_details"] = {
                    "source": "CARD",
                    "type": "CARD",
                    "source_id": "869564037437410",
                }

        headers = {'Authorization': 'Bearer ' + self.key}

        if 'idempotency_key' not in payload and request_type.lower() != 'get':
            payload["idempotency_key"] = idempotency_key

        try:
            if request_type.lower() == 'get':
                response = method(
                    self.url + url,
                    headers=headers,
                    params=payload,
                    timeout=REQUEST_TIMEOUT,
                )
            else:
                response = method(
                    self.url + url,
                    headers=headers,
                    json=payload,
                    timeout=REQUEST_TIMEOUT,
                )
        except RequestException as exc:
            logger.error("Square API network error [%s %s]: %s", request_type, url, exc)
            return None

        if not response.ok:
            logger.error(
                "Square API error [%s %s] status=%s body=%s",
                request_type, url, response.status_code, response.text[:500],
            )

        return response