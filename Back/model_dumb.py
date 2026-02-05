import joblib
from sklearn.ensemble import RandomForestClassifier
import os
base_path = os.path.dirname(os.path.abspath(__file__))
model_path = os.path.join(base_path, "RF-2.pkl")
model_dumb = joblib.load(model_path)

#"D:\Work\Project\Model_Dumb\Model_Dumbxgb_model_['EDA_Phasic_EmotiBit', 'EDA_Tonic_EmotiBit', 'BMI', 'SkinTemp_Emo'].pkl"

if isinstance(model_dumb, RandomForestClassifier):
    print("RF model loaded successfully!")
else:
    raise ValueError("Loaded model is not an RF. Please check the file path.")