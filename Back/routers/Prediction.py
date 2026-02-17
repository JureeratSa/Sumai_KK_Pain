from fastapi import APIRouter, Query
from fastapi.responses import JSONResponse
from models import Prediction
from datetime import datetime
import numpy as np
from firebase_admin import db
from model_dumb import model_dumb
from firebase.firebases import predict, predict_data_AVG1M, save_predict_AVG1M_to_firebase, predict_patient_data, save_prediction_to_patient, sync_legacy_device_data
from apscheduler.schedulers.background import BackgroundScheduler

router = APIRouter()
scheduler = BackgroundScheduler()

@scheduler.scheduled_job('interval', seconds=5)
def predict_AVG1M_from_firebase():
    try:
        # 0. Sync Legacy Data (Bridge)
        sync_legacy_device_data()
        
        # 1. Fetch All Patients
        patients_ref = db.reference('patient')
        patients_data = patients_ref.get()
        
        if not patients_data:
            print(f"[{datetime.now()}] No patients found.")
            return

        # 2. Loop & Predict
        for hn, p_data in patients_data.items():
            if not isinstance(p_data, dict): continue

            # Get Data form Patient Node
            input_data = predict_patient_data(hn)

            if not input_data or None in input_data.values():
                # print(f"[{datetime.now()}] Data incomplete for {hn}")
                continue
            
            device_id = input_data.get("DeviceID")
            if not device_id:
                continue

            eda_tonic = float(input_data["EDA_Tonic_Normalized"])
            lf_hf_ratio = float(input_data["LF_HF_ratio_Normalized"])
            st_val = float(input_data["ST"])
            bmi_val = float(input_data["BMI"])

            if eda_tonic == 0 and lf_hf_ratio == 0 and st_val == 0:
                # Skip if empty data (all zeros)
                continue

            input_data_array = np.array([[
                eda_tonic,
                lf_hf_ratio,
                st_val,
                bmi_val
            ]])

            # Predict
            prediction_result = model_dumb.predict(input_data_array)
            Predicted_class = int(prediction_result[0])

            timestamp_now = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            
            # Save to Patient Node
            save_prediction_to_patient(
                hn,
                device_id,
                Predicted_class,
                eda_tonic,
                lf_hf_ratio,
                st_val,
                bmi_val,
                timestamp_now
            )

            print(f"✅ Prediction for {hn} ({device_id}): Pain Level {Predicted_class}")

    except Exception as e:
        print(f"Error in Scheduled Prediction: {str(e)}")





@router.get("/prediction_AVG5M")
def manual_predict_trigger():
    predict_AVG1M_from_firebase()

    return JSONResponse(content={
        "message": "Prediction process triggered manually. Check server logs or Firebase for results."
    })

# @scheduler.scheduled_job('interval', minutes=1)
# def predict_from_firebase(patient_id: str = Query(None), device_id: str = Query(None)):
#     try:
#
#         if patient_id:
#             input_data = predict_data_AVG5M(patient_id=patient_id)
#         elif device_id:
#             input_data = predict_data_AVG5M(device_id=device_id)
#         else:
#             return JSONResponse(content={"error": "Either patient_id or device_id must be provided."}, status_code=400)
#
#         if not input_data:
#             return JSONResponse(content={"error": "No data found in Firebase"}, status_code=404)
#
#         EDA_data = round(float(input_data["EDA"]), 2)
#         PPG_data = round(float(input_data["PPG"]), 2)
#         ST_data = round(float(input_data["ST"]), 2)
#         BMI_data = float(input_data["BMI"])
#         Device_data = input_data["DeviceID"]
#
#         if None in [EDA_data, PPG_data, ST_data, BMI_data]:
#             return JSONResponse(content={"error": "Incomplete data from Firebase"}, status_code=400)
#
#         input_data_array = np.array([[
#             EDA_data,
#             PPG_data,
#             ST_data,
#             BMI_data
#         ]])
#
#         Predicted_data = int(model_dumb.predict(input_data_array)[0])
#         timestamp_data = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
#
#         result_to_JSON = {
#                 "Predicted_class": Predicted_data,
#                 "EDA": EDA_data,
#                 "PPG": PPG_data,
#                 "ST": ST_data,
#                 "BMI": BMI_data,
#                 "timestamp": timestamp_data,
#                 "DeviceID": Device_data
#         }
#
#         save_predict_to_firebase(Predicted_data, EDA_data, PPG_data, ST_data, BMI_data, timestamp_data, Device_data)
#
#         return JSONResponse(content=result_to_JSON)
#
#     except Exception as e:
#         print(f"Error: {str(e)}")
#         return JSONResponse(content={"error": str(e)}, status_code=500)
#

# scheduler.start()

async def start_schedule_prediction():
    try:
        if not scheduler.running:
            scheduler.start()
            print("✅ Prediction Scheduler Started (1 sec interval)")
        return {"message": "Started scheduling prediction"}
    except Exception as e:
        return {"error": str(e)}