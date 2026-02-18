import firebase_admin
from firebase_admin import credentials, db
import os
import time
import random
import json

# CONFIG
HN_TARGET = "HN001"
DEVICE_TARGET = "MD-V5-001"
DB_URL = "https://paindetection-d0ca2-default-rtdb.asia-southeast1.firebasedatabase.app/"
CRED_FILE = "paindetection-d0ca2-firebase-adminsdk-fbsvc-2da0b73237.json"

def initialize_firebase():
    if not firebase_admin._apps:
        base_path = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_path, CRED_FILE)
        
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": DB_URL
        })

def simulate_hrv_history():
    print(f"🚀 Starting HRV History Simulation for {HN_TARGET}...")
    
    # Generate data for the last 60 minutes (1 hour)
    HISTORY_POINTS = 60 
    current_time_ms = int(time.time() * 1000)
    
    # Path: patient/{HN}/Device no/{DEVICE_ID}/preprocessing/HRV_History
    ref_path = f"patient/{HN_TARGET}/Device no/{DEVICE_TARGET}/preprocessing/HRV_History"
    print(f"📍 Writing to: {ref_path}")
    
    ref_history = db.reference(ref_path)
    
    # Prepare update object
    data_to_push = {}
    
    for i in range(HISTORY_POINTS):
        # Go back 'i' minutes
        ts = current_time_ms - ((HISTORY_POINTS - i) * 60 * 1000)
        
        # Simulate Trend: Start low (0.4), rise to peak (0.8) at mid, drop down
        # Sine wave period of ~30 mins
        trend = (i / HISTORY_POINTS) * 3.14 * 2 # 0 to 2pi
        val = 0.5 + (0.2 * abs(random.uniform(-0.5, 0.5))) # Base noise
        val += 0.2 * (i / HISTORY_POINTS) # Linear trend upward
        
        # Clean 0-1
        val = max(0.1, min(0.9, val))
        
        data_to_push[str(ts)] = {
            "LF_HF_ratio_Normalized": val,
            "Heart_Rate": random.uniform(70, 95),
            "Timestamp": time.strftime('%Y-%m-%d %H:%M:%S', time.localtime(ts/1000))
        }
    
    # Update Firebase
    ref_history.update(data_to_push)
    print(f"✅ Successfully added {HISTORY_POINTS} points of Mock HRV History!")
    print("🔄 Refresh your frontend to see the line graph.")

if __name__ == "__main__":
    initialize_firebase()
    simulate_hrv_history()
