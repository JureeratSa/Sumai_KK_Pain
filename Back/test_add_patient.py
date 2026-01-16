from config import initialize_firebase
from firebase.firebases import save_patient_data

# Initialize Firebase
try:
    initialize_firebase()
except ValueError:
    pass# Already initialized

# Demo Patient Data
hn = "HN001"
name = "John Doe"
age = 45
gender = "Male"
blood_group = "O+"
height = 175
weight = 70
bmi = weight / ((height/100) * (height/100))
service_location = "ICU"
admission_date = "2024-01-01"
bad_no = "B-001"
device_no = "MD-V5-0000804" # Example Device ID

print(f"Adding Test Patient {hn}...")
save_patient_data(
    hn=hn,
    name=name,
    age=age,
    gender=gender,
    blood_group=blood_group,
    height=height,
    weight=weight,
    bmi=bmi,
    service_location=service_location,
    admission_date=admission_date,
    bad_no=bad_no,
    device_no=device_no
)

print("Done. Check Firebase for 'patient' node.")
