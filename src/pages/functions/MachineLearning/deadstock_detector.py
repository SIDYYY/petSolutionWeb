import pandas as pd
from google.cloud import firestore
from datetime import datetime, timedelta, timezone
from sklearn.cluster import KMeans
import os

# --- Setup ---
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = os.path.join(
    os.path.dirname(__file__), "serviceAccount.json"
)
db = firestore.Client()

# --- Config ---
DEADSTOCK_OVERRIDE_PERCENT = 0.2  # Sell at least 20% of inventory in period -> unmark
LOOKBACK_DAYS = 30  # Only consider recent sales for override
N_CLUSTERS = 2  # Number of K-Means clusters

def run_deadstock_detector():
    print("\n=== 🤖 ADAPTIVE DEADSTOCK DETECTION START ===\n")

    # --- Compute cutoff date (UTC) ---
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    # --- Fetch Firestore sales ---
    sales_docs = db.collection("sales_history").stream()
    sales_data = []

    for doc in sales_docs:
        sale = doc.to_dict()
        sale_date = sale.get("createdAt")
        if sale_date:
            # Ensure timezone-aware datetime
            if hasattr(sale_date, "tzinfo") and sale_date.tzinfo is None:
                sale_date = sale_date.replace(tzinfo=timezone.utc)
            else:
                sale_date = sale_date.astimezone(timezone.utc)
        else:
            continue

        # Only keep sales with items
        for item in sale.get("items", []):
            sales_data.append({
                "productId": item.get("productId"),
                "qty": int(item.get("qty", 0)),
                "date": sale_date
            })

    sales_df = pd.DataFrame(sales_data)

    if sales_df.empty:
        print("⚠️ No sales found!")
        return

    # --- Filter recent sales ---
    recent_sales = sales_df[sales_df["date"] >= cutoff_date]
    if recent_sales.empty:
        print("⚠️ No recent sales in the lookback period!")
        return

    # --- Aggregate recent sales per product ---
    recent_sales_agg = recent_sales.groupby("productId")["qty"].sum().reset_index()

    # --- Fetch only products present in recent sales ---
    product_ids = recent_sales_agg["productId"].tolist()
    products_data = []

    for pid in product_ids:
        doc_snap = db.collection("products").document(pid).get()
        if doc_snap.exists:
            data = doc_snap.to_dict()
            products_data.append({
                "SKU": doc_snap.id,
                "Quantity": int(data.get("qty", 0)),
                "quantitySold": int(data.get("quantitySold", 0))
            })

    if not products_data:
        print("⚠️ No matching products found in Firestore!")
        return

    df = pd.DataFrame(products_data)

    # --- Merge with recent sales ---
    df = df.merge(recent_sales_agg, left_on="SKU", right_on="productId", how="left").fillna(0)
    df["qty"] = df["qty"].fillna(0)

    # --- K-Means Clustering ---
    X = df[["Quantity", "qty"]]
    model = KMeans(n_clusters=N_CLUSTERS, random_state=42)
    df["cluster"] = model.fit_predict(X)

    cluster_means = df.groupby("cluster")[["Quantity", "qty"]].mean()
    deadstock_cluster = int(cluster_means["qty"].idxmin())  # cluster with lowest sales
    print(f"🧩 Deadstock cluster identified: {deadstock_cluster}")

    # --- Update Firestore for only products in recent sales ---
    batch = db.batch()
    updated = 0

    for _, row in df.iterrows():
        pid = str(row["SKU"])
        doc_ref = db.collection("products").document(pid)
        current_doc = doc_ref.get().to_dict()

        inventory = int(current_doc.get("qty", row["Quantity"]))
        recent_qty = int(row["qty"])  # recent sales quantity

        # Determine cluster-based deadstock
        is_cluster_deadstock = (row["cluster"] == deadstock_cluster)

        # Override if enough sales in period
        original_inventory = inventory + recent_qty
        override_deadstock = (recent_qty / max(1, original_inventory)) >= DEADSTOCK_OVERRIDE_PERCENT

        deadstock_flag = is_cluster_deadstock and not override_deadstock

        # Only update if value actually changes
        if current_doc.get("deadstock") != deadstock_flag or current_doc.get("cluster") != row["cluster"]:
            batch.update(doc_ref, {
                "deadstock": deadstock_flag,
                "cluster": int(row["cluster"]),
                "lastEvaluated": firestore.SERVER_TIMESTAMP
            })
            updated += 1

    if updated > 0:
        batch.commit()

    print(f"✅ Adaptive deadstock detection complete. Updated {updated} products.")
    print("=== ✅ DONE ===\n")


if __name__ == "__main__":
    run_deadstock_detector()
