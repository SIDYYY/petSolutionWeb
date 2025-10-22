import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  addDoc,
  collection,
  onSnapshot,
  query,
  orderBy,
} from "firebase/firestore";
import { db } from "../../../firebase";
import {
  PackagePlus,
  Box,
  Hash,
  Package,
  Clock,
  AlertTriangle,
  X,
} from "lucide-react";

export default function ManageProduct() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm();

  const [products, setProducts] = useState([]);
  const [toast, setToast] = useState(null); // 🔥 for success/error alert
  const [confirmModal, setConfirmModal] = useState(null); // 🔥 for confirmation modal

  // 🔥 Fetch recent products in real time
  useEffect(() => {
    const q = query(collection(db, "products"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setProducts(items);
    });
    return () => unsubscribe();
  }, []);

  // 🧾 Add product (with modal confirmation + toast)
  const onSubmit = (data) => {
    setConfirmModal({
      title: "Add Product",
      message: `Are you sure you want to add "${data.name}" with quantity ${data.qty}?`,
      onConfirm: async () => {
        const payload = {
          ...data,
          qty: Number(data.qty),
          createdAt: new Date(),
        };
        try {
          await addDoc(collection(db, "products"), payload);
          setToast({
            type: "success",
            title: "Product Added",
            message: `${data.name} was successfully added!`,
          });
          reset();
        } catch (err) {
          console.error("Error adding product:", err);
          setToast({
            type: "error",
            title: "Error",
            message: "Failed to add product.",
          });
        }
        setConfirmModal(null);
      },
      onCancel: () => setConfirmModal(null),
    });
  };

  return (
    <div className="h-screen flex flex-col bg-gray-100 overflow-hidden relative">
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

      {/* HEADER */}
      <header className="bg-white shadow-sm py-4 px-6 flex flex-col sm:flex-row sm:items-center sm:justify-between border-b border-gray-200">
        <h1 className="text-2xl font-semibold text-gray-800 flex items-center gap-2">
          <PackagePlus className="text-orange-500" size={26} />
          Manage Products
        </h1>
        <button
          onClick={() => reset()}
          className="text-sm text-gray-600 hover:text-orange-500 transition"
        >
          Clear Form
        </button>
      </header>

      {/* MAIN CONTENT */}
      <main className="flex-1 flex flex-row bg-white overflow-hidden">
        {/* LEFT SIDE FORM */}
        <section className="w-full sm:w-[40%] lg:w-[35%] xl:w-[30%] border-r border-gray-200 p-8 sm:p-10 overflow-y-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-8 flex items-center gap-3">
            <Box className="text-orange-500" size={24} />
            Add New Product
          </h2>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
            {/* Product Name */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Product Name
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl p-3 focus-within:ring-2 focus-within:ring-orange-400 bg-white transition">
                <Box className="text-gray-400" size={20} />
                <input
                  {...register("name", { required: "Product name is required" })}
                  placeholder="Enter product name"
                  className="w-full outline-none text-gray-700 placeholder-gray-400 text-base"
                />
              </div>
              {errors.name && (
                <p className="text-sm text-red-600 mt-2">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Quantity */}
            <div>
              <label className="block text-gray-700 font-semibold mb-2">
                Quantity
              </label>
              <div className="flex items-center gap-3 border border-gray-300 rounded-xl p-3 focus-within:ring-2 focus-within:ring-orange-400 bg-white transition">
                <Hash className="text-gray-400" size={20} />
                <input
                  {...register("qty", {
                    required: "Quantity is required",
                    valueAsNumber: true,
                  })}
                  type="number"
                  placeholder="Enter quantity"
                  className="w-full outline-none text-gray-700 placeholder-gray-400 text-base"
                />
              </div>
              {errors.qty && (
                <p className="text-sm text-red-600 mt-2">
                  {errors.qty.message}
                </p>
              )}
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              className="w-full flex justify-center items-center gap-3 bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded-xl shadow-md transition-all duration-200"
            >
              <PackagePlus size={20} />
              Save Product
            </button>
          </form>
        </section>

        {/* RIGHT SIDE - Product List */}
        <section className="hidden sm:flex flex-1 flex-col bg-gray-50 p-8 overflow-y-auto">
          <h2 className="text-xl font-semibold text-gray-800 mb-6 flex items-center gap-2">
            <Package className="text-orange-500" size={22} />
            Recently Added Products
          </h2>

          {products.length === 0 ? (
            <p className="text-gray-400 italic text-center mt-20">
              No products added yet.
            </p>
          ) : (
            <div className="space-y-4">
              {products.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-all flex flex-col sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="text-lg font-semibold text-gray-800">
                      {item.name}
                    </p>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <Hash size={14} />
                      Quantity: {item.qty}
                    </p>
                  </div>
                  <div className="text-xs text-gray-400 flex items-center gap-1 mt-2 sm:mt-0">
                    <Clock size={12} />
                    {item.createdAt?.toDate
                      ? item.createdAt.toDate().toLocaleString()
                      : new Date(item.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

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
