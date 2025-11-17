import React from "react";

export default function DiscountModal({
  visible,
  type,        
  value,
  onChange,
  onClose,
  onApply,
}) {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white p-5 rounded-xl shadow-xl w-72">
        <h2 className="text-lg font-semibold mb-3 text-center">
          {type === "percent" ? "Percent Discount" : "Cash Discount"}
        </h2>

        <input
          type="number"
          className="w-full border border-gray-300 rounded-lg p-3 text-center text-lg"
          placeholder={type === "percent" ? "%" : "0"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
        />

        <div className="flex gap-3 mt-5">
          <button
            className="flex-1 py-2 border border-gray-400 rounded-lg"
            onClick={onClose}
          >
            Cancel
          </button>

          <button
            className="flex-1 py-2 bg-yellow-500 text-white rounded-lg"
            onClick={onApply}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
