from config import initialize_firebase
from firebase_admin import db
from datetime import datetime
import time
from apscheduler.schedulers.background import BackgroundScheduler

initialize_firebase()
scheduler = BackgroundScheduler()


# --------------------------------- GET ---------------------------------#
def predict_data_AVG1M():  # real

    firebase_data = db.reference("/Device/Inpatient/MD-V5-0000804/1min")
    input_data = firebase_data.get()

    if not input_data:
        EDA_value = None
    else:
        EDA_value = float(input_data["EDA"])

    if not input_data:
        PPG_value = None
    else:
        PPG_value = float(input_data["PPG"])

    if not input_data:
        ST_value = None
    else:
        ST_value = float(input_data["ST"])

    firebase_BMI = db.reference("/Patients/Data")
    input_data_BMI = firebase_BMI.get()

    if not input_data_BMI:
        BMI_value = None
    else:
        latest_key_BMI = max(input_data_BMI.keys())
        BMI_value = float(input_data_BMI[latest_key_BMI]["BMI"])

    return {
        "EDA": EDA_value,
        "PPG": PPG_value,
        "ST": ST_value,
        "BMI": BMI_value
    }


def predict_patient_data(hn):
    """
    ดึงข้อมูลสำหรับ Predict ของ Patient คนนั้นๆ จาก Path ใหม่
    Path: patient/{hn}/...
    """
    try:
        ref = db.reference(f"patient/{hn}")
        patient_data = ref.get()

        if not patient_data:
            return None

        # 1. Device Data Path
        device_data = patient_data.get("Device no", {})
        
        # ---------------------------------------------------
        # 1. EDA (From Preprocessing)
        # ---------------------------------------------------
        eda_pre = device_data.get("preprocessing", {}).get("EDA", {})
        eda_value = float(eda_pre.get("EDA_Tonic_Normalized", 0))

        # ---------------------------------------------------
        # 2. HRV (From Preprocessing)
        # ---------------------------------------------------
        hrv_pre = device_data.get("preprocessing", {}).get("HRV", {})
        # Note: Using the Normalized LF/HF ratio as main feature
        hrv_value = float(hrv_pre.get("LF_HF_ratio_Normalized", 0))

        # ---------------------------------------------------
        # 3. ST (From 1 min data usually, or 1s)
        # ---------------------------------------------------
        # Checking '1 min' first as per old logic
        onemin_data = device_data.get("1 min", {})
        st_value = float(onemin_data.get("ST", 0))
        
        # If not in 1 min, try 1 s? (Optional fallback)
        if st_value == 0:
            ones_data = device_data.get("1 s", {})
            st_value = float(ones_data.get("ST", 0))

        # ---------------------------------------------------
        # 4. BMI (From Patient Record)
        # ---------------------------------------------------
        bmi_value = float(patient_data.get("BMI", 0))

        return {
            "EDA_Tonic_Normalized": eda_value,
            "LF_HF_ratio_Normalized": hrv_value,
            "ST": st_value,
            "BMI": bmi_value,
            "HN": hn
        }

    except Exception as e:
        print(f"Error fetching predict data for {hn}: {e}")
        return {
            "EDA_Tonic_Normalized": 0,
            "LF_HF_ratio_Normalized": 0,
            "ST": 0,
            "BMI": 0,
            "HN": hn
        }


def predict():
    """
    Function เดิม (อาจจะถูกเรียกจาก API) -> ปรับให้ดึงของคนล่าสุดหรือระบุคน
    ในที่นี้ขอปรับให้ดึงของ 'HN001' (Example) หรือคนที่เพิ่ง Active
    หรือคืนค่าว่างไปก่อนถ้าไม่ระบุ HN
    """
    # NOTE: เพื่อให้ API เดิมยังทำงานได้ (ถ้ามีการเรียกใช้)
    # เราอาจจะต้องหา logic เลือก HN. 
    # แต่ตอนนี้ขอ Hardcode Test HN ไปก่อนครับ
    return predict_patient_data("HN001") # <--- HARDCODED FOR TESTING



# def predict_data_AVG5M(patient_id):

#     firebase_patient_path = f"/Patients/Data/{patient_id}"
#     patient_data = db.reference(firebase_patient_path).get()

#     if not patient_data or "DeviceID" not in patient_data:
#         return {"error": "DeviceID not found"}

