from email.policy import default
from Config.settings import ZOHO_DOMAIN_URL, ZOHO_ENV_ID, ZOHO_ACCESS_KEY, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
import requests
import uuid
from uuid import UUID
import random
import json
import time
from dotenv import load_dotenv
import os
class ZohoApiInterface(json.JSONEncoder):
    def __init__(self, domain=ZOHO_DOMAIN_URL, env_id=ZOHO_ENV_ID, access_key=ZOHO_ACCESS_KEY, client_id=ZOHO_CLIENT_ID, client_secret=ZOHO_CLIENT_SECRET, refresh_token=ZOHO_REFRESH_TOKEN):
        self.domain = domain
        self.env_id = env_id
        self.access_key = access_key
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token

    def refresh_access_token(self, request_type, url, payload):
        """Refresh Zoho Access Token if expired"""
        print("---------------------------- Refreshing Zoho Token...")
        data = {
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token"
        }
        response = requests.post("https://accounts.zoho.com/oauth/v2/token", data=data).json()
        print("-----------------------30", response)
        self.access_token = response["access_token"]
        self.update_access_token(response["access_token"])
        self.make_zoho_request(request_type, url, payload)
        print("✅ Token refreshed successfully!")


    def update_access_token(self, new_access_token):
        env_path = '/usr/src/app/.env'

        # Load the existing .env file into a dictionary
        with open(env_path, 'r') as f:
            lines = f.readlines()

        updated = False  # Track if we updated the key

        # Rewrite the .env file with updated value
        with open(env_path, 'w') as f:
            for line in lines:
                if line.startswith('ZOHO_ACCESS_KEY='):
                    f.write(f'ZOHO_ACCESS_KEY="{new_access_token}"\n')
                    updated = True  # Mark as updated
                    print("✅ Token updated successfully")
                else:
                    f.write(line)

            # If the key was not found, add it
            if not updated:
                f.write(f'ZOHO_ACCESS_KEY="{new_access_token}"\n')
                print("✅ Token added successfully")

        # Reload the .env file
        load_dotenv()
        print("the new token is", new_access_token)
        # Update the environment variable for the current process
        os.environ["ZOHO_ACCESS_KEY"] = new_access_token
        print("✅ Environment variable updated in memory")




    def make_zoho_request(self, request_type, url, payload):
        print("------------------------------------------------58", request_type, self.domain+url)
        print(self.access_key)
        print(self.env_id)
        method = getattr(requests, request_type)
        response = method(self.domain + url, headers={
            'Authorization': 'Zoho-oauthtoken ' + self.access_key,
        }, params={'organization_id': self.env_id})

        if (response.json()['code'] == 57):
            print("----------------------------42")
            self.refresh_access_token(request_type, url, payload)
        return response

