import neurokit2 as nk
import numpy as np
import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from datetime import datetime
from firebase_admin import db
from apscheduler.schedulers.background import BackgroundScheduler

# Dictionary to store buffers for each patient: { "HN001": [val1, val2, ...], "HN002": ... }
eda_buffers = {}
scheduler = BackgroundScheduler()

def preprocess_eda(eda_raw):
    eda_signal = np.array(eda_raw, dtype=float)

    if len(eda_signal) == 0:
        return None, None

    # Use try-except to handle potential neurokit errors with short/bad signals
    try:
        eda_cleaned = nk.eda_clean(eda_signal, sampling_rate=10) # Assuming 10Hz based on usage
        df = pd.DataFrame({"EDA_Clean": eda_cleaned})
        eda_components = nk.eda_phasic(df["EDA_Clean"], sampling_rate=10, method="cvxEDA")

        eda_phasic_raw = eda_components["EDA_Phasic"].values
        eda_tonic_raw = eda_components["EDA_Tonic"].values

        scaler = MinMaxScaler(feature_range=(0, 1))

        if len(eda_phasic_raw) > 0:
            eda_phasic_norm = scaler.fit_transform(eda_phasic_raw.reshape(-1, 1)).flatten()
            eda_tonic_norm = scaler.fit_transform(eda_tonic_raw.reshape(-1, 1)).flatten()
            return eda_phasic_norm, eda_tonic_norm
        else:
            return None, None
    except Exception as e:
        print(f"Error in preprocessing EDA: {e}")
        return None, None


def store_processed_eda_to_firebase(hn, device_id, eda_phasic, eda_tonic):
    if eda_phasic is None or eda_tonic is None:
        return

    avg_phasic = np.mean(eda_phasic)
    avg_tonic = np.mean(eda_tonic)

    EDA_Data = {
        "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "EDA_Phasic_Normalized": avg_phasic,
        "EDA_Tonic_Normalized": avg_tonic
    }

    # Save to: patient/{HN}/Device no/{DeviceID}/preprocessing/EDA
    firebase_ref = db.reference(f"patient/{hn}/Device no/{device_id}/preprocessing/EDA")
    firebase_ref.set(EDA_Data)

    print(f"✅ EDA Updated for {hn} ({device_id}) | Phasic: {avg_phasic:.4f} | Tonic: {avg_tonic:.4f}")


def collect_and_process_eda():
    global eda_buffers

    try:
        # Fetch all patients to find active devices
        patients_ref = db.reference("patient")
        patients_data = patients_ref.get()

        if not patients_data:
            return

        for hn, data in patients_data.items():
            if not isinstance(data, dict):
                continue
            
            # Access 'Device no' safely
            devices_node = data.get("Device no")
            if not isinstance(devices_node, dict):
                continue

            # Iterate over Device IDs (e.g. MD-V5...)
            for device_id, device_content in devices_node.items():
                if not isinstance(device_content, dict):
                    continue

                # Check for '1 s' data (Raw 1-second data)
                one_sec_data = device_content.get("1 s")
                if not one_sec_data:
                    continue
                    
                eda_val = one_sec_data.get("EDA")
                if eda_val is None:
                    continue
                    
                # Initialize buffer for this HN_DeviceID
                buffer_key = f"{hn}_{device_id}"
                if buffer_key not in eda_buffers:
                    eda_buffers[buffer_key] = []
                
                # Append new value
                try:
                    val_float = float(eda_val)
                    eda_buffers[buffer_key].append(val_float)
                except ValueError:
                    continue

                # Check buffer size (Process every 30 samples)
                if len(eda_buffers[buffer_key]) >= 30:
                    print(f"🔄 Processing EDA for {hn} - {device_id}...")
                    phasic, tonic = preprocess_eda(eda_buffers[buffer_key])
                    store_processed_eda_to_firebase(hn, device_id, phasic, tonic)
                    eda_buffers[buffer_key] = [] # Reset buffer

    except Exception as e:
        print(f"Error in collect_and_process_eda: {e}")


def schedule_preprocessing_interval():
    if not scheduler.get_jobs():
        scheduler.add_job(collect_and_process_eda, trigger='interval', seconds=1, max_instances=10)
        scheduler.start()
        print("⏰ EDA Scheduler (Multi-Patient) started.")


async def start_schedule_preprocessing_eda():
    try:
        schedule_preprocessing_interval()
        return {"message": "Started scheduling EDA preprocessing for all patients"}
    except Exception as e:
        return {"error": str(e)}
