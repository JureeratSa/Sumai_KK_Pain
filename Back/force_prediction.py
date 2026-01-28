
from routers.Prediction import predict_AVG1M_from_firebase
import firebase_admin

print("--- Manual Trigger Prediction ---")
try:
    # Check if app is initialized, if not, try to init (but imports likely did it)
    if not firebase_admin._apps:
        from config import initialize_firebase
        initialize_firebase()
        
    predict_AVG1M_from_firebase()
    print("--- Done ---")
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f"--- Error: {e} ---")
