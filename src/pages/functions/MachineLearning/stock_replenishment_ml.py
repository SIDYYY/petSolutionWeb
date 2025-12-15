# -------------------------
# 1. IMPORTS
# -------------------------
import pandas as pd
import numpy as np
import joblib
import os
import datetime
import firebase_admin
from firebase_admin import credentials, firestore

# -------------------------
# 2. LOAD TRAINED MODEL
# -------------------------
model_path = "xgboost_threshold_modelv1.pkl"
if not os.path.exists(model_path):
    raise FileNotFoundError(f"{model_path} not found!")

model = joblib.load(model_path)
print("✔ Trained model loaded successfully!")

# -------------------------
# 3. INITIALIZE FIREBASE
# -------------------------

cred = credentials.Certificate("serviceAccount.json")
firebase_admin.initialize_app(cred)
db = firestore.client()
products_ref = db.collection("Products")

# -------------------------
# 4. GET NEXT MONTH
# -------------------------

today = datetime.date.today()
next_month_date = (today.replace(day=1) + pd.DateOffset(months=1)).to_pydatetime()
next_year = next_month_date.year
next_month = next_month_date.month

# -------------------------
# 5. UPDATE THRESHOLDS
# -------------------------

print("\n🔹 Updating Firestore with next month predictions...")

batch = db.batch()
updated_count = 0
sample_count = 0  # counter to limit sample prints

docs = list(products_ref.stream())
for doc in docs:
    data = doc.to_dict()

    # Prepare features for model
    X = pd.DataFrame([{
        "Year": next_year,
        "Month": next_month,
        "QuantitySold": data.get("quantitySold", 0),
        "Price": data.get("price", 0),
        "LeadTime": data.get("leadTime", 0),
    }])

    try:
        pred_threshold = float(model.predict(X)[0])
    except Exception as e:
        print(f"❌ Error predicting doc {doc.id}: {e}")
        continue

    # 🔹 Print only the first 10 predictions
    if sample_count < 10:
        print(f"{doc.id} | {data.get('name', '')} | Current Qty: {data.get('qty', 0)} | Predicted Threshold: {pred_threshold:.2f}")
        sample_count += 1

    # Update Firestore
    doc_ref = products_ref.document(doc.id)
    batch.set(doc_ref, {
        "PredictedThreshold": pred_threshold
    }, merge=True)

    updated_count += 1

# Commit batch
batch.commit()
print(f"✅ Firestore updated. Total products updated: {updated_count}")
