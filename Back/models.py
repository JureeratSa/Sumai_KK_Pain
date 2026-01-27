from pydantic import BaseModel
from typing import List
    
class PatientData(BaseModel):
    hn: str
    name: str
    age: int
    gender: str
    blood_group: str
    height: int
    weight: float
    bmi: float
    service_location: str
    admission_date: str
    bad_no: str
    device_no: str

class DoctorModel(BaseModel):
    doctor_id: str
    name: str
    specialist: str

class AssignPatientModel(BaseModel):
    doctor_id: str
    hn: str

class DoctorPatientsResponse(BaseModel):
    doctor_name: str
    total_patients: int
    patients_list: List[dict]
    
class Prediction(BaseModel):
    Predicted_class: int
    EDA: float
    PPG: float
    ST: float
    BMI: float
    timestamp: str
    
class Dashboard(BaseModel):
    painLevel: int
    timestamp: str