#     device_id = patient_data["DeviceID"]

#     firebase_data_path = f"/Device/Inpatient/{device_id}/5min"
#     firebase_data = db.reference(firebase_data_path).get()

#     if not firebase_data:
#         EDA_value = None
#         PPG_value = None
#         ST_value = None
#     else:
#         EDA_value = float(firebase_data.get("EDA", None))
#         PPG_value = float(firebase_data.get("PPG", None))
#         ST_value = float(firebase_data.get("ST", None))

#     firebase_BMI_path = f"/Patients/Data/{patient_id}"
#     patient_data = db.reference(firebase_BMI_path).get()

#     if not patient_data:
#         BMI_value = None
#     else:
#         BMI_value = float(patient_data["BMI"]) if "BMI" in patient_data else None

#     return {
#         "EDA": EDA_value,
#         "PPG": PPG_value,
#         "ST": ST_value,
#         "BMI": BMI_value,
#         "DeviceID": device_id
#     }

# --------------------------------- SAVE ---------------------------------#

# --------------------------------- DOCTOR ---------------------------------#

def save_doctor_data(doctor_id, name, specialist):
    ref = db.reference(f"Doctor/{doctor_id}")
    ref.update({
        "doctor_id": doctor_id,
        "name": name,
        "specialist": specialist
    })
    print(f"✅ Doctor {name} ({doctor_id}) registered.")

def assign_patient_to_doctor(doctor_id, hn):
    # 1. Update Patient
    p_ref = db.reference(f"patient/{hn}")
    p_ref.update({"Doctor_ID": doctor_id})

    # 2. Update Doctor's Patient List
    d_ref = db.reference(f"Doctor/{doctor_id}/Patients")
    d_ref.update({hn: True})
    
    print(f"✅ Assigned {hn} to Doctor {doctor_id}")

def get_doctor_patient_list(doctor_id):
    # Get Doctor Info
    doc_ref = db.reference(f"Doctor/{doctor_id}")
    doc_data = doc_ref.get()
    
    if not doc_data:
        return None
        
    patients_node = doc_data.get("Patients", {})
    patient_list = []
    
    # Fetch details for each patient
    for hn in patients_node.keys():
        p_data = db.reference(f"patient/{hn}").get()
        if p_data:
            patient_list.append(p_data)
            
    return {
        "doctor_name": doc_data.get("name", "Unknown"),
        "total_patients": len(patient_list),
        "patients_list": patient_list
    }

# --------------------------------- SYNC / BRIDGE ---------------------------------#
def sync_legacy_device_data():
    """
    Bridge function: Moves data from old Device path to new Patient path with Device ID nesting
    Target: patient/HN001/Device no/MD-V5-0000804/1 s
    """
    try:
        # 1. Read from Legacy Device Path
        legacy_device_id = "MD-V5-0000804"
        legacy_ref = db.reference(f"/Device/Inpatient/{legacy_device_id}")
        data = legacy_ref.get()
        
        if data:
            current_ts_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")

            # 2. Add Timestamp to specific paths if they exist
            # Paths: /1min, /1s, /5min
            # Checking common key formats (with/without space)
            for key in ["1min", "1 min", "1s", "1 s", "5min", "5 min"]:
                if key in data and isinstance(data[key], dict):
                    data[key]["timestamp"] = current_ts_str

            # 3. Write to New Patient Path (Nested under Device ID)
            target_hn = "HN001"
            new_path_base = f"patient/{target_hn}/Device no/{legacy_device_id}" 
            new_path_ref = db.reference(new_path_base)
            new_path_ref.update(data)
            
            # 4. Log EDA, PPG every 1 sec to /data
            # Assuming this function runs every 1 sec (controlled by scheduler)
            # Extract data from '1s' node preferably
            source_1s = data.get("1 s") or data.get("1s") or {}
            
            eda_val = source_1s.get("EDA")
            ppg_val = source_1s.get("PPG")

            # Fallback to root or 1min if 1s is missing (optional)
            if eda_val is None: eda_val = data.get("EDA")
            if ppg_val is None: ppg_val = data.get("PPG")

            if eda_val is not None and ppg_val is not None:
                log_ref = db.reference(f"{new_path_base}/data")
                # Use Unix timestamp as key for easy sorting/querying
                log_key = str(int(time.time()))
                
                log_entry = {
                    "EDA": eda_val,
                    "PPG": ppg_val,
                    "timestamp": current_ts_str
                }
                log_ref.child(log_key).set(log_entry)

                # 5. Data Retention: Delete data older than 1 week 1 day (8 days)
                # 8 days = 8 * 24 * 3600 seconds
                retention_seconds = 8 * 24 * 3600
                cutoff_timestamp = int(time.time()) - retention_seconds
                
                # Query items with key <= cutoff_timestamp
                # Using order_by_key (lexicographical, works for same-length timestamps)
                old_logs = log_ref.order_by_key().end_at(str(cutoff_timestamp)).get()
                
                if old_logs:
                    for k in old_logs:
                        log_ref.child(k).delete()
                    # print(f"Cleaned up {len(old_logs)} old log entries.")
            
            # print(f"Synced Device {legacy_device_id} to {target_hn}")
            
    except Exception as e:
        print(f"Sync Error: {e}")

