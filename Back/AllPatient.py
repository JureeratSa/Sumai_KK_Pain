from config import initialize_firebase
from firebase.firebases import all_patient

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
device_no = "MD-V5-0000804"
#----
# hn = "HN002"
# name = "Jirapon Worapaksirisakul"
# age = 30
# gender = "Female"
# blood_group = "A-"
# height = 160
# weight = 75
# bmi = weight / ((height/100) * (height/100))
# service_location = "ICU"
# admission_date = "2026-01-14"
# bad_no = None
# device_no = None

#----
# hn = "HN003"
# name = "Somchai Jaidee"
# age = 22
# gender = "Male"
# blood_group = "B+"
# height = 178
# weight = 75
# bmi = weight / ((height/100) * (height/100))
# service_location = "ICU"
# admission_date = "2026-01-14"
# bad_no = None
# device_no = None

#----
# hn = "HN003"
# name = "Somsak RaksaSri"
# age = 60
# gender = "Male"
# blood_group = "AB"
# height = 167
# weight = 65
# bmi = weight / ((height/100) * (height/100))
# service_location = "OPD"
# admission_date = "2026-01-14"
# bad_no = None
# device_no = None

#----
# hn = "HN004"
# name = "Wichai Chuenchom"
# age = 50
# gender = "Male"
# blood_group = "AB"
# height = 167
# weight = 65
# bmi = weight / ((height/100) * (height/100))
# service_location = "ORTHO"
# admission_date = "2026-01-14"
# bad_no = None
# device_no = None

#----
# hn = "HN005"
# name = "Nongnuch Anan"
# age = 50
# gender = "Female"
# blood_group = "B+"
# height = 167
# weight = 65
# bmi = weight / ((height/100) * (height/100))
# service_location = "IPD"
# admission_date = "2026-01-14"
# bad_no = None
# device_no = None

print(f" Patient {hn}...")
all_patient(
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
