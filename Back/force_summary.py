from config import initialize_firebase
from firebase.Summary_Calculation import update_summary_firebase

print("--- Manual Trigger Summary Calculation ---")
try:
    initialize_firebase()
    update_summary_firebase()
    print("--- Done ---")
except Exception as e:
    print(f"--- Error: {e} ---")
