import matplotlib
matplotlib.use('Agg')
import neurokit2 as nk
import numpy as np
import pandas as pd
from datetime import datetime
from apscheduler.schedulers.background import BackgroundScheduler
from pyhrv.frequency_domain import welch_psd
from firebase_admin import db
import time
import asyncio
from config import initialize_firebase

# CONFIG
WINDOW_SIZE = 600       # 10Hz * 60s = 600 points (1 Minute Window)
COLLECTION_RATE = 10    # Raw data comes in at 10Hz
PROCESSING_RATE = 100   # Upsample to 100Hz for NeuroKit processing

# Scaling Bounds
SCALING_BOUNDS = {
    "LF_HF_ratio": (0, 20),
    "LF_abs": (0, 5000000),
    "HF_abs": (0, 5000000),
    "Total_Power": (0, 10000000)
}

# Buffer storage: { "HN001": [val1, val2...], "HN002": [...] }
ppg_buffers = {}
scheduler = BackgroundScheduler()

# ==========================================
# 2. ฟังก์ชันดึงและคำนวณ (Core Functions)
# ==========================================

def normalize_value(val, min_v, max_v):
    """Simple MinMax Scaler with clamping 0-1"""
    if val < min_v: return 0.0
    if val > max_v: return 1.0
    return (val - min_v) / (max_v - min_v)

def store_hrv_to_firebase(hn, device_id, features):
    try:
        # Save to: patient/{HN}/Device no/{DeviceID}/preprocessing/HRV
        ref = db.reference(f"patient/{hn}/Device no/{device_id}/preprocessing/HRV")
        ref.set(features)
        print("-" * 50)
        print(f"✅ HRV UPDATED for {hn} ({device_id}) at {features['Timestamp']}")
        print(f"   LF/HF (Norm): {features['LF_HF_ratio_Normalized']:.4f} | Total Power (Norm): {features['Total_Power_Normalized']:.4f}")
        print("-" * 50)
    except Exception as e:
        print(f"Error saving HRV: {e}")


def process_hrv_window(ppg_data_list):
    try:
        ppg_signal = np.array(ppg_data_list, dtype=float)

        # 0. Resample: 10Hz -> 100Hz
        ppg_resampled = nk.signal_resample(
            ppg_signal, 
            sampling_rate=COLLECTION_RATE, 
            desired_sampling_rate=PROCESSING_RATE
        )

        # 1. Clean
        ppg_cleaned = nk.ppg_clean(ppg_resampled, sampling_rate=PROCESSING_RATE)

        # 2. Peaks
        signals, info = nk.ppg_peaks(ppg_cleaned, sampling_rate=PROCESSING_RATE)
        peaks = info['PPG_Peaks']

        if len(peaks) == 0:
            return None

        # 3. NNI & Welch
        nni = np.diff(peaks) * 1000 / PROCESSING_RATE

        if len(nni) < 5:
            # print("Skipping HRV: Not enough NNI points")
            return None

        freq_results = welch_psd(nni=nni, show=False)
        freq_dict = freq_results.as_dict()
        
        # Raw Values
        lf_hf_raw = float(freq_dict['fft_ratio'])
        lf_n_raw = float(freq_dict['fft_norm'][0])
        hf_n_raw = float(freq_dict['fft_norm'][1])
        lf_abs_raw = float(freq_dict['fft_abs'][1])
        hf_abs_raw = float(freq_dict['fft_abs'][2])
        total_power_raw = float(freq_dict['fft_total'])

        return {
            "Timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "LF_HF_ratio_Normalized": normalize_value(lf_hf_raw, *SCALING_BOUNDS["LF_HF_ratio"]),
            "LF_n_Normalized": lf_n_raw / 100.0,
            "HF_n_Normalized": hf_n_raw / 100.0,
            "LF_abs_Normalized": normalize_value(lf_abs_raw, *SCALING_BOUNDS["LF_abs"]),
            "HF_abs_Normalized": normalize_value(hf_abs_raw, *SCALING_BOUNDS["HF_abs"]),
            "Total_Power_Normalized": normalize_value(total_power_raw, *SCALING_BOUNDS["Total_Power"]),
            
            "LF_HF_ratio_Raw": lf_hf_raw,
            "LF_n_Raw": lf_n_raw,
            "HF_n_Raw": hf_n_raw,
            "LF_abs_Raw": lf_abs_raw,
            "HF_abs_Raw": hf_abs_raw,
            "Total_Power_Raw": total_power_raw
        }
    except Exception as e:
        # print(f"Calc HRV Error: {e}")
        return None

# ==========================================
# 3. Main Collection Logic
# ==========================================
def collect_and_process_ppg_batch():
    global ppg_buffers
    
    try:
        # Fetch all patients
        patients_ref = db.reference("patient")
        patients_data = patients_ref.get()

        if not patients_data:
            return

        for hn, data in patients_data.items():
            if not isinstance(data, dict):
                continue

            # Check for Device data
            devices_node = data.get("Device no")
            if not isinstance(devices_node, dict):
                continue

            # Iterate over Device IDs (e.g. MD-V5...)
            for device_id, device_content in devices_node.items():
                if not isinstance(device_content, dict):
                    continue

                # Check for '1 s' PPG data
                one_sec_data = device_content.get("1 s")
                if not one_sec_data:
                    continue
                
                # Note: The key usually is "PPG" or "PG" depending on device
                ppg_val = one_sec_data.get("PPG")
                if ppg_val is None:
                    continue
                
                # Init buffer
                buffer_key = f"{hn}_{device_id}"
                if buffer_key not in ppg_buffers:
                    ppg_buffers[buffer_key] = []
                
                # Append
                try:
                    val_float = float(ppg_val)
                    ppg_buffers[buffer_key].append(val_float)
                except ValueError:
                    continue
                
                # Check Window Size
                if len(ppg_buffers[buffer_key]) >= WINDOW_SIZE:
                    print(f"🔄 Processing HRV Batch for {hn} - {device_id}...")
                    features = process_hrv_window(ppg_buffers[buffer_key])
                    if features:
                        store_hrv_to_firebase(hn, device_id, features)
                    
                    # Reset Buffer (Sliding window logic could be applied here if needed)
                    ppg_buffers[buffer_key] = []

    except Exception as e:
        print(f"Error in collect_and_process_ppg_batch: {e}")


def schedule_preprocessing_interval():
    if not scheduler.get_jobs():
        # High frequency check (0.1s) to catch 10Hz data mostly in real-time
        scheduler.add_job(collect_and_process_ppg_batch, trigger='interval', seconds=0.1, max_instances=10)
        scheduler.start()
        print("⏰ HRV Scheduler (Multi-Patient) started.")

async def start_schedule_preprocessing_hrv():
    try:
        schedule_preprocessing_interval()
        return {"message": "Started scheduling preprocessing HRV for all patients"}
    except Exception as e:
        return {"error": str(e)}
