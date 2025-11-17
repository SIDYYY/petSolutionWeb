import React, { useState } from "react";

export default function WaitingCarts({ waitingCarts, setWaitingCarts, onSelect, onClose }) {
  const [selectedId, setSelectedId] = useState(null);

  const handleSelect = () => {
    if (!selectedId) return;
    const cart = waitingCarts.find(c => c.id === selectedId);
    onSelect(cart);
  };

  const handleDelete = () => {
    if (!selectedId) return;
    setWaitingCarts(prev => prev.filter(c => c.id !== selectedId));
    setSelectedId(null);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-40 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md max-h-[80vh] rounded-md shadow-lg flex flex-col overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-yellow-200">
          <h2 className="text-lg font-bold text-gray-800">Waiting Carts</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {waitingCarts.length === 0 ? (
            <p className="text-gray-400 text-center">No waiting carts.</p>
          ) : (
            waitingCarts.map(cart => (
              <div
                key={cart.id}
                onClick={() => setSelectedId(cart.id)}
                className={`cursor-pointer flex justify-between items-center px-3 py-2 rounded border ${
                  selectedId === cart.id ? "border-yellow-500 bg-yellow-50" : "border-gray-200"
                }`}
              >
                <span className="font-medium text-gray-700 truncate">
                  {cart.name || `Cart ${cart.id.slice(0,4)}`} ({cart.items.length} items)
                </span>
                <input
                  type="radio"
                  checked={selectedId === cart.id}
                  onChange={() => setSelectedId(cart.id)}
                  className="w-4 h-4 accent-yellow-500"
                />
              </div>
            ))
          )}
        </div>

        <div className="p-4 border-t border-yellow-200 flex justify-end gap-2">
          <button onClick={onClose} className="bg-gray-200 hover:bg-gray-300 px-4 py-2 rounded text-sm">Cancel</button>
          <button onClick={handleDelete} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded text-sm">Delete</button>
          <button onClick={handleSelect} className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded text-sm">Resume</button>
        </div>
      </div>
    </div>
  );
}
