from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routers import Prediction,DataFromFront,Operation,Overview

app = FastAPI()

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

@app.on_event("startup")
async def startup_event():
    # Auto-start preprocessing schedulers
    from firebase.EDA_Preprocessing import start_schedule_preprocessing_eda
    from firebase.HRV_Preprocessing import start_schedule_preprocessing_hrv
    from routers.Prediction import start_schedule_prediction
    await start_schedule_preprocessing_eda()
    await start_schedule_preprocessing_hrv()
    await start_schedule_prediction()
    
    # Start Summary Calculation
    from routers.Overview import schedule_summary_task
    schedule_summary_task()
    print("✅ Preprocessing & Prediction Schedulers Started Automatically")
