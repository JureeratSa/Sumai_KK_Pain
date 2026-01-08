
import firebase_admin
from firebase_admin import credentials, db
import os
import time
import sys

def initialize_firebase():
    if not firebase_admin._apps:
        base_path = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_path, "painproject-419f0-firebase-adminsdk-fbsvc-15c1537a76.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://painproject-419f0-default-rtdb.asia-southeast1.firebasedatabase.app/"
        })

def watch_prediction():
    initialize_firebase()
    ref = db.reference("/Predictions/Data/Latest")
    
    print("Waiting for Prediction update...", flush=True)
    
    initial_data = ref.get()
    initial_ts = initial_data.get("timestamp") if initial_data else None
    
    print(f"Current Timestamp: {initial_ts}")
    
    # Wait for up to 90 seconds (since interval is 1 min)
    for i in range(90):
        current_data = ref.get()
        current_ts = current_data.get("timestamp") if current_data else None
        
        if current_ts != initial_ts:
            print("\n🔮 PREDICTION UPDATED! 🔮")
            print(f"New Timestamp: {current_ts}")
            print(f"Pain Level: {current_data.get('PainLevel')}")
            print(f"EDA: {current_data.get('EDA')}")
            print(f"PPG (LF/HF): {current_data.get('PPG')}")
            return
            
        time.sleep(2)
        sys.stdout.write(".")
        sys.stdout.flush()
    
    print("\nTimeout: No update detected in 90 seconds.")

if __name__ == "__main__":
    watch_prediction()
