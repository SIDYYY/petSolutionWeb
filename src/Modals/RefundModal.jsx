import React, { useState } from "react";

export default function RefundModal({
  show,
  onClose,
  selectedRefundItems,
  onConfirm,
  adminPassword,
  setAdminPassword,
}) {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-lg border-2 border-orange-400 w-[90%] sm:w-[400px] p-6 sm:p-8 text-center">
        <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-800">
          Admin Authorization Required
        </h2>

        <p className="text-sm text-gray-600 mb-4">
          Refunding this transaction requires admin approval.
        </p>

        {/* Selected Items */}
        <div className="bg-orange-50 p-3 rounded-md mb-4 text-left">
          <p className="font-semibold text-gray-800 mb-2">Selected Refund Items:</p>
          {selectedRefundItems.length === 0 ? (
            <p className="text-gray-600 text-sm">No items selected.</p>
          ) : (
            <ul className="space-y-2">
              {selectedRefundItems.map((r, idx) => (
                <li
                  key={idx}
                  className="flex justify-between items-center bg-white px-3 py-2 rounded-md shadow-sm border border-orange-200"
                >
                  <div>
                    <p className="text-gray-800 font-medium text-sm">{r.name}</p>
                    <p className="text-xs text-gray-400">
                      Original Price: ₱{r.price.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-600">
                      {r.refundQty} pcs × ₱{(r.subtotal / r.qty).toFixed(2)}
                      {r.subtotal < r.price * r.qty ? " (discounted)" : ""}
                    </p>
                  </div>
                  <p className="text-sm font-semibold text-orange-600">
                    ₱{((r.subtotal / r.qty) * r.refundQty).toFixed(2)}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Admin Password */}
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Enter Admin Password
        </label>
        <input
          type="password"
          className="w-full border-b-2 border-gray-300 focus:border-orange-400 outline-none px-2 py-2 mb-4 text-sm text-center"
          placeholder="Enter Admin Password"
          value={adminPassword}
          onChange={(e) => setAdminPassword(e.target.value)}
        />

        <div className="flex justify-center gap-3">
          <button
            onClick={onConfirm}
            className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold text-sm"
          >
            Confirm
          </button>

          <button
            onClick={onClose}
            className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-6 py-2 rounded font-semibold text-sm"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
