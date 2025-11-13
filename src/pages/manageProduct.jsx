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
    <div className="h-full flex flex-col justify-center items-center">
      {/* Toast container */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Header */}
      <div className="text-center mb-10">
        <h1 className="text-4xl font-extrabold text-orange-600 mb-3">
          Manage Products
        </h1>
        <p className="text-gray-600 text-lg">
          Add, update, or monitor your product inventory with ease.
        </p>
      </div>

      {/* Card Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8 mb-10">
        {/* Add Product */}
        <Link
          to="/manage/addProduct"
          className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-orange-400 transition group"
        >
          <div className="flex flex-col items-center space-y-3">
            <PlusCircle
              className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
              size={40}
            />
            <span className="text-lg font-semibold text-gray-800 group-hover:text-orange-600">
              Add Product
            </span>
            <p className="text-sm text-gray-500 text-center">
              Create a new product entry with full details.
            </p>
          </div>
        </Link>

        {/* Update Product */}
        <Link
          to="/manage/updateProduct"
          className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-orange-400 transition group"
        >
          <div className="flex flex-col items-center space-y-3">
            <Edit
              className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
              size={40}
            />
            <span className="text-lg font-semibold text-gray-800 group-hover:text-orange-600">
              Update Product
            </span>
            <p className="text-sm text-gray-500 text-center">
              Edit existing product details or adjust inventory counts.
            </p>
          </div>
        </Link>

        {/* Bulk Update */}
        <Link
          to="/manage/bulkUpdate"
          className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-orange-400 transition group"
        >
          <div className="flex flex-col items-center space-y-3">
            <Layers
              className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
              size={40}
            />
            <span className="text-lg font-semibold text-gray-800 group-hover:text-orange-600">
              Bulk Update
            </span>
            <p className="text-sm text-gray-500 text-center">
              Upload a spreadsheet to modify multiple products quickly.
            </p>
          </div>
        </Link>

        {/* 🔐 Admin Password Management */}
        <Link
          to="/adminPass"
          className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-orange-400 transition group"
        >
          <div className="flex flex-col items-center space-y-3">
            <KeyRound
              className="text-orange-500 group-hover:scale-125 transition-transform duration-300"
              size={40}
            />
            <span className="text-lg font-semibold text-gray-800 group-hover:text-orange-600">
              Change Admin Password
            </span>
            <p className="text-sm text-gray-500 text-center">
              Update the admin access password securely from here.
            </p>
          </div>
        </Link>
      </div>

      {/* Inventory Analysis Section */}
      <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-10 text-center max-w-md">
        <div className="flex flex-col items-center space-y-4">
          <BarChart3 size={45} className="text-orange-500" />
          <h2 className="text-2xl font-bold text-gray-800">
            Run Daily Inventory Analysis
          </h2>
          <p className="text-gray-500 text-sm max-w-sm">
            Perform a comprehensive analysis using AI-driven stock monitoring to
            detect deadstock and recommend replenishment levels.
          </p>

          <button
            disabled={loading}
            onClick={handleRunInventory}
            className={`mt-4 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-6 rounded-lg shadow transition-all ${
              loading ? "opacity-60 cursor-not-allowed" : ""
            }`}
          >
            {loading ? "Analyzing..." : "Run Analysis Now"}
          </button>
        </div>
      </div>
    </div>
  );
}