# --------------------------------- SAVE ---------------------------------#

def save_patient_data(hn, name, age, gender, blood_group, height, weight, bmi, service_location, admission_date, bad_no, device_no):
    # Base Path: patient/{HN}
    ref = db.reference(f"patient/{hn}")
    
    patient_data = {
        "HN": hn,
        "name": name,
        "Age": age,
        "Gender": gender,
        "Blood group": blood_group,
        "Heigh": height,
        "Weight": weight,
        "BMI": bmi,
        "Service Location": service_location,
        "Admission Date": admission_date,
        "Bad no": bad_no,
        "Assigned_Device_ID": device_no
    }

def all_patient(hn, name, age, gender, blood_group, height, weight, bmi, service_location, admission_date, bad_no=None, device_no=None):
    # Base Path: Allpatients/{HN}
    ref = db.reference(f"Allpatients/{hn}")

    patient_data = {
        "HN": hn,
        "name": name,
        "Age": age,
        "Gender": gender,
        "Blood group": blood_group,
        "Heigh": height,
        "Weight": weight,
        "BMI": bmi,
        "Service Location": service_location,
        "Admission Date": admission_date
    }
    
    if bad_no:
        patient_data["Bad no"] = bad_no
    
    if device_no:
        patient_data["Assigned_Device_ID"] = device_no

    ref.update(patient_data)
    print(f"Saved patient data for HN: {hn} at path /Allpatients/{hn}")

def save_prediction_to_patient(hn, device_id, pain_level, eda, lf_hf, st, bmi, timestamp):
    """
    Save prediction result to the new Patient-centric structure
    Path: patient/{hn}/Device no/{device_id}/predict
    """
    # 1. Check previous state for transition logging
    predict_path = f"patient/{hn}/Device no/{device_id}/predict"
    ref = db.reference(predict_path)
    current_data = ref.get()
    
    prev_pain = 0
    if current_data and isinstance(current_data, dict):
        current_val = current_data.get("painlevel")
        if current_val is not None:
             prev_pain = int(current_val)
    
    predict_data = {
        "timestamp": timestamp,
        "painlevel": pain_level,
        "BMI": bmi,
        "EDA_tonic": eda,
        "PPG_Hrv": lf_hf,
        "ST": st
    }
    
    # 2. Log to history if transition to Pain (1) from Non-Pain (or if forced refresh on 1? Let's stick to transition for now to avoid duplicates)
    if int(pain_level) == 1 and prev_pain != 1:
         history_ref = db.reference(f"patient/{hn}/Device no/{device_id}/prediction_history")
         history_ref.push(predict_data)
         print(f"📜 Added to Pain History for {hn}")
    ref.update(predict_data)
    # print(f"✅ Prediction Saved for {hn} ({device_id}): Pain Level {pain_level}")


