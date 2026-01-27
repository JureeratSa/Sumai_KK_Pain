from config import initialize_firebase
from firebase.firebases import all_patient

# Initialize Firebase
try:
    initialize_firebase()
except ValueError:
    pass

# Mock Data for 6 Patients
# HN002 - HN007
# No device_no, No bad_no
patients = [
    {
        "hn": "HN002", "name": "Somchai Jai-dee", "age": 50, "gender": "Male",
        "blood_group": "O", "height": 170, "weight": 70, "bmi": 24.22,
        "service_location": "ICU", "admission_date": "2024-01-10"
    },
    {
        "hn": "HN003", "name": "Suda Rak-thai", "age": 35, "gender": "Female",
        "blood_group": "A", "height": 160, "weight": 55, "bmi": 21.48,
        "service_location": "OPD", "admission_date": "2024-01-11"
    },
    {
        "hn": "HN004", "name": "Mana Mee-ngern", "age": 65, "gender": "Male",
        "blood_group": "B", "height": 165, "weight": 80, "bmi": 29.38,
        "service_location": "IPD", "admission_date": "2024-01-08"
    },
    {
        "hn": "HN005", "name": "Manee Me-ta", "age": 28, "gender": "Female",
        "blood_group": "AB", "height": 155, "weight": 45, "bmi": 18.73,
        "service_location": "ICU", "admission_date": "2024-01-12"
    },
    {
        "hn": "HN006", "name": "Piti Por-jai", "age": 42, "gender": "Male",
        "blood_group": "O", "height": 175, "weight": 75, "bmi": 24.49,
        "service_location": "IPD", "admission_date": "2024-01-09"
    },
    {
        "hn": "HN007", "name": "Chujai Dee-ma", "age": 60, "gender": "Female",
        "blood_group": "A", "height": 158, "weight": 65, "bmi": 26.04,
        "service_location": "OPD", "admission_date": "2024-01-13"
    }
]

print("Adding mock patients to /Allpatients...")

for p in patients:
    all_patient(
        hn=p["hn"],
        name=p["name"],
        age=p["age"],
        gender=p["gender"],
        blood_group=p["blood_group"],
        height=p["height"],
        weight=p["weight"],
        bmi=p["bmi"],
        service_location=p["service_location"],
        admission_date=p["admission_date"],
        bad_no=None,   # Explicitly None
        device_no=None # Explicitly None
    )

print("Done.")
