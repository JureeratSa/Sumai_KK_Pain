
import firebase_admin
from firebase_admin import credentials, db
import os
import json

def initialize_firebase():
    if not firebase_admin._apps:
        base_path = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_path, "painproject-419f0-firebase-adminsdk-fbsvc-15c1537a76.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://painproject-419f0-default-rtdb.asia-southeast1.firebasedatabase.app/"
        })

def check_structure():
    initialize_firebase()
    
    print("\n--- Checking Device Data Path ---\n")
    
    path = "/Device/Inpatient/MD-V5-0000804"
    ref = db.reference(path)
    # Get shallow to see keys
    data = ref.get(shallow=False) 
    
    if data:
        print(f"Data at {path}:")
        # Print keys or structure
        print(json.dumps(data, indent=2)[:500] + "...") # Print first 500 chars
    else:
        print("No data found at root path.")

if __name__ == "__main__":
    check_structure()