def predict_patient_data(hn):
    """
    Fetch data for Predict from Patient Path
    scans for the valid Device ID under 'Device no'
    """
    try:
        ref = db.reference(f"patient/{hn}")
        patient_data = ref.get()

        if not patient_data or not isinstance(patient_data, dict):
            return None

        # 1. Access 'Device no'
        devices_node = patient_data.get("Device no", {})
        if not isinstance(devices_node, dict):
            return None
            
        # 2. Find first available Device ID
        target_device_id = None
        device_data = {}
        
        for dev_id, dev_content in devices_node.items():
            if isinstance(dev_content, dict):
                target_device_id = dev_id
                device_data = dev_content
                break # Take the first one for now
        
        if not target_device_id:
            return None

        # 3. Get Preprocessing Data
        eda_pre = device_data.get("preprocessing", {}).get("EDA", {})
        eda_value = float(eda_pre.get("EDA_Tonic_Normalized", 0))

        hrv_pre = device_data.get("preprocessing", {}).get("HRV", {})
        hrv_value = float(hrv_pre.get("LF_HF_ratio_Normalized", 0))

        # 4. Get ST Data (1 min or 1 s)
        onemin_data = device_data.get("1 min", {})
        st_value = float(onemin_data.get("ST", 0))
        
        if st_value == 0:
            ones_data = device_data.get("1 s", {})
            st_value = float(ones_data.get("ST", 0))

        # 5. Get BMI
        bmi_value = float(patient_data.get("BMI", 0))

        return {
            "EDA_Tonic_Normalized": eda_value,
            "LF_HF_ratio_Normalized": hrv_value,
            "ST": st_value,
            "BMI": bmi_value,
            "HN": hn,
            "DeviceID": target_device_id
        }

    except Exception as e:
        print(f"Error fetching predict data for {hn}: {e}")
        return None


def save_predict_AVG1M_to_firebase(Predicted_data, EDA_data, PPG_data, ST_data, BMI_data, timestamp_data):
    # Backward compatibility wrapper or Deprecated
    # หากมีการเรียกใช้ตัวเดิม ให้บันทึกลง Root Predictions เหมือนเดิมไปก่อน
    # หรือจะ Redirect ไปหา HN001 ก็ได้ แต่สร้างแยกดีกว่า
    firebase = db.reference('/Predictions/Data')
    data = firebase.get()

    if data:
        existing_id = list(data.keys())[0]
    else:
        existing_id = "Latest"

    firebase.child(existing_id).update({
        "PainLevel": Predicted_data,
        "EDA": EDA_data,
        "PPG": PPG_data,
        "ST": ST_data,
        "BMI": BMI_data,
        "timestamp": timestamp_data
    })

    print("------------------------------------------------------------------------------------------------")
    print("Data updated for |5M| successfully in Firebase Realtime Database")
    print("------------------------------------------------------------------------------------------------")


# def save_predict_to_firebase(Predicted_data, EDA_data, PPG_data, ST_data, BMI_data, timestamp_data, Device_data):
#     firebase = db.reference('/Predictions/Data')
#     data = firebase.get()

#     #เช็ค id ที่มี DeviceID ตรงกับข้อมูลที่ส่งมา
#     existing_id = None
#     if data:
#         for key, value in data.items():
#             if value.get("DeviceID") == Device_data:
#                 existing_id = key
#                 break

#     if existing_id:

#         firebase.child(existing_id).update({
#             "Predicted_class": Predicted_data,
#             "EDA": EDA_data,
#             "PPG": PPG_data,
#             "ST": ST_data,
#             "BMI": BMI_data,
#             "timestamp": timestamp_data,
#             "DeviceID": Device_data
#         })
#     else:

#         if data:
#             last_id = max(int(item) for item in data.keys())
#             new_id = f"{last_id + 1:03d}"
#         else:
#             new_id = "001"

#         firebase.child(new_id).set({
#             "Predicted_class": Predicted_data,
#             "EDA": EDA_data,
#             "PPG": PPG_data,
#             "ST": ST_data,
#             "BMI": BMI_data,
#             "timestamp": timestamp_data,
#             "DeviceID": Device_data
#         })

# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def scheduler_update_database_prediction_1HR():
    try:
        latest_prediction_firebase_data = db.reference('Predictions/Data/Latest')
        latest_prediction_data = latest_prediction_firebase_data.get()

        # latest_hr_data = connect_firebase.child('Device/Inpatient/MD-V5-0000804/1min').get()

        # if latest_hr_data:
        #     hr_value = latest_hr_data.get('HeartRate', None)
        #     hr_value = float(hr_value) if hr_value not in [None, 'N/A'] else None
        # else:
        #     hr_value = None

        if latest_prediction_data:

            eda_value = latest_prediction_data.get('EDA', None)
            ppg_value = latest_prediction_data.get('PPG', None)
            st_value = latest_prediction_data.get('ST', None)
            painLevel_value = latest_prediction_data.get('PainLevel', None)

            eda_value = float(eda_value) if eda_value not in [None, 'N/A'] else None
            st_value = float(st_value) if st_value not in [None, 'N/A'] else None
            painLevel_value = int(painLevel_value) if painLevel_value not in [None, 'N/A'] else None

            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            predictions_ref = db.reference('Predictions/Data/Overview').child('1HR')

            predictions_ref.update({
                'PainLevel': painLevel_value,
                'EDA': eda_value,
                'PPG': ppg_value,
                'ST': st_value,
                # 'HR': hr_value,
                'Timestamp': current_time
            })
            print("--------------------------------------------------------------------------------------------------")
            print("Data updated for |1HR| successfully in Firebase Realtime Database")
            print("--------------------------------------------------------------------------------------------------")
            print(
                f"PainLevel: {painLevel_value} | EDA: {eda_value} | PPG: {ppg_value} | ST: {st_value} | Timestamp: {current_time}")
        else:
            raise ValueError("No prediction data found at Predictions/Data/Latest in Firebase")

    except Exception as e:
        print(f"Error updating Realtime Database: {e}")


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def scheduler_update_database_prediction_3HR():
    try:
        latest_prediction_firebase_data = db.reference('Predictions/Data/Latest')
        latest_prediction_data = latest_prediction_firebase_data.get()

        # latest_hr_data = connect_firebase.child('Device/Inpatient/MD-V5-0000804/1min').get()

        # if latest_hr_data:
        #     hr_value = latest_hr_data.get('HeartRate', None)
        #     hr_value = float(hr_value) if hr_value not in [None, 'N/A'] else None
        # else:
        #     hr_value = None

        if latest_prediction_data:

            eda_value = latest_prediction_data.get('EDA', None)
            ppg_value = latest_prediction_data.get('PPG', None)
            st_value = latest_prediction_data.get('ST', None)
            painLevel_value = latest_prediction_data.get('PainLevel', None)

            eda_value = float(eda_value) if eda_value not in [None, 'N/A'] else None
            st_value = float(st_value) if st_value not in [None, 'N/A'] else None
            painLevel_value = int(painLevel_value) if painLevel_value not in [None, 'N/A'] else None

            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            predictions_ref = db.reference('Predictions/Data/Overview').child('3HR')

            predictions_ref.update({
                'PainLevel': painLevel_value,
                'EDA': eda_value,
                'PPG': ppg_value,
                'ST': st_value,
                # 'HR': hr_value,
                'Timestamp': current_time
            })
            print("--------------------------------------------------------------------------------------------------")
            print("Data updated for |3HR| successfully in Firebase Realtime Database")
            print("--------------------------------------------------------------------------------------------------")
            print(
                f"PainLevel: {painLevel_value} | EDA: {eda_value} | PPG: {ppg_value} | ST: {st_value} | Timestamp: {current_time}")
        else:
            raise ValueError("No prediction data found at Predictions/Data/Latest in Firebase")

    except Exception as e:
        print(f"Error updating Realtime Database: {e}")


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def scheduler_update_database_prediction_6HR():
    try:
        latest_prediction_firebase_data = db.reference('Predictions/Data/Latest')
        latest_prediction_data = latest_prediction_firebase_data.get()

        # latest_hr_data = connect_firebase.child('Device/Inpatient/MD-V5-0000804/1min').get()

        # if latest_hr_data:
        #     hr_value = latest_hr_data.get('HeartRate', None)
        #     hr_value = float(hr_value) if hr_value not in [None, 'N/A'] else None
        # else:
        #     hr_value = None

        if latest_prediction_data:

            eda_value = latest_prediction_data.get('EDA', None)
            ppg_value = latest_prediction_data.get('PPG', None)
            st_value = latest_prediction_data.get('ST', None)
            painLevel_value = latest_prediction_data.get('PainLevel', None)

            eda_value = float(eda_value) if eda_value not in [None, 'N/A'] else None
            st_value = float(st_value) if st_value not in [None, 'N/A'] else None
            painLevel_value = int(painLevel_value) if painLevel_value not in [None, 'N/A'] else None

            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            predictions_ref = db.reference('Predictions/Data/Overview').child('6HR')

            predictions_ref.update({
                'PainLevel': painLevel_value,
                'EDA': eda_value,
                'PPG': ppg_value,
                'ST': st_value,
                # 'HR': hr_value,
                'Timestamp': current_time
            })
            print("--------------------------------------------------------------------------------------------------")
            print("Data updated for |6HR| successfully in Firebase Realtime Database")
            print("--------------------------------------------------------------------------------------------------")
            print(
                f"PainLevel: {painLevel_value} | EDA: {eda_value} | PPG: {ppg_value} | ST: {st_value} | Timestamp: {current_time}")
        else:
            raise ValueError("No prediction data found at Predictions/Data/Latest in Firebase")

    except Exception as e:
        print(f"Error updating Realtime Database: {e}")


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def scheduler_update_database_prediction_12HR():
    try:
        latest_prediction_firebase_data = db.reference('Predictions/Data/Latest')
        latest_prediction_data = latest_prediction_firebase_data.get()

        # latest_hr_data = connect_firebase.child('Device/Inpatient/MD-V5-0000804/1min').get()

        # if latest_hr_data:
        #     hr_value = latest_hr_data.get('HeartRate', None)
        #     hr_value = float(hr_value) if hr_value not in [None, 'N/A'] else None
        # else:
        #     hr_value = None

        if latest_prediction_data:

            eda_value = latest_prediction_data.get('EDA', None)
            ppg_value = latest_prediction_data.get('PPG', None)
            st_value = latest_prediction_data.get('ST', None)
            painLevel_value = latest_prediction_data.get('PainLevel', None)

            eda_value = float(eda_value) if eda_value not in [None, 'N/A'] else None
            st_value = float(st_value) if st_value not in [None, 'N/A'] else None
            painLevel_value = int(painLevel_value) if painLevel_value not in [None, 'N/A'] else None

            current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            predictions_ref = db.reference('Predictions/Data/Overview').child('12HR')

            predictions_ref.update({
                'PainLevel': painLevel_value,
                'EDA': eda_value,
                'PPG': ppg_value,
                'ST': st_value,
                # 'HR': hr_value,
                'Timestamp': current_time
            })
            print("---------------------------------------------------------------------------------------------------")
            print("Data updated for |12HR| successfully in Firebase Realtime Database")
            print("---------------------------------------------------------------------------------------------------")
            print(
                f"PainLevel: {painLevel_value} | EDA: {eda_value} | PPG: {ppg_value} | ST: {st_value} | Timestamp: {current_time}")
        else:
            raise ValueError("No prediction data found at Prediction/Data/Latest in Firebase")

    except Exception as e:
        print(f"Error updating Realtime Database: {e}")


# ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

def schedule_update_interval():
    scheduler.add_job(
        scheduler_update_database_prediction_1HR,
        trigger='interval',
        hours=1
    )

    scheduler.add_job(
        scheduler_update_database_prediction_3HR,
        trigger='interval',
        hours=3
    )

    scheduler.add_job(
        scheduler_update_database_prediction_6HR,
        trigger='interval',
        hours=6
    )

    scheduler.add_job(
        scheduler_update_database_prediction_12HR,
        trigger='interval',
        hours=12
    )

    scheduler.start()


async def start_schedule_database():
    try:
        schedule_update_interval()
        return {"message": "Started scheduling updates for the default patient"}
    except Exception as e:
        return {"error": str(e)}


def save_predict_AVG5M_to_firebase(Predicted_data, EDA_data, PPG_data, ST_data, BMI_data, timestamp_data):
    firebase = db.reference('/Predictions/Data/AVG5M')
    data = firebase.get()

    # เพิ่ม ID
    # if data:
    #     last_id = max(int(item) for item in data.keys())
    #     new_id = f"{last_id + 1:03d}"
    # else:
    #     new_id = "001"

    if data:
        last_id = max(data.keys(), key=int)
    else:
        last_id = "001"

    firebase.child(last_id).update({
        "Predicted_class": Predicted_data,
        "EDA": EDA_data,
        "PPG": PPG_data,
        "ST": ST_data,
        "BMI": BMI_data,
        "timestamp": timestamp_data
    })
