from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from routers import Prediction,DataFromFront,Operation,Overview
import sys

@asynccontextmanager
async def lifespan(app):
    # === STARTUP ===
    print("📌 [STARTUP] Beginning startup sequence...", flush=True)
    sys.stdout.flush()
    
    try:
        from firebase.EDA_Preprocessing import start_schedule_preprocessing_eda
        print("📌 [STARTUP] Starting EDA Scheduler...", flush=True)
        await start_schedule_preprocessing_eda()
        print("📌 [STARTUP] EDA Scheduler DONE ✅", flush=True)
    except Exception as e:
        print(f"❌ [STARTUP] EDA Scheduler FAILED: {e}", flush=True)
    
    try:
        from firebase.HRV_Preprocessing import start_schedule_preprocessing_hrv
        print("📌 [STARTUP] Starting HRV Scheduler...", flush=True)
        await start_schedule_preprocessing_hrv()
        print("📌 [STARTUP] HRV Scheduler DONE ✅", flush=True)
    except Exception as e:
        print(f"❌ [STARTUP] HRV Scheduler FAILED: {e}", flush=True)
    
    try:
        from routers.Prediction import start_schedule_prediction
        print("📌 [STARTUP] Starting Prediction Scheduler...", flush=True)
        await start_schedule_prediction()
        print("📌 [STARTUP] Prediction Scheduler DONE ✅", flush=True)
    except Exception as e:
        print(f"❌ [STARTUP] Prediction Scheduler FAILED: {e}", flush=True)
    
    try:
        from routers.Overview import schedule_summary_task
        schedule_summary_task()
        print("📌 [STARTUP] Summary Task DONE ✅", flush=True)
    except Exception as e:
        print(f"❌ [STARTUP] Summary Task FAILED: {e}", flush=True)

    print("✅ ALL Schedulers Started Successfully!", flush=True)
    
    yield  # App is running
    
    # === SHUTDOWN ===
    print("📌 [SHUTDOWN] Shutting down...", flush=True)

app = FastAPI(lifespan=lifespan)

# origins = ["http://127.0.0.1:5500"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(Prediction.router)
app.include_router(DataFromFront.router)
app.include_router(Operation.router)
app.include_router(Overview.router)
