import React, { useState, useRef, useEffect } from "react";

export default function ModeOfPayment({ visible, onSelect, onClose, buttonRef }) {
  const payments = ["Cash", "GCash", "Credit Card", "Debit Card"];
  const [selected, setSelected] = useState(null);
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Position panel under the button
  useEffect(() => {
    if (buttonRef.current && visible) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({ top: rect.bottom + 4 + window.scrollY, left: rect.left + window.scrollX });
    }
  }, [buttonRef, visible]);

  if (!visible) return null;

  const handleSelect = (pay) => {
    setSelected(pay);
    if (onSelect) onSelect(pay);
  };

  return (
    <div
      ref={panelRef}
      style={{ top: position.top, left: position.left }}
      className="absolute z-50 w-[300px] p-2 border border-orange-400 bg-white rounded-md shadow-md"
    >
      <div className="grid grid-cols-2 gap-2">
        {payments.map((pay) => (
          <button
            key={pay}
            onClick={() => handleSelect(pay)}
            className={`py-2 rounded-md border border-orange-400 font-medium transition-colors
              ${selected === pay ? "bg-orange-400 text-white" : "bg-white text-gray-700"}
              hover:bg-orange-400 hover:text-white`}
          >
            {pay}
          </button>
          
        ))}
      </div>
    </div>
  );
}
