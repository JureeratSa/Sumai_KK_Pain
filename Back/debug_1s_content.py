
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

def debug_1s_structure():
    print("🔍 Fetching '1s' node content for HN001...")
    # Direct path to the Device showing issues
    ref = db.reference("patient/HN001/Device no/MD-V5-0000804")
    data = ref.get()
    
    if not data:
        print("❌ Device node is empty or None.")
        return

    print(f"✅ Device Data Found. Keys: {list(data.keys())}")
    
    # Check 1s
    one_sec = data.get("1s")
    if not one_sec:
         one_sec = data.get("1 s") # Try with space
    
    if not one_sec:
        print("❌ '1s' node is MISSING (Wait, screenshot showed it exists!)")
        return

    print(f"\n📄 Content of '1s':")
    print(json.dumps(one_sec, indent=4))
    
    # Analyze PPG specifically
    ppg = one_sec.get("PPG")
    if not ppg:
        ppg = one_sec.get("PG")
    
    print(f"\n🔎 PPG Value Check:")
    if ppg is None:
        print("❌ PPG Key is MISSING inside 1s")
    else:
        print(f"✅ PPG Key Found: {ppg}")
        print(f"   Type: {type(ppg)}")

if __name__ == "__main__":
    if initialize_firebase():
        debug_1s_structure()
