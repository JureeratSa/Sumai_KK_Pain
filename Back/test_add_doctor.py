from config import initialize_firebase
from firebase.firebases import save_doctor_data, assign_patient_to_doctor

# Initialize Firebase
try:
    initialize_firebase()
except ValueError:
    pass # Already initialized

# 1. Register a Test Doctor
print("Adding Test Doctor...")
save_doctor_data("DOC-TEST-001", "Dr. Test System", "General Practitioner")

# 2. Assign Patient HN001 to this Doctor
print("Assigning HN001 to Doctor...")
assign_patient_to_doctor("DOC-TEST-001", "HN001")

print("Done. Check Firebase for 'Doctor' node.")
