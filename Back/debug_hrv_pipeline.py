"""
Debug Script: จำลองการทำงานของ HRV Preprocessing ทีละขั้นตอน
เพื่อหาว่ามันหลุดตรงไหน
"""
import firebase_admin
from firebase_admin import credentials, db
import os
import json

# ===== Step 0: Init Firebase =====
print("=" * 60)
print("STEP 0: Initialize Firebase")
print("=" * 60)

if not firebase_admin._apps:
    base_path = os.path.dirname(os.path.abspath(__file__))
    cred_file = "paindetection-d0ca2-firebase-adminsdk-fbsvc-2da0b73237.json"
    cred_path = os.path.join(base_path, cred_file)
    
    if not os.path.exists(cred_path):
        print(f"❌ Credential file not found: {cred_path}")
        exit()
    
    cred = credentials.Certificate(cred_path)
    firebase_admin.initialize_app(cred, {
        "databaseURL": "https://paindetection-d0ca2-default-rtdb.asia-southeast1.firebasedatabase.app/"
    })
    print("✅ Firebase initialized.")
else:
    print("✅ Firebase already initialized.")

# ===== Step 1: Fetch ALL patients =====
print("\n" + "=" * 60)
print("STEP 1: Fetch 'patient' node")
print("=" * 60)

patients_ref = db.reference("patient")
patients_data = patients_ref.get()

if not patients_data:
    print("❌ FAILED: 'patient' node is empty or None.")
    exit()

print(f"✅ Found {len(patients_data)} patients: {list(patients_data.keys())}")

# ===== Step 2: Loop patients =====
print("\n" + "=" * 60)
print("STEP 2: Loop through each patient")
print("=" * 60)

for hn, data in patients_data.items():
    print(f"\n--- Patient: {hn} ---")
    
    if not isinstance(data, dict):
        print(f"   ❌ SKIP: data is not dict, type={type(data)}")
        continue
    
    # Step 2a: Check 'Device no'
    devices_node = data.get("Device no")
    if not isinstance(devices_node, dict):
        print(f"   ❌ SKIP: 'Device no' not found or not dict.")
        print(f"   Available keys: {list(data.keys())}")
        continue
    
    print(f"   ✅ 'Device no' found. Devices: {list(devices_node.keys())}")
    
    # Step 2b: Loop devices
    for device_id, device_content in devices_node.items():
        print(f"\n   --- Device: {device_id} ---")
        
        if not isinstance(device_content, dict):
            print(f"      ❌ SKIP: device_content is not dict, type={type(device_content)}")
            continue
        
        print(f"      Available keys: {list(device_content.keys())}")
        
        # Step 2c: Check '1 s' or '1s'
        one_sec_data = device_content.get("1 s")
        if one_sec_data:
            print(f"      ✅ Found key '1 s' (with space)")
        else:
            one_sec_data = device_content.get("1s")
            if one_sec_data:
                print(f"      ✅ Found key '1s' (no space)")
            else:
                print(f"      ❌ SKIP: Neither '1 s' nor '1s' found.")
                continue
        
        print(f"      Content of 1s: {json.dumps(one_sec_data, indent=8) if isinstance(one_sec_data, dict) else one_sec_data}")
        
        # Step 2d: Check PPG
        ppg_val = None
        if isinstance(one_sec_data, dict):
            ppg_val = one_sec_data.get("PPG")
            if ppg_val is not None:
                print(f"      ✅ PPG found: {ppg_val} (type: {type(ppg_val).__name__})")
            else:
                ppg_val = one_sec_data.get("PG")
                if ppg_val is not None:
                    print(f"      ✅ PG found (fallback): {ppg_val}")
                else:
                    print(f"      ❌ SKIP: No PPG or PG key in 1s data.")
                    continue
        else:
            print(f"      ❌ SKIP: 1s data is not dict, type={type(one_sec_data)}")
            continue
        
        # Step 2e: Try float conversion
        try:
            val_float = float(ppg_val)
            print(f"      ✅ Float conversion OK: {val_float}")
        except ValueError as e:
            print(f"      ❌ SKIP: Cannot convert PPG to float: {e}")
            continue
        
        # Step 2f: Summary
        print(f"\n      🎯 RESULT: This device CAN be processed for HRV!")
        print(f"         Path: patient/{hn}/Device no/{device_id}/1s/PPG")
        print(f"         Value: {val_float}")
        print(f"         Buffer needs: 600 points (WINDOW_SIZE)")
        print(f"         At 1 read/sec polling: ~600 seconds (10 min) to fill buffer")
        print(f"         At 10Hz real data: ~60 seconds (1 min) to fill buffer")

print("\n" + "=" * 60)
print("DEBUG COMPLETE")
print("=" * 60)
