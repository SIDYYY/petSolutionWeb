import React from "react";

export default function DiscountTypeMenu({
  visible,
  buttonRef,
  onSelect,
  onClose,
}) {
  if (!visible) return null;

  return (
    <div
      className="absolute z-50 mt-2 bg-white border border-orange-200 shadow-md rounded-md w-40"
      style={{
        left: buttonRef.current?.getBoundingClientRect().left,
        top: buttonRef.current?.getBoundingClientRect().bottom + 8,
      }}
    >
      <button
        onClick={() => onSelect("percent")}
        className="w-full px-4 py-2 text-left hover:bg-orange-50 text-sm"
      >
        Percent (%)
      </button>

      <button
        onClick={() => onSelect("cash")}
        className="w-full px-4 py-2 text-left hover:bg-orange-50 text-sm"
      >
        Cash Amount
      </button>

      <button
        onClick={onClose}
        className="w-full px-4 py-2 text-left text-gray-500 hover:bg-gray-100 text-sm"
      >
        Cancel
      </button>
    </div>
  );
}
