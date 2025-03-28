from Config.settings import ZOHO_DOMAIN_URL, ZOHO_ENV_ID, ZOHO_ACCESS_KEY, ZOHO_CLIENT_ID, ZOHO_CLIENT_SECRET, ZOHO_REFRESH_TOKEN
import requests
import json
import time
import os
from dotenv import load_dotenv

class ZohoApiInterface(json.JSONEncoder):
    def __init__(self, domain=ZOHO_DOMAIN_URL, env_id=ZOHO_ENV_ID, access_key=ZOHO_ACCESS_KEY, client_id=ZOHO_CLIENT_ID, client_secret=ZOHO_CLIENT_SECRET, refresh_token=ZOHO_REFRESH_TOKEN):
        self.domain = domain
        self.env_id = env_id
        self.access_key = access_key
        self.client_id = client_id
        self.client_secret = client_secret
        self.refresh_token = refresh_token

    def refresh_access_token(self, group_name, request_type, url, payload):
        """Refresh Zoho Access Token if expired"""
        print("🔄 Refreshing Zoho Token...")
        data = {
            "refresh_token": self.refresh_token,
            "client_id": self.client_id,
            "client_secret": self.client_secret,
            "grant_type": "refresh_token"
        }
        response = requests.post("https://accounts.zoho.com/oauth/v2/token", data=data).json()
        
        if "access_token" in response:
            new_token = response["access_token"]
            self.update_access_token(new_token)
            print("✅ Token refreshed successfully!")
            return self.make_zoho_request(group_name, request_type, url, payload)
        else:
            print("❌ Failed to refresh token:", response)
            return None

    def update_access_token(self, new_access_token):
        """Update the access token in the .env file and reload it"""
        env_path = '/usr/src/app/.env'

        with open(env_path, 'r') as f:
            lines = f.readlines()

        updated = False

        with open(env_path, 'w') as f:
            for line in lines:
                if line.startswith('ZOHO_ACCESS_KEY='):
                    f.write(f'ZOHO_ACCESS_KEY="{new_access_token}"\n')
                    updated = True
                else:
                    f.write(line)
            if not updated:
                f.write(f'ZOHO_ACCESS_KEY="{new_access_token}"\n')

        time.sleep(1)  # Ensure changes are saved
        os.sync()

        load_dotenv(override=True)  # Reload .env variables
        self.access_key = os.getenv("ZOHO_ACCESS_KEY")  # Update class attribute
        os.environ["ZOHO_ACCESS_KEY"] = new_access_token  # Update system env variable

        print("✅ Token updated successfully:", new_access_token)

    def make_zoho_request(self, group_name, request_type, url, payload):
        """Make an API request to Zoho"""
        self.access_key = os.getenv("ZOHO_ACCESS_KEY")  # Ensure we use the updated token
        print("🔄 Using Access Token:", self.access_key)
        
        method = getattr(requests, request_type)

        if request_type == 'delete':
            response = method(self.domain + url, headers={
                'Authorization': 'Zoho-oauthtoken ' + self.access_key,
            }, params={
                'organization_id': self.env_id,
            })
            print("urllllllllllllllll", self.domain + url)
        if url == "/items":
            response = method(self.domain + url, headers={
                'Authorization': 'Zoho-oauthtoken ' + self.access_key,
            }, params={
                'organization_id': self.env_id,
                'search_text': 'description',
                'description_contains': group_name
            })
        else:
            print("this is the post request payload = ", payload)
            response = method(self.domain + url, headers={
                'Authorization': 'Zoho-oauthtoken ' + self.access_key,
            }, params={
                'organization_id': self.env_id,
            }, json = payload)    
        
        if response.status_code == 401 or response.json().get('code') == 57:
            print("⚠️ Token expired, attempting refresh...")
            return self.refresh_access_token(group_name, request_type, url, payload)
        
        return response
