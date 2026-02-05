import firebase_admin
from firebase_admin import credentials
import os

def initialize_firebase():
    base_path = os.path.dirname(os.path.abspath(__file__))
    cred_filename = "paindetection-d0ca2-firebase-adminsdk-fbsvc-2da0b73237.json"
    cred_path = os.path.join(base_path, cred_filename)
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        "databaseURL": "https://paindetection-d0ca2-default-rtdb.asia-southeast1.firebasedatabase.app/"
    })
