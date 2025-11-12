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
N_CLUSTERS = 3  # Number of K-Means clusters

def run_deadstock_detector():
    print("\n=== 🤖 ADAPTIVE DEADSTOCK DETECTION START ===\n")

    # --- Fetch products from Firestore (inventory) ---
    products_docs = list(db.collection("products").stream())
    if not products_docs:
        print("⚠️ No products found in Firestore!")
        return

    products_data = []
    for doc in products_docs:
        data = doc.to_dict()
        products_data.append({
            "SKU": doc.id,
            "Quantity": int(data.get("Quantity", 0))
        })

    df = pd.DataFrame(products_data)

    # --- Fetch Firestore sales ---
    sales_docs = db.collection("sales_history").stream()
    sales_data = []
    cutoff_date = datetime.now(timezone.utc) - timedelta(days=LOOKBACK_DAYS)

    for doc in sales_docs:
        sale = doc.to_dict()
        sale_date = sale.get("date")
        if sale_date:
            sale_date = sale_date.replace(tzinfo=None)
        for item in sale.get("items", []):
            sales_data.append({
                "productId": item.get("productId"),
                "qty": int(item.get("qty", 0)),
                "date": sale_date
            })

    sales_df = pd.DataFrame(sales_data)

    if not sales_df.empty:
        # Total sales for clustering (all-time)
        total_sales = sales_df.groupby("productId")["qty"].sum().reset_index()

        # Recent sales for override
        recent_sales = sales_df[sales_df["date"] >= cutoff_date]
        recent_sales = recent_sales.groupby("productId")["qty"].sum().reset_index()
    else:
        total_sales = pd.DataFrame(columns=["productId", "qty"])
        recent_sales = pd.DataFrame(columns=["productId", "qty"])

    # --- Merge products with total sales ---
    df = df.merge(total_sales, left_on="SKU", right_on="productId", how="left").fillna(0)
    df["qty"] = df["qty"].fillna(0)  # total sales for clustering

    # --- K-Means Clustering ---
    X = df[["Quantity", "qty"]]
    model = KMeans(n_clusters=N_CLUSTERS, random_state=42)
    df["cluster"] = model.fit_predict(X)

    cluster_means = df.groupby("cluster")[["Quantity", "qty"]].mean()
    deadstock_cluster = int(cluster_means["qty"].idxmin())  # cluster with lowest sales
    print(f"🧩 Deadstock cluster identified: {deadstock_cluster}")

    # --- Update Firestore ---
    batch = db.batch()
    updated = 0

    for _, row in df.iterrows():
        pid = str(row["SKU"])
        doc_ref = db.collection("products").document(pid)

        if doc_ref.get().exists:
            current_doc = doc_ref.get().to_dict()
            inventory = int(current_doc.get("Quantity", row["Quantity"]))

            # Skip products with 0 inventory
            if inventory == 0:
                deadstock_flag = False
            else:
                # Determine cluster-based deadstock
                is_cluster_deadstock = (row["cluster"] == deadstock_cluster)

                # Determine recent sales override using original inventory
                recent_sale_qty = recent_sales.loc[recent_sales["productId"] == pid, "qty"]
                recent_qty = int(recent_sale_qty.values[0]) if not recent_sale_qty.empty else 0

                original_inventory = inventory + recent_qty  # add back recent sales
                override_deadstock = (recent_qty / max(1, original_inventory)) >= DEADSTOCK_OVERRIDE_PERCENT

                # Final deadstock flag
                deadstock_flag = is_cluster_deadstock and not override_deadstock

            batch.update(doc_ref, {
                "deadstock": deadstock_flag,
                "cluster": int(row["cluster"]),
                "lastEvaluated": firestore.SERVER_TIMESTAMP
            })
            updated += 1

    batch.commit()
    print(f"✅ Adaptive deadstock detection complete. Updated {updated} products.")
    print("=== ✅ DONE ===\n")


if __name__ == "__main__":
    run_deadstock_detector()
