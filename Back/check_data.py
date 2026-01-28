
import firebase_admin
from firebase_admin import credentials, db
import os
import time

def initialize_firebase():
    # Check if already initialized to avoid error
    if not firebase_admin._apps:
        base_path = os.path.dirname(os.path.abspath(__file__))
        cred_path = os.path.join(base_path, "painproject-419f0-firebase-adminsdk-fbsvc-15c1537a76.json")
        cred = credentials.Certificate(cred_path)
        firebase_admin.initialize_app(cred, {
            "databaseURL": "https://painproject-419f0-default-rtdb.asia-southeast1.firebasedatabase.app/"
        })

def check_data():
    initialize_firebase()
    
    print("\n--- Fetching Latest Preprocessing Data from Firebase ---\n")
    
    # 1. Check EDA
    try:
        eda_ref = db.reference("/Preprocessing/EDA")
        eda_data = eda_ref.get()
        print(f"🔹 EDA Data (/Preprocessing/EDA):")
        if eda_data:
            print(eda_data)
        else:
            print("   [No data found]")
    except Exception as e:
        print(f"   [Error fetching EDA]: {e}")

    print("\n" + "-"*30 + "\n")

    # 2. Check HRV
    try:
        hrv_ref = db.reference("/Preprocessing/HRV")
        hrv_data = hrv_ref.get()
        print(f"❤️ HRV Data (/Preprocessing/HRV):")
        if hrv_data:
            print(hrv_data)
        else:
            print("   [No data found]")
    except Exception as e:
        print(f"   [Error fetching HRV]: {e}")
        
    print("\n--------------------------------------------------------\n")

if __name__ == "__main__":
    check_data()
