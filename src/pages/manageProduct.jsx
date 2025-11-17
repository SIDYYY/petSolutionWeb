import React, { useState, useEffect } from "react";
import { PlusCircle, Edit, Layers, BarChart3, KeyRound } from "lucide-react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

export default function ManageProduct() {
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (location.state?.unlocked) {
      // temporarily allow access
      console.log("Temporarily unlocked for return from ChangeAccess");
    }
  }, [location]);

  const handleFinish = () => {
    navigate("/dashboard");
  };

  const handleRunInventory = async () => {
    setLoading(true);
    toast.loading("Analyzing inventory, please wait...", { id: "inventory" });

    try {
      const res = await fetch(
        "https://asia-southeast1-petsolutionsinventory.cloudfunctions.net/daily_inventory_analysis",
        { method: "POST" }
      );

      const data = await res.json();

      if (res.ok) {
        toast.success(data.message || "✅ Inventory analysis completed successfully!", {
          id: "inventory",
        });
      } else {
        toast.error(data.error || "❌ Inventory analysis failed.", { id: "inventory" });
      }
    } catch (err) {
      console.error(err);
      toast.error("❌ Failed to connect to server.", { id: "inventory" });
    } finally {
      setLoading(false);
    }
  };

 return (
    <div className="min-h-screen flex flex-col items-center pt-10 pb-20 bg-gray-50">
      {/* Toast container */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="text-center mb-20">
        <h1 className="text-4xl font-extrabold text-orange-600 mb-2">Manage Products</h1>
        <p className="text-gray-600 text-lg">
          Add, update, or monitor your product inventory with ease.
        </p>
      </div>

      {/* Custom grid layout */}
      <div
        className="grid grid-cols-5 grid-rows-2 gap-6 w-full max-w-7xl px-4"
        style={{ gridTemplateRows: "auto auto" }}
      >
        {/* Left top: Add Product */}
        <Link
          to="/manage/addProduct"
          className="group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-orange-400 transition"
          style={{ gridColumn: "1 / 2", gridRow: "1 / 2" }}
        >
          <PlusCircle
            className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
            size={40}
          />
          <span className="text-lg font-semibold text-gray-800 mt-3">Add Product</span>
          <p className="text-sm text-gray-500 text-center mt-1">
            Create a new product entry with full details.
          </p>
        </Link>

        {/* Left bottom: Update Product */}
        <Link
          to="/manage/updateProduct"
          className="group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-orange-400 transition"
          style={{ gridColumn: "1 / 2", gridRow: "2 / 3" }}
        >
          <Edit
            className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
            size={40}
          />
          <span className="text-lg font-semibold text-gray-800 mt-3">Update Product</span>
          <p className="text-sm text-gray-500 text-center mt-1">
            Edit existing product details or adjust inventory counts.
          </p>
        </Link>

        {/* Center big card: Run Inventory Analysis */}
        <div
          className="group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-orange-400 transition"
          style={{ gridColumn: "2 / 5", gridRow: "1 / 3" }}
        >
          <BarChart3 size={45} className="text-orange-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Run Daily Inventory Analysis</h2>
          <p className="text-gray-500 text-sm max-w-md mx-auto mb-6">
            Perform a comprehensive analysis using AI-driven stock monitoring to detect deadstock
            and recommend replenishment levels.
          </p>

          <button
            disabled={loading}
            onClick={handleRunInventory}
            className={`bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition-all ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Analyzing..." : "Run Analysis Now"}
          </button>
        </div>

        {/* Right top: Bulk Update */}
        <Link
          to="/manage/bulkUpdate"
          className="group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-orange-400 transition"
          style={{ gridColumn: "5 / 6", gridRow: "1 / 2" }}
        >
          <Layers
            className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
            size={40}
          />
          <span className="text-lg font-semibold text-gray-800 mt-3">Bulk Update</span>
          <p className="text-sm text-gray-500 text-center mt-1">
            Upload a spreadsheet to modify multiple products quickly.
          </p>
        </Link>

        {/* Right bottom: Change Admin Password */}
       <Link
          to="/adminPass"
          className="group bg-white border border-gray-200 p-6 rounded-2xl shadow-sm flex flex-col items-center justify-center text-center hover:shadow-lg hover:border-orange-400 transition"
          style={{ gridColumn: "5 / 6", gridRow: "2 / 3" }}
        >
          <KeyRound
            className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
            size={40}
          />
          <span className="text-lg font-semibold text-gray-800">
            Change Admin Password
          </span>
          <p className="text-sm text-gray-500">
            Update the admin access password securely from here.
          </p>
        </Link>

      </div>
    </div>
  );
}