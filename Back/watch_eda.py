
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

def watch_eda():
    initialize_firebase()
    ref = db.reference("/Preprocessing/EDA")
    
    print("Waiting for EDA update...", flush=True)
    
    initial_data = ref.get()
    initial_ts = initial_data.get("Timestamp") if initial_data else None
    
    print(f"Current Timestamp: {initial_ts}")
    
    # Wait for up to 60 seconds
    for i in range(60):
        current_data = ref.get()
        current_ts = current_data.get("Timestamp") if current_data else None
        
        if current_ts != initial_ts:
            print("\n🚨 EDA UPDATED! 🚨")
            print(f"New Timestamp: {current_ts}")
            print(f"Phasic (Norm): {current_data.get('EDA_Phasic_Normalized')}")
            print(f"Tonic (Norm): {current_data.get('EDA_Tonic_Normalized')}")
            return
            
        time.sleep(2)
        sys.stdout.write(".")
        sys.stdout.flush()
    
    print("\nTimeout: No update detected in 120 seconds.")

if __name__ == "__main__":
    watch_eda()
