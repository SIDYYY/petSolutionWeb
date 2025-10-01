import React from 'react';
import { PlusCircle, Edit, Layers } from 'lucide-react';
import { Outlet, Link, useNavigate } from "react-router-dom";

export default function ManageProduct() {
  const navigate = useNavigate();

  const handleFinish = () => {
    // When finished, redirect back to Dashboard
    navigate("/dashboard");
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-8 text-center text-orange-600">
        Manage Products
      </h1>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Product */}
        <Link
          to="/manage/addProduct"
          className="bg-white border border-gray-300 p-6 rounded-lg shadow hover:shadow-lg transition group hover:bg-orange-50"
        >
          <div className="flex flex-col items-center space-y-2">
            <PlusCircle
              className="text-orange-500 group-hover:scale-125 transition duration-500 ease-in-out delay-200"
              size={32}
            />
            <span className="text-lg font-semibold text-gray-800">
              Add Product
            </span>
          </div>
        </Link>

        {/* Update Product */}
        <Link
          to="/manage/updateProduct"
          className="bg-white border border-gray-300 p-6 rounded-lg shadow hover:shadow-lg transition group hover:bg-orange-50"
        >
          <div className="flex flex-col items-center space-y-2">
            <Edit
              className="text-orange-500 group-hover:scale-125 transition duration-500 ease-in-out delay-200"
              size={32}
            />
            <span className="text-lg font-semibold text-gray-800">
              Update Product
            </span>
          </div>
        </Link>

        {/* Bulk Update */}
        <Link
          to="/manage/bulkUpdate"
          className="bg-white border border-gray-300 p-6 rounded-lg shadow hover:shadow-lg transition group hover:bg-orange-50"
        >
          <div className="flex flex-col items-center space-y-2"   title="Upload a file to update all products directly">
            <Layers
              className="text-orange-500 group-hover:scale-125 transition duration-500 ease-in-out delay-200"
              size={32}
            />
            <span className="text-lg font-semibold text-gray-800">
              Update Bulk Products
            </span>
          </div>
        </Link>
      </div>

      {/* Finish button */}
      <div className="mt-10 flex justify-center">
        <button
          onClick={handleFinish}
          className="bg-red-500 text-white px-6 py-2 rounded-lg shadow hover:bg-red-600 transition"
        >
          Finish
        </button>
      </div>
    </div>
  );
}
