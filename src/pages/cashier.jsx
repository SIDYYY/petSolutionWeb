import React, { useState, useEffect, useRef } from "react";
import { collection, getDocs } from "firebase/firestore";
import { db } from "../../firebase";
import { Search, Trash2, Plus, CreditCard, DollarSign } from "lucide-react";
import { useNavigate } from "react-router-dom";
import DeleteProduct from "../components/DeleteProduct";
import WaitingCarts from "../components/WaitingCarts";
import DiscountModal from "../Modals/DiscountModal";
import DiscountTypeMenu from "../components/DiscountTypeMenu";
import ModeOfPayment from "../components/ModeOfPayment";
import { processPayment } from "../services/Payment";
import CashReceivedModal from "../Modals/CashReceivedModal";

export default function Cashier() {
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [message, setMessage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [waitingCarts, setWaitingCarts] = useState([]);
  const [showWaiting, setShowWaiting] = useState(false);
  const [showPayment, setShowPayment] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState(null);

  const [discount, setDiscount] = useState(null);
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [discountType, setDiscountType] = useState(null);
  const [discountValue, setDiscountValue] = useState("");

  const [showCashModal, setShowCashModal] = useState(false);
  // store cashReceived as number (0 default) to avoid string issues
  const [cashReceived, setCashReceived] = useState(0);
  const [changeDue, setChangeDue] = useState(null);

  const [showDiscount, setShowDiscount] = useState(false);
  const discountButtonRef = useRef(null);
  const paymentButtonRef = useRef(null);
  const searchRef = useRef(null);
  const navigate = useNavigate();

  // Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllProducts(items);
    };
    fetchProducts();
  }, []);

  // Search
  useEffect(() => {
    if (!search.trim()) return setProducts([]);
    const keywords = search.toLowerCase().split(" ").filter(Boolean);
    const results = allProducts.filter((p) =>
      keywords.every(
        (word) =>
          p.name?.toLowerCase().includes(word) ||
          (p.sku || "").toLowerCase().includes(word)
      )
    );
    setProducts(results);
    setShowDropdown(true);
  }, [search, allProducts]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Cart actions
  const addToCart = (product) => {
    if (product.qty <= 0) return setMessage("❌ No stock available!");
    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.qty) {
          setMessage("❌ Not enough stock!");
          return prev;
        }
        return prev.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setSearch("");
    setShowDropdown(false);
    setMessage(null);
  };

  const updateQuantity = (id, change) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.id === id) {
          const newQty = item.quantity + change;
          if (newQty < 1) return item;
          if (newQty > item.qty) {
            setMessage("❌ Exceeds available stock!");
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      })
    );
  };

  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  const totalPrice = cart.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);

  // compute total after discount, clamp to 0 (no negative totals)
  const _rawTotalAfterDiscount = discount
    ? discount.type === "percent"
      ? totalPrice - totalPrice * (parseFloat(discount.value) / 100)
      : totalPrice - parseFloat(discount.value)
    : totalPrice;
  const totalAfterDiscount = Math.max(0, Number.isFinite(_rawTotalAfterDiscount) ? _rawTotalAfterDiscount : totalPrice);

  // Recompute changeDue automatically whenever cashReceived OR totalAfterDiscount changes
  useEffect(() => {
    // ensure cashReceived is numeric
    const cashNum = Number(cashReceived) || 0;
    if (cashNum > 0) {
      const newChange = cashNum - totalAfterDiscount;
      setChangeDue(newChange >= 0 ? newChange : 0);
    } else {
      setChangeDue(null);
    }
  }, [cashReceived, totalAfterDiscount]);

  return (
    <div className="flex flex-col bg-white overflow-hidden h-full">
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT PANEL */}
        <div className="flex-[4] flex flex-col border border-orange-200 min-h-0">
          {/* Search */}
          <div className="p-4">
            <div ref={searchRef} className="relative w-full max-w-4xl">
              <div className="flex items-center gap-3 border border-orange-200 rounded-md px-3 py-2 bg-white">
                <Search className="text-yellow-500" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product by name"
                  className="w-full bg-transparent outline-none text-gray-700 text-sm"
                />
              </div>

              {showDropdown && products.length > 0 && (
                <div className="absolute left-0 right-0 mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto z-40">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="flex justify-between items-center px-4 py-2 hover:bg-yellow-50 cursor-pointer text-sm"
                    >
                      <span className="truncate">{p.name}</span>
                      <span className="text-gray-500">Stock: {p.qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Table Header */}
          <div className="px-4">
            <div className="grid grid-cols-12 text-sm font-semibold text-gray-800 border-b border-orange-200 pb-2">
              <div className="col-span-6">Product name</div>
              <div className="col-span-2 text-center">Quantity</div>
              <div className="col-span-2 text-right">Price</div>
              <div className="col-span-2 text-right">Amount</div>
            </div>
          </div>

          {/* Cart List */}
          <div className="flex-1 min-h-0 overflow-y-auto p-6">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400">
                <div className="text-3xl font-medium">No items</div>
                <div className="text-sm mt-2">add products to receipt using search</div>
              </div>
            ) : (
              <div className="space-y-2">
                {cart.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-12 items-center py-3 border-t border-yellow-100 text-sm"
                  >
                    <div className="col-span-6">
                      <div className="font-medium text-gray-700 truncate">{item.name}</div>
                      <div className="text-xs text-gray-400">Stock: {item.qty}</div>
                    </div>
                    <div className="col-span-2 flex justify-center items-center gap-2">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-2 py-1 rounded"
                      >
                        –
                      </button>
                      <span className="w-6 text-center font-semibold">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="bg-yellow-50 border border-yellow-200 text-yellow-600 px-2 py-1 rounded"
                      >
                        +
                      </button>
                    </div>
                    <div className="col-span-2 text-right">₱{(item.price || 0).toFixed(2)}</div>
                    <div className="col-span-2 text-right">₱{((item.price || 0) * item.quantity).toFixed(2)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-6 mb-2 space-y-1 text-sm font-semibold">
            <div>
              <span className="text-gray-600">Discount: </span>
              <span className="text-orange-500">
                {discount
                  ? discount.type === "percent"
                    ? `${discount.value}%`
                    : `₱${discount.value}`
                  : "None"}
              </span>
            </div>

            <div>
              <span className="text-gray-600">Payment Method: </span>
              <span className="text-orange-500">{paymentMethod ? paymentMethod : "None"}</span>
            </div>
          </div>

          {/* Bottom Totals */}
          <div className="px-6 pb-6">
            <div className="border-t border-yellow-200 pt-4 flex flex-col items-end gap-2">
              {/* Total */}
              <div className="w-[320px] flex justify-between text-lg font-bold text-gray-900">
                <span>TOTAL</span>
                <span>₱{totalAfterDiscount.toFixed(2)}</span>
              </div>

              {/* Cash Received & Change Due */}
              {cashReceived > 0 && (
                <div className="w-[320px] flex flex-col gap-1 mt-2 text-right">
                  <div className="flex justify-between text-xl text-gray-700">
                    <span>Cash Received:</span>
                    <span>₱{Number(cashReceived).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-xl font-semibold text-red-600">
                    <span>Change Due:</span>
                    <span>₱{(changeDue ?? 0).toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT PANEL */}
        <div className="flex-[1] p-4 bg-white min-h-0 flex flex-col gap-3">
          {/* Top Actions */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setShowDelete(true)}
              className="flex flex-col items-center justify-center border bg-red-400 border-red-500 rounded-sm p-4 hover:bg-red-300 text-sm"
            >
              <Trash2 className="mb-2 text-2xl text-white" />
              <div className="text-xs text-white">Delete</div>
            </button>

            <button
              onClick={() => {
                if (cart.length === 0) {
                  // Show toast if no products
                  setMessage("❌ No products to save");
                  setTimeout(() => setMessage(null), 2000);
                  return; // stop further execution
                }

                // Save current cart to waiting carts
                const id = crypto.randomUUID();
                setWaitingCarts((prev) => [...prev, { id, items: cart }]);
                setCart([]);
                setMessage("🟡 Current cart saved to waiting carts.");
                setTimeout(() => setMessage(null), 2000);
              }}
              className="flex flex-col items-center justify-center border border-yellow-300 rounded-sm p-4 hover:bg-yellow-50 text-sm"
            >
              <Plus className="mb-2 text-2xl text-gray-500" />
              <div className="text-xs text-gray-700">New Cart</div>
            </button>

            <button
              onClick={() => setShowWaiting(true)}
              className="flex flex-col items-center justify-center border border-yellow-300 rounded-sm p-4 hover:bg-yellow-50 text-sm"
            >
              <div className="mb-2 text-2xl text-gray-500">⏳</div>
              <div className="text-xs text-gray-700">Waiting</div>
            </button>

            <button
              ref={discountButtonRef}
              onClick={() => {
                if (cart.length === 0) {
                  setMessage("❌ Add products to apply discount");
                  setTimeout(() => setMessage(null), 2000);
                  return;
                }
                setShowDiscount(true);
              }}
              className="flex flex-col items-center justify-center border border-yellow-300 rounded-sm p-4 hover:bg-yellow-50 text-sm"
            >
              <div className="mb-2 text-2xl text-red-500">🏷️</div>
              <div className="text-xs text-gray-700">Discount</div>
            </button>
          </div>

          <button
              ref={paymentButtonRef}
              onClick={() => setShowPayment(!showPayment)}
            className="w-full flex flex-col items-center justify-center gap-2
               bg-orange-500 hover:bg-orange-600 text-white
               rounded-lg py-4 font-semibold shadow"
            >
              <div className="flex items-center gap-2">
                <CreditCard size={20} className="text-white" />
                <span>Mode of Payment</span>
              </div>
            </button>

          {/* Cash Received */}
          <button
            onClick={() => setShowCashModal(true)}
            className="w-full flex flex-col items-center justify-center gap-2
               bg-green-500 hover:bg-green-600 text-white
               rounded-lg py-4 font-semibold shadow"
          >
            <div className="flex items-center gap-2">
              <DollarSign size={20} className="text-white" />
              <span>Cash Received</span>
            </div>
          </button>

          {/* Sales History */}
          <button
            onClick={() => navigate("/SalesHistory")}
            className="w-full flex flex-col items-center justify-center gap-2
               border border-orange-500 hover:bg-orange-600 text-gray-800
               rounded-lg py-4 font-semibold shadow hover:text-white"
          >
            <span>Sales History</span>
          </button>


          <button
          onClick={() => {
            // Check if cart is empty
            if (cart.length === 0) {
              setMessage("❌ Add products first");
              setTimeout(() => setMessage(null), 2000);
              return;
            }

            // Check if payment method is selected
            if (!paymentMethod) {
              setMessage("❌ Select a payment method first");
              setTimeout(() => setMessage(null), 3000);
              // Optionally, highlight the button
              paymentButtonRef.current?.classList.add("ring-2", "ring-red-500");
              setTimeout(() => paymentButtonRef.current?.classList.remove("ring-2", "ring-red-500"), 2000);
              return;
            }

            // If cash payment, ensure cash received
            if (paymentMethod === "Cash" && (!cashReceived || cashReceived < totalAfterDiscount)) {
              setMessage("❌ Enter sufficient cash received");
              setTimeout(() => setMessage(null), 3000);
              // Highlight the Cash Received button
              setShowCashModal(true); 
              return;
            }

            
            processPayment({
              cart,
              discount,
              paymentMethod,
              setCart,
              setDiscount,
              setDiscountValue,
              setPaymentMethod,
              setMessage,
            });
          }}
          className="mt-auto bg-orange-500 hover:bg-yellow-600 text-white rounded-sm py-4 text-lg font-bold flex items-center justify-center"
        >
          <div className="text-sm mr-3">Payment</div>
        </button>

        </div>
      </div>

      <DiscountTypeMenu
        visible={showDiscount}
        buttonRef={discountButtonRef}
        onSelect={(type) => {
          setDiscountType(type);
          setShowDiscount(false);
          setShowDiscountModal(true);
        }}
        onClose={() => setShowDiscount(false)}
      />

      {showDelete && <DeleteProduct cart={cart} setCart={setCart} onClose={() => setShowDelete(false)} />}
      {showWaiting && (
        <WaitingCarts
          waitingCarts={waitingCarts}
          setWaitingCarts={setWaitingCarts}
          onSelect={(cartData) => {
            setCart(cartData.items);
            setWaitingCarts((prev) => prev.filter((c) => c.id !== cartData.id));
            setShowWaiting(false);
          }}
          onClose={() => setShowWaiting(false)}
        />
      )}
      <CashReceivedModal
        visible={showCashModal}
        total={totalAfterDiscount}
        onClose={() => setShowCashModal(false)}
        onConfirm={(cash, change) => {
          // ensure numeric
          const cashNum = Number(cash) || 0;
          setCashReceived(cashNum);
          // We don't need to rely on `change` from modal — our effect will compute it,
          // but we can set it immediately too for UI responsiveness.
          const newChange = cashNum - totalAfterDiscount;
          setChangeDue(newChange >= 0 ? newChange : 0);
          setShowCashModal(false);
          setMessage(`🟡 Cash received: ₱${cashNum.toFixed(2)}, Change due: ₱${(newChange >= 0 ? newChange : 0).toFixed(2)}`);
          setTimeout(() => setMessage(null), 3000);
        }}
      />

      <ModeOfPayment
        visible={showPayment}
        buttonRef={paymentButtonRef}
        onSelect={(method) => {
          setPaymentMethod(method);
          setShowPayment(false);
        }}
        onClose={() => setShowPayment(false)}
      />

      <DiscountModal
        visible={showDiscountModal}
        type={discountType}
        value={discountValue}
        onChange={(val) => setDiscountValue(val)}
        onClose={() => setShowDiscountModal(false)}
        onApply={() => {
          setDiscount({
            type: discountType,
            value: discountValue,
          });
          setShowDiscountModal(false);
          // changeDue will update automatically via the effect that watches totalAfterDiscount
        }}
      />

      {message && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-start gap-3 border-l-4 rounded-md shadow-lg p-4 w-[320px]
          ${message.includes("✅") ? "border-green-600 bg-green-50 text-green-800" : ""}
          ${message.includes("❌") ? "border-red-600 bg-red-50 text-red-800" : ""}
          ${message.includes("🟡") ? "border-yellow-500 bg-yellow-50 text-yellow-800" : ""}`}
        >
          <div className="flex-1">
            <p className="font-semibold">{message.includes("✅") ? "Success" : message.includes("❌") ? "Error" : "Info"}</p>
            <p className="text-sm">{message.replace(/[✅❌🟡]/g, "").trim()}</p>
          </div>
          <button onClick={() => setMessage(null)} className="ml-2 text-gray-400 hover:text-gray-600">✕</button>
        </div>
      )}
    </div>
  );
}

function ActionBox({ label, hint, icon, onClick }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center border border-yellow-300 rounded-sm p-4 hover:bg-yellow-50 text-sm"
    >
      <div className="mb-2 text-2xl text-gray-500">{icon}</div>
      <div className="text-xs text-gray-700">{label}</div>
      {hint && <div className="text-[10px] text-gray-400 mt-1">{hint}</div>}
    </button>
  );
}
