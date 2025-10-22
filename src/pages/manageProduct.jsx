import React from 'react';
import { PlusCircle, Edit, Layers } from 'lucide-react';
import { Link, useNavigate } from "react-router-dom";

export default function ManageProduct() {
  const navigate = useNavigate();

  const handleFinish = () => {
    navigate("/dashboard");
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-4xl mx-auto text-center mb-10">
        <h1 className="text-4xl font-extrabold text-orange-600 mb-2">
          Manage Products
        </h1>
        <p className="text-gray-600">
          Easily add, update, or bulk-edit your product listings.
        </p>
      </div>

      {/* Card Grid */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
              Create a new product entry with details.
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
              Edit existing product information or adjust inventory.
            </p>
          </div>
        </Link>

        {/* Bulk Update */}
        <Link
          to="/manage/bulkUpdate"
          className="bg-white border border-gray-200 p-8 rounded-2xl shadow-sm hover:shadow-lg hover:border-orange-400 transition group"
        >
          <div
            className="flex flex-col items-center space-y-3"
            title="Upload a file to update multiple products at once"
          >
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
      </div>

      {/* Finish button */}
      <div className="mt-12 flex justify-center">
        <button
          onClick={handleFinish}
          className="bg-red-500 text-white px-8 py-3 rounded-lg shadow hover:bg-red-600 transition-all font-semibold"
        >
          Finish
        </button>
      </div>
    </div>
  );
}
