from apscheduler.schedulers.background import BackgroundScheduler
from firebase.Summary_Calculation import update_summary_firebase
from fastapi import APIRouter
from firebase.firebases import start_schedule_database
from firebase.EDA_Preprocessing import start_schedule_preprocessing_eda
from firebase.HRV_Preprocessing import start_schedule_preprocessing_hrv

router = APIRouter()
scheduler = BackgroundScheduler()

def schedule_summary_task():
    if not scheduler.get_jobs():
        scheduler.add_job(update_summary_firebase, 'interval', minutes=5)
        scheduler.start()
        print("⏰ Summary Calculation Scheduler Started (5 min)")


@router.get("/start_schedule")
async def start_schedule():
    try:
        await start_schedule_database()
        return {"message": "Started scheduling updates for the default patient"}
    except Exception as e:
        return {"error": str(e)}


@router.get("/start_preprocessing_eda")
async def start_preprocessing():
    try:
        await start_schedule_preprocessing_eda()
        return {"message": "Started scheduling preprocessing"}
    except Exception as e:
        return {"error": str(e)}


@router.get("/start_preprocessing_hrv")
async def start_preprocessing():
    try:
        await start_schedule_preprocessing_hrv()
        return {"message": "Started scheduling preprocessing"}
    except Exception as e:
        return {"error": str(e)}

@router.get("/start_summary_calculation")
async def start_summary():
    try:
        schedule_summary_task()
        return {"message": "Started scheduling summary calculation (Every 5 mins)"}
    except Exception as e:
        return {"error": str(e)}