import pandas as pd
import numpy as np
from google.cloud import firestore
from sklearn.linear_model import LinearRegression
from collections import defaultdict
import warnings
from datetime import datetime
import os

# --- Setup Firestore credentials ---
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(
    os.path.dirname(__file__), "serviceAccount.json"
)

warnings.filterwarnings("ignore", category=UserWarning, module="google.cloud.firestore_v1.base_collection")

# --- Firestore Initialization ---
db = firestore.Client()

# --- Load CSV for initial model training ---
csv_path = os.path.join(os.path.dirname(__file__), "NEW_petsolutionproducts.csv")
data = pd.read_csv(csv_path)
data.columns = [c.strip().lower() for c in data.columns]

# --- Feature Engineering ---
months_csv = [col for col in data.columns if col in ["may", "june", "july", "august", "september"]]
for m in months_csv:
    data[m] = pd.to_numeric(data[m], errors="coerce").fillna(0)

data["avg_monthly_sales"] = data[months_csv].mean(axis=1)
data["threshold"] = pd.to_numeric(data.get("threshold value", np.nan), errors="coerce").fillna(
    (data["avg_monthly_sales"] * data["lead time"] / 7).round()
)

# --- Train Linear Regression Model ---
X = data[["avg_monthly_sales", "lead time"]]
y = data["threshold"]
model = LinearRegression().fit(X, y)
print("✅ Initial model trained in-memory!")


# --- Predict threshold ---
def predict_threshold(avg_sales, lead_time):
    features = pd.DataFrame([[avg_sales, lead_time]], columns=["avg_monthly_sales", "lead time"])
    predicted = model.predict(features)[0]
    return max(1, round(predicted))


# --- Generate Firestore sales_summary safely ---
def generate_sales_summary():
    print("🕒 Generating sales_summary from Firestore...")

    sales_docs = db.collection("sales_history").stream()
    sales_summary = defaultdict(lambda: defaultdict(int))

    for doc in sales_docs:
        sale = doc.to_dict()
        for item in sale.get("items", []):
            product_name = item.get("name")
            month = item.get("month")
            qty = item.get("qty", 0)

            # Skip invalid fields
            if not product_name or not isinstance(product_name, str):
                print(f"⚠️ Skipping invalid product name: {product_name}")
                continue
            if not month or not isinstance(month, str):
                print(f"⚠️ Skipping invalid month for product {product_name}: {month}")
                continue

            sales_summary[product_name][month] += int(qty or 0)

    # --- Write sales_summary to Firestore safely ---
    batch = db.batch()
    summary_ref = db.collection("sales_summary")
    updated_count = 0

    for product_name, monthly_sales in sales_summary.items():
        valid_monthly_sales = {
            str(m): int(v) for m, v in monthly_sales.items()
            if isinstance(m, str) and m.strip() != ""
        }

        if not valid_monthly_sales:
            print(f"⚠️ No valid monthly sales data for product {product_name}")
            continue

        doc_ref = summary_ref.document(product_name.strip())
        batch.set(doc_ref, {
            "name": product_name.strip(),
            "monthlySales": valid_monthly_sales,
            "lastUpdated": datetime.utcnow()
        })
        updated_count += 1

    batch.commit()
    print(f"✅ sales_summary updated for {updated_count} products!\n")
    return sales_summary


# --- Update thresholds for all products ---
def update_product_thresholds():
    print("🕒 Updating product thresholds based on sales_summary...")

    products_ref = db.collection("products")
    products = list(products_ref.stream())
    summary_ref = db.collection("sales_summary")
    summaries = {s.to_dict().get("name"): s.to_dict() for s in summary_ref.stream()}

    updated = 0
    for prod in products:
        p = prod.to_dict()
        name = p.get("name")
        lead_time = float(p.get("leadTime", 7))

        if not name or not isinstance(name, str):
            print(f"⚠️ Skipping product with invalid name: {name}")
            continue

        summary = summaries.get(name, {})
        monthly_sales = summary.get("monthlySales", {})
        total_sales = sum(monthly_sales.values())
        avg_sales = total_sales / max(1, len(monthly_sales))

        predicted_threshold = predict_threshold(avg_sales, lead_time)
        products_ref.document(prod.id).update({
            "threshold": int(predicted_threshold),
            "lastThresholdUpdate": datetime.utcnow()
        })
        updated += 1

    print(f"✅ Product thresholds updated successfully for {updated} products!\n")


# --- Main function (used by Cloud Function trigger) ---
def run_stock_replenishment():
    generate_sales_summary()
    update_product_thresholds()
    print("🎯 Stock replenishment pipeline completed successfully!\n")


if __name__ == "__main__":
    run_stock_replenishment()
