
import firebase_admin
from firebase_admin import credentials, db
import os
import json

# Initialize Firebase Logic matching your project config
def initialize_firebase():
    if not firebase_admin._apps:
        base_path = os.path.dirname(os.path.abspath(__file__))
        cred_filename = "paindetection-d0ca2-firebase-adminsdk-fbsvc-2da0b73237.json"
        
        # Check if credential exists
        if not os.path.exists(os.path.join(base_path, cred_filename)):
             # Fallback if needed
             print(f"⚠️ Credential file {cred_filename} not found in {base_path}")
             return False
        
        cred_path = os.path.join(base_path, cred_filename)
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://paindetection-d0ca2-default-rtdb.asia-southeast1.firebasedatabase.app/" 
        })
        return True
    return True

def debug_structure():
    print("🔍 Fetching 'patient' node structure...")
    ref = db.reference("patient")
    data = ref.get()
    
    if not data:
        print("❌ 'patient' node is empty or None.")
        return

    print(f"✅ Found {len(data)} patients.")
    
    for hn, p_data in data.items():
        print(f"\n--- Patient: {hn} ---")
        if not isinstance(p_data, dict):
            print("   (Not a dict)")
            continue
            
        print(f"   Keys: {list(p_data.keys())}")
        
        # Check Device no
        devices = p_data.get("Device no")
        if not devices:
            print("   ⚠️ No 'Device no' key found.")
            # Check for typos
            for k in p_data.keys():
                if "evic" in k:
                    print(f"      Did you mean '{k}'?")
            continue
            
        print(f"   'Device no' found. Devices: {list(devices.keys())}")
        
        for dev_id, dev_data in devices.items():
            print(f"      Device: {dev_id}")
            print(f"      Keys: {list(dev_data.keys())}")
            
            # Check 1 s
            one_sec = dev_data.get("1 s")
            if not one_sec:
                 print("      ⚠️ No '1 s' key found.")
                 # Check for 1s typo
                 if dev_data.get("1s"): print("         Found '1s' instead (typo?)")
                 continue
                 
            print(f"      '1 s' found. Value: {one_sec}")
            
            # Check PPG
            ppg = one_sec.get("PPG")
            if ppg is None:
                print("         ⚠️ No 'PPG' key found inside '1 s'.")
            else:
                print(f"         ✅ PPG found: {ppg}")

if __name__ == "__main__":
    if initialize_firebase():
        debug_structure()
