from fastapi import APIRouter, HTTPException
from models import PatientData, DoctorModel, AssignPatientModel, DoctorPatientsResponse
from firebase.firebases import save_patient_data, save_doctor_data, assign_patient_to_doctor, get_doctor_patient_list

router = APIRouter()


@router.post("/patient_data", response_model=PatientData)
async def patient_data(data: PatientData):
    try:
        save_patient_data(
            hn=data.hn,
            name=data.name,
            age=data.age,
            gender=data.gender,
            blood_group=data.blood_group,
            height=data.height,
            weight=data.weight,
            bmi=data.bmi,
            service_location=data.service_location,
            admission_date=data.admission_date,
            bad_no=data.bad_no,
            device_no=data.device_no
        )
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Patient Data: {str(e)}")


@router.post("/doctor_data", response_model=DoctorModel)
async def create_doctor(data: DoctorModel):
    try:
        save_doctor_data(data.doctor_id, data.name, data.specialist)
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save Doctor Data: {str(e)}")

@router.post("/assign_patient")
async def assign_patient(data: AssignPatientModel):
    try:
        assign_patient_to_doctor(data.doctor_id, data.hn)
        return {"message": f"Patient {data.hn} assigned to Doctor {data.doctor_id}"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to Assign Patient: {str(e)}")

@router.get("/doctor_patients/{doctor_id}", response_model=DoctorPatientsResponse)
async def get_doctor_patients_route(doctor_id: str):
    try:
        data = get_doctor_patient_list(doctor_id)
        if not data:
             raise HTTPException(status_code=404, detail="Doctor not found")
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

