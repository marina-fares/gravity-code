from email.policy import default
from Config.settings import SQUARE_API_KEY, SQUARE_API_URL
import requests
import uuid
from uuid import UUID
import random
import json


class SquareApiInterface(json.JSONEncoder):
    def __init__(self, url=SQUARE_API_URL, key=SQUARE_API_KEY):
        self.url = url
        self.key = key

    def make_square_request(self, request_type, url, payload):
        method = getattr(requests, request_type)
        idempotency_key = uuid.uuid1(random.randint(0, 281474976710655))
        idempotency_key_2 = str(idempotency_key)
        idempotency_key_3 = uuid.uuid1(random.randint(0, 281474976710655))
        idempotency_key_4 = str(idempotency_key)
        #print("111111111111111111111111111111111111111111111idempotency_key")
        # print(type(idempotency_key))
        # print(type(idempotency_key_2))
        # print(self.url + url)
        # print(self.key)
        
        if url == "/orders" and request_type == "post":
            for i in payload.get('order').get('line_items'):
                if i.get('applied_discounts') is None:
                    pass
                else:
                    print("yessssssssssssssssssssssss")
                    print(i.get('applied_discounts')) 
                    i.get('applied_discounts')[0] = {"discount_uid": idempotency_key_4 , "uid": idempotency_key_4}
                    payload.get("order").get("discounts")[0]["scope"] = "LINE_ITEM"
                    payload.get("order").get("discounts")[0]["uid"] = idempotency_key_4
                    print(payload)
        if url == "/payments" and request_type=="post":

            b = {"cash_details": {
                "buyer_supplied_money": payload.get('amount_money')}}
            c = {"external_details":{
                        "source": "CARD",
                        "type": "CARD",
                        "source_id":"869564037437410"
                }}
            
            if payload.get('source_id') == "CASH":
                # payload = dict(payload.items() + b.items())
                # print("3333333333333333333333333333333333")
                # print(payload)
                payload.update(b)
            else:
                payload.update(c)
        
        if request_type == 'get':
            response = method(self.url + url, headers={
                'Authorization': 'Bearer ' + self.key,
            }, params=payload)
        else:
            # payload.idempotency_key
            if 'idempotency_key' not in payload:
                payload["idempotency_key"] = idempotency_key_2
            response = method(self.url + url, headers={
                'Authorization': 'Bearer ' + self.key,
            }, json=payload)

        #print(response.json())
        return response

