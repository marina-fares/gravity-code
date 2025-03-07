import re
from Config.settings import BOOKEO_API_KEY, BOOKEO_API_URL, BOOKEO_API_SECRET
import requests
import json


class BookeoApiInterface():
    def __init__(self, url=BOOKEO_API_URL, key=BOOKEO_API_KEY, secret_key=BOOKEO_API_SECRET):
        self.url = url

    def make_bookeo_request(self, request_type, url, payload, user):


        method = getattr(requests, request_type)
        params = {
            'apiKey': user.profile.bookeo_api_key,
            'secretKey': user.profile.bookeo_secrete,
        }

        if request_type == 'get':
            params.update(payload)
            response = method(self.url + url, params=params)

        elif request_type == 'post':
            response = method(self.url + url, params=params, json=payload)

        elif request_type == 'delete':
            response = method(self.url + url, params=params, json=payload)

        return response
