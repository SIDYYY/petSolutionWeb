import React, { useEffect, useState } from "react";
import {
  collection,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { db } from "../../../firebase";
import { useForm } from "react-hook-form";
import { Pencil, Trash2, Search, AlertTriangle, X, ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";


export default function ManageProducts() {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [toast, setToast] = useState(null); // ✅ toast alert
  const [confirmModal, setConfirmModal] = useState(null); // ✅ modal confirm
  const { register, handleSubmit, reset } = useForm();

  // Fetch products
  const fetchProducts = async () => {
    const querySnapshot = await getDocs(collection(db, "products"));
    const items = querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));
    setProducts(items);
    setFiltered(items);
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Filter products
  useEffect(() => {
    const lower = search.toLowerCase();
    setFiltered(
      products.filter((prod) => prod.name.toLowerCase().includes(lower))
    );
  }, [search, products]);

  // Update product
  const onSubmit = async (data) => {
    if (!selectedProduct) return;

    setConfirmModal({
      title: "Update Product",
      message: `Are you sure you want to update "${data.name}" to quantity ${data.qty}?`,
      onConfirm: async () => {
        try {
          const productRef = doc(db, "products", selectedProduct.id);
          await updateDoc(productRef, {
            name: data.name,
            qty: Number(data.qty),
          });
          setToast({
            type: "success",
            title: "Product Updated",
            message: `${data.name} has been updated successfully!`,
          });
          reset();
          setSelectedProduct(null);
          fetchProducts();
        } catch (err) {
          console.error("Error updating product:", err);
          setToast({
            type: "error",
            title: "Error",
            message: "Failed to update product.",
          });
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  // Delete product (with confirmation modal)
  const handleDelete = (id) => {
    const prod = products.find((p) => p.id === id);
    setConfirmModal({
      title: "Delete Product",
      message: `Are you sure you want to delete "${prod.name}"? This action cannot be undone.`,
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, "products", id));
          setToast({
            type: "success",
            title: "Product Deleted",
            message: `${prod.name} was successfully deleted.`,
          });
          fetchProducts();
        } catch (err) {
          console.error("Error deleting product:", err);
          setToast({
            type: "error",
            title: "Error",
            message: "Failed to delete product.",
          });
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  return (
    <div className="flex flex-col md:flex-row w-full min-h-screen bg-gray-100 p-4 md:p-6 gap-6 relative">
      {/* 🔙 Back Button */}
    <button
      onClick={() => navigate(-1)}
      className="flex items-center gap-2 px-4 py-2 
                bg-orange-500 hover:bg-orange-600
                text-white font-semibold rounded-xl 
                shadow-md transition-all duration-200 absolute top-4 left-4"
    >
      <ArrowLeft size={18} className="text-white" />
      Back
    </button>

      {/* ✅ Toast Notification */}
      {toast && (
        <div
          className={`fixed top-6 right-6 flex items-start gap-3 px-5 py-3 border rounded-xl shadow-md text-sm animate-slideIn z-50 ${
            toast.type === "success"
              ? "border-green-400 bg-green-50 text-green-800"
              : "border-red-400 bg-red-50 text-red-800"
          }`}
        >
          <AlertTriangle
            className={`mt-[2px] ${
              toast.type === "success" ? "text-green-500" : "text-red-500"
            }`}
            size={20}
          />
          <div>
            <p className="font-semibold">{toast.title}</p>
            <p>{toast.message}</p>
          </div>
          <button
            onClick={() => setToast(null)}
            className="ml-2 text-gray-500 hover:text-gray-700"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ✅ Confirmation Modal */}
      {confirmModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-6 max-w-sm w-full text-center animate-fadeIn">
            <AlertTriangle className="text-orange-500 mx-auto mb-3" size={36} />
            <h2 className="text-lg font-semibold text-gray-800 mb-2">
              {confirmModal.title}
            </h2>
            <p className="text-gray-600 mb-5">{confirmModal.message}</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmModal.onCancel}
                className="px-4 py-2 rounded-lg bg-gray-200 hover:bg-gray-300 transition"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-600 text-white transition"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {/* LEFT SIDE: Update Form */}
      
      <div className="md:w-1/3 w-full bg-white rounded-xl shadow-lg p-6">
      
        <h1 className="text-2xl font-semibold text-gray-800 mt-9">
          {selectedProduct ? "Update Product" : "Select a Product to Edit"}
        </h1>

        {selectedProduct ? (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Product Name
              </label>
              <input
                {...register("name", { required: true })}
                defaultValue={selectedProduct.name}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <div>
              <label className="block font-medium text-gray-700 mb-1">
                Quantity
              </label>
              <input
                {...register("qty", { required: true })}
                type="number"
                defaultValue={selectedProduct.qty}
                className="w-full border border-gray-300 rounded-lg p-3 focus:ring-2 focus:ring-orange-400 outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
            >
              Save Changes
            </button>
          </form>
        ) : (
          <p className="text-gray-500">Select a product to begin editing.</p>
        )}
      </div>

      {/* RIGHT SIDE: Product Table */}
      <div className="flex-1 bg-white rounded-xl shadow-lg p-6 overflow-auto">
        
        <div className="flex justify-between items-center mb-4">
          
          <h2 className="text-2xl font-semibold text-gray-800">Products</h2>

          {/* 🔍 Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-400 outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200 rounded-lg">
            <thead className="bg-orange-500 text-white">
              <tr>
                <th className="py-3 px-4 text-left">Product Name</th>
                <th className="py-3 px-4 text-left">Quantity</th>
                <th className="py-3 px-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((prod) => (
                  <tr
                    key={prod.id}
                    className="border-t hover:bg-gray-50 transition"
                  >
                    <td className="py-3 px-4">{prod.name}</td>
                    <td className="py-3 px-4">{prod.qty}</td>
                    <td className="py-3 px-4 flex justify-center gap-3">
                      <button
                        onClick={() => {
                          setSelectedProduct(prod);
                          reset(prod);
                        }}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        <Pencil size={20} />
                      </button>
                      <button
                        onClick={() => handleDelete(prod.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        <Trash2 size={20} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center text-gray-500 py-6">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(-10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slideIn {
          animation: slideIn 0.3s ease forwards;
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.25s ease forwards;
        }
      `}</style>
    </div>
  );
}
