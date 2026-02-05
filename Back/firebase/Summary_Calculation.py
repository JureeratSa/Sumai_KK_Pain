from firebase_admin import db
from datetime import datetime, timedelta
import numpy as np

# ==========================================
# 1. ฟังก์ชันช่วยคำนวณ (Helper Functions)
# ==========================================

def calculate_bmi(weight, height):
    """
    สูตร BMI ตามที่คุณให้มา
    weight: kg, height: cm
    """
    if height <= 0: return 0
    height_m = height / 100
    bmi = weight / (height_m * height_m)
    return round(bmi, 2)

def calculate_patient_growth(patients_data):
    """
    สูตรคำนวณ % การเพิ่มขึ้นของผู้ป่วยเทียบกับ 7 วันที่แล้ว
    """
    today = datetime.now()
    last_week_date = today - timedelta(days=7) 

    current_total = 0
    last_week_total = 0

    if not patients_data:
        return 0, 0.0  # Return ทั้งจำนวนคนปัจจุบัน และ %

    for info in patients_data.values():
        current_total += 1
        
        adm_date_str = info.get("Admission Date", "")
        # รับมือกรณีวันที่อาจจะไม่มี หรือ format ผิด
        if not adm_date_str: continue

        try:
            # แก้ format ตรงนี้ให้ตรงกับ Database จริง (เช่น %Y-%m-%d)
            adm_date_obj = datetime.strptime(adm_date_str, "%Y-%m-%d")
            
            if adm_date_obj <= last_week_date:
                last_week_total += 1
        except ValueError:
            continue 

    if last_week_total == 0:
        percent = 100.0 if current_total > 0 else 0.0
    else:
        percent = ((current_total - last_week_total) / last_week_total) * 100

    return current_total, round(percent, 2)

# ==========================================
# 2. ฟังก์ชันหลัก (Main Logic)
# ==========================================

def update_summary_firebase():
    print("🔄 Start Calculation Summary...")
    
    try:
        # --- A. ดึงข้อมูล (Fetch) ---
        ref = db.reference("/patient")
        patients_data = ref.get()

        if not patients_data:
            print("❌ No patient data found.")
            return

        # --- B. เตรียมตัวแปร (Init Variables) ---
        today_str = datetime.now().strftime("%Y-%m-%d")
        
        # ตัวแปรสำหรับหาค่าเฉลี่ย
        eda_list = []
        hr_list = []
        
        # ตัวแปรนับจำนวน
        patients_at_risk_count = 0
        new_patients_today_count = 0
        
        # ตัวแปรเพศ
        male_count = 0
        female_count = 0

        # --- C. วนลูปคำนวณ (Loop & Calculate) ---
        for hn, data in patients_data.items():
            
            if not isinstance(data, dict):
                continue
                
            # 1. สูตร Today New Patients
            adm_date = str(data.get("Admission Date", ""))
            if adm_date.startswith(today_str):
                new_patients_today_count += 1

            # 2. สูตร Gender Distribution
            gender = data.get("Gender", "")
            if not gender:
                gender = data.get("Sex", "")
            
            gender = gender.lower()
            if gender == "male" or gender == "chai": # เผื่อเก็บเป็นภาษาไทย
                male_count += 1
            elif gender == "female" or gender == "ying":
                female_count += 1

            # 3. ดึงค่าจากส่วน Predict (เพื่อหา Risk และ Average)
            # หมายเหตุ: โครงสร้างใหม่ predict อยู่ใน: patient/{hn}/Device no/{device_id}/predict
            # เราต้องวนลูปหา device ก่อน หรือจะเอาเฉพาะ device ล่าสุด
            
            devices_node = data.get("Device no", {})
            if isinstance(devices_node, dict):
                for device_id, device_content in devices_node.items():
                    if not isinstance(device_content, dict): continue
                    
                    predict_data = device_content.get("predict", {})
                    if predict_data:
                        # สูตร Patients at Risk (Changed to >= 1 per user feedback)
                        pain = int(predict_data.get("painlevel", 0))
                        if pain >= 1:
                            patients_at_risk_count += 1
                        
                        # เก็บค่าเพื่อหา Average
                        if "EDA_tonic" in predict_data:
                            eda_list.append(float(predict_data["EDA_tonic"]))
                        
                        # เช็คชื่อ key ให้ตรงกับ Database จริง (PPG_Hrv หรือ PPG)
                        if "PPG_Hrv" in predict_data: 
                            hr_list.append(float(predict_data["PPG_Hrv"]))
                        
                        # Note: If patient has multiple devices, this might double count averages?
                        # Assuming 1 Active Device per patient for stats mostly.

        # 4. สูตร Total Patient & Growth
        total_current, growth_percent = calculate_patient_growth(patients_data)

        # 5. คำนวณค่าเฉลี่ย (Averages)
        avg_eda = float(np.mean(eda_list)) if eda_list else 0.0
        avg_hr = float(np.mean(hr_list)) if hr_list else 0.0


        # --- D. จัดฟอร์แมตข้อมูล (Format Output) ---
        summary_payload = {
            "total_patients": {
                "today_new_patients": new_patients_today_count,
                "total_patients_monitor": total_current,
                "growth_percentage": growth_percent # เพิ่ม field นี้ไปให้ด้วยเผื่อใช้แสดงผล
            },
            "patients_at_risk": patients_at_risk_count,
            "avg_heart_rate": round(avg_hr, 2),
            "avg_eda_rate": round(avg_eda, 2),
            "gender_distribution": {
                "Male": male_count,
                "Female": female_count
            },
            "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        }

        # --- E. ส่งกลับ Firebase (Push Back) ---
        summary_ref = db.reference("/Summary")
        summary_ref.set(summary_payload)
        
        print(f"✅ Summary Updated Successfully: {summary_payload}")

    except Exception as e:
        print(f"❌ Error in Summary Calculation: {str(e)}")

# if __name__ == "__main__":
#     from config import initialize_firebase 
#     initialize_firebase()
#     update_summary_firebase()
