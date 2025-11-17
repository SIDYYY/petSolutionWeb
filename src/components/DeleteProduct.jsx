import React, { useState } from "react";

export default function DeleteProduct({ cart, setCart, onClose }) {
  const [selected, setSelected] = useState({});

  const toggleSelect = (id) => {
    setSelected((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleDelete = () => {
    const idsToDelete = Object.keys(selected).filter((id) => selected[id]);
    if (idsToDelete.length === 0) return;
    setCart(cart.filter((item) => !idsToDelete.includes(item.id)));
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-3xl max-h-[80vh] rounded-md shadow-lg flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-yellow-200">
          <h2 className="text-lg font-bold text-gray-800">Delete Products</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 font-bold"
          >
            ✕
          </button>
        </div>

        {/* Cart List with Checkboxes on the right */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {cart.length === 0 ? (
            <p className="text-gray-400 text-center">No products in cart.</p>
          ) : (
            cart.map((item) => (
              <div
                key={item.id}
                className="flex justify-between items-center border-b border-yellow-100 px-3 py-2 rounded hover:bg-yellow-50"
              >
                <span className="font-medium text-gray-700 truncate">
                  {item.name} ({item.quantity})
                </span>
                <input
                  type="checkbox"
                  checked={!!selected[item.id]}
                  onChange={() => toggleSelect(item.id)}
                  className="w-4 h-4 accent-yellow-500"
                />
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-yellow-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
