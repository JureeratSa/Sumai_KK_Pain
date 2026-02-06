import firebase_admin
from firebase_admin import credentials
import os

def initialize_firebase():
    import json
    
    # Check for Env Var first (For Render/Cloud Deployment)
    firebase_creds_json = os.environ.get("FIREBASE_CREDENTIALS_JSON")
    
    if firebase_creds_json:
        # Load from Env String
        cred_dict = json.loads(firebase_creds_json)
        cred = credentials.Certificate(cred_dict)
    else:
        # Fallback to local file (For Local Development)
        base_path = os.path.dirname(os.path.abspath(__file__))
        cred_filename = "paindetection-d0ca2-firebase-adminsdk-fbsvc-2da0b73237.json"
        cred_path = os.path.join(base_path, cred_filename)
        cred = credentials.Certificate(cred_path)

    firebase_admin.initialize_app(cred, {
        "databaseURL": "https://paindetection-d0ca2-default-rtdb.asia-southeast1.firebasedatabase.app/"
    })
