import React, { useState, useEffect } from "react";

export default function CashReceivedModal({ visible, total, onClose, onConfirm }) {
  const [cashReceived, setCashReceived] = useState("");
  const [change, setChange] = useState(0);

  useEffect(() => {
    const cash = parseFloat(cashReceived);
    if (!isNaN(cash)) {
      setChange(Math.max(cash - total, 0));
    } else {
      setChange(0);
    }
  }, [cashReceived, total]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg border-2 border-orange-400 w-[90%] sm:w-[400px] p-6 sm:p-8 text-center">
        <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-800">Cash Received</h2>
        <p className="text-sm text-gray-600 mb-4">Enter the amount of cash received from the customer.</p>

        <input
          type="number"
          value={cashReceived}
          onChange={(e) => setCashReceived(e.target.value)}
          placeholder="₱0.00"
          className="w-full border-b-2 border-gray-300 focus:border-orange-400 outline-none px-2 py-2 mb-4 text-sm text-center"
        />

        <div className="mb-4 text-gray-700 font-semibold">
          Change Due: <span className="text-orange-600">₱{change.toFixed(2)}</span>
        </div>

        <div className="flex justify-center gap-3">
          <button
            onClick={() => {
              onConfirm(parseFloat(cashReceived), change);
              setCashReceived("");
            }}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold text-sm"
          >
            Confirm
          </button>
          <button
            onClick={() => {
              onClose();
              setCashReceived("");
            }}
            className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-6 py-2 rounded font-semibold text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
