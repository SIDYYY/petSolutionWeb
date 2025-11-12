from MachineLearning.deadstock_detector import run_deadstock_detector
from MachineLearning.stock_replenishment_ml import run_stock_replenishment
from google.cloud import firestore
from flask import jsonify

def daily_inventory_analysis(request):
    """
    Manual trigger for daily inventory analysis (deadstock + replenishment).
    Includes CORS support for frontend access.
    """
    # --- Handle CORS preflight (OPTIONS) request ---
    if request.method == "OPTIONS":
        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return ("", 204, headers)

    print("🔔 HTTP trigger received! Starting daily inventory analysis...")

    db = firestore.Client()

    try:
        # --- Run both models ---
        run_deadstock_detector()
        run_stock_replenishment()

        # Log result to Firestore for traceability
        db.collection("system_logs").add({
            "timestamp": firestore.SERVER_TIMESTAMP,
            "status": "success",
            "message": "✅ Daily inventory analysis completed successfully."
        })

        print("✅ Deadstock detection and replenishment update finished.")

        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return (jsonify({"message": "✅ Inventory analysis completed successfully!"}), 200, headers)

    except Exception as e:
        db.collection("system_logs").add({
            "timestamp": firestore.SERVER_TIMESTAMP,
            "status": "error",
            "message": f"❌ Error occurred: {str(e)}"
        })
        print(f"❌ ERROR: {str(e)}")

        headers = {
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
        }
        return (jsonify({"error": str(e)}), 500, headers)
