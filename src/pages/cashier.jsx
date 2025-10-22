import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { Search, Trash2 } from "lucide-react";
import { useLocation } from "react-router-dom";


export default function Cashier() {
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [adminPassword, setAdminPassword] = useState("");
  const searchRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
  const query = new URLSearchParams(location.search);
  if (query.get("view") === "sales") {
    fetchSalesHistory(); // Load sales
    setShowSalesHistory(true); // Show sales history immediately
  }
}, [location]);

  // ✅ FETCH PRODUCTS
  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllProducts(items);
    };
    fetchProducts();
  }, []);

  // ✅ FETCH SALES HISTORY
  const fetchSalesHistory = async () => {
    const snap = await getDocs(collection(db, "sales_history"));
    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

    // 🔥 Flatten all sales into individual product rows
    let flattened = [];
    sales.forEach((sale) => {
      if (Array.isArray(sale.items)) {
        sale.items.forEach((item) => {
          flattened.push({
            saleId: sale.id,
            date: sale.createdAt?.seconds
              ? new Date(sale.createdAt.seconds * 1000).toLocaleString()
              : "—",
            name: item.name,
            qty: item.qty,
            subtotal: item.subtotal || item.price * item.qty,
            status: sale.status || "completed",
          });
        });
      }
    });

    // Sort by most recent
    flattened.sort((a, b) => new Date(b.date) - new Date(a.date));
    setSalesHistory(flattened);
  };

  // ✅ SEARCH PRODUCTS
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

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ✅ ADD TO CART
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
    setShowDropdown(false);
    setSearch("");
    setMessage(null);
  };

  // ✅ UPDATE QUANTITY
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

  // ✅ REMOVE FROM CART
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // ✅ COMPLETE PURCHASE
  const completePurchase = async () => {
    if (cart.length === 0) {
      setMessage("⚠️ No products in cart! Please add an item first.");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const monthKey = new Date().toISOString().slice(0, 7);
      for (const item of cart) {
        const ref = doc(db, "products", item.id);
        const snap = await getDoc(ref);
        const current = snap.data();
        await updateDoc(ref, {
          qty: current.qty - item.quantity,
          [`monthlySales.${monthKey}`]:
            (current.monthlySales?.[monthKey] || 0) + item.quantity,
        });
      }

      const saleItems = cart.map((i) => ({
        productId: i.id,
        name: i.name,
        qty: i.quantity,
        price: i.price,
        subtotal: i.price * i.quantity,
      }));
      const total = saleItems.reduce((s, i) => s + i.subtotal, 0);
      await addDoc(collection(db, "sales_history"), {
        items: saleItems,
        total,
        month: monthKey,
        status: "completed",
        createdAt: serverTimestamp(),
      });
      setCart([]);
      setMessage("✅ Purchase completed!");
    } catch (err) {
      console.error(err);
      setMessage("❌ Error completing purchase.");
    }
  };

  // ✅ REFUND HANDLER (MODAL)
  const openRefundModal = (sale) => {
    setSelectedSale(sale);
    setShowRefundModal(true);
  };

  const confirmRefund = async () => {
    if (adminPassword !== "admin123") {
      setMessage("❌ Incorrect admin password!");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const saleRef = doc(db, "sales_history", selectedSale.saleId);
      await updateDoc(saleRef, { status: "refunded" });
      fetchSalesHistory();
      setShowRefundModal(false);
      setAdminPassword("");
      setMessage("✅ Sale refunded successfully!");
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      setMessage("❌ Failed to refund sale.");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  const totalPrice = cart.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);

  return (
    <div className="h-full w-full bg-white flex flex-col lg:flex-row justify-between items-start p-3 sm:p-4 md:p-6 overflow-hidden">
      {/* ✅ MESSAGE POPUP */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-start gap-3 border-l-4 rounded-md shadow-lg p-4 w-[300px] 
          ${message.includes("✅") ? "border-green-600 bg-green-50 text-green-800" : ""} 
          ${message.includes("❌") ? "border-red-600 bg-red-50 text-red-800" : ""} 
          ${message.includes("⚠️") ? "border-yellow-500 bg-yellow-50 text-yellow-800" : ""}`}
        >
          <div className="flex-1">
            <p className="font-semibold">
              {message.includes("✅")
                ? "Success"
                : message.includes("❌")
                ? "Error"
                : "Notice"}
            </p>
            <p className="text-sm">{message.replace(/[✅❌⚠️]/g, "").trim()}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row w-full gap-4 overflow-hidden">
        {/* ✅ LEFT SIDE TABLE */}
        <div className="flex-1 border border-orange-300 rounded-md bg-white shadow-sm flex flex-col overflow-hidden">

          {!showSalesHistory && (
            <div ref={searchRef} className="relative p-3 sm:p-4 border-b border-orange-200">
              <div className="flex items-center gap-2 border border-orange-300 bg-orange-50 rounded-md px-3 py-2">
                <Search className="text-orange-500" size={18} />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search product by name"
                  className="w-full bg-transparent outline-none text-gray-700 text-sm"
                />
              </div>
              {showDropdown && products.length > 0 && (
                <div className="absolute left-3 right-3 z-30 mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      onClick={() => addToCart(p)}
                      className="flex justify-between items-center px-4 py-2 hover:bg-orange-50 cursor-pointer text-sm"
                    >
                      <span>{p.name}</span>
                      <span className="text-gray-500">Stock: {p.qty}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* ✅ TABLE HEADER */}
          <div className="hidden sm:grid grid-cols-12 font-semibold text-orange-500 border-b border-orange-300 px-4 py-2 text-xs sm:text-sm">
            {!showSalesHistory ? (
              <>
                <div className="col-span-5">Product name</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Price</div>
                <div className="col-span-2 text-right">Amount</div>
                <div className="col-span-1"></div>
              </>
            ) : (
              <>
                <div className="col-span-3">Date</div>
                <div className="col-span-3 text-left">Product</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Total</div>
                <div className="col-span-2 text-center">Action</div>
              </>
            )}
          </div>

          {/* ✅ TABLE BODY */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {!showSalesHistory ? (
              cart.length === 0 ? (
                <div className="text-center text-gray-400 py-24 text-sm">
                  <div className="text-base font-medium">No items</div>
                  <div className="text-xs mt-2">
                    Add products using the search bar above
                  </div>
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.id}
                    className="grid grid-cols-2 sm:grid-cols-12 items-center py-2 border-b last:border-b-0 text-sm"
                  >
                    <div className="sm:col-span-5 text-left">
                      <div className="font-medium text-gray-700">{item.name}</div>
                      <div className="text-xs text-gray-400">Stock: {item.qty}</div>
                    </div>
                    <div className="flex sm:col-span-2 justify-center items-center gap-2 mt-2 sm:mt-0">
                      <button
                        onClick={() => updateQuantity(item.id, -1)}
                        className="bg-orange-100 text-orange-600 px-2 py-1 rounded hover:bg-orange-200"
                      >
                        –
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.id, 1)}
                        className="bg-orange-100 text-orange-600 px-2 py-1 rounded hover:bg-orange-200"
                      >
                        +
                      </button>
                    </div>
                    <div className="hidden sm:block sm:col-span-2 text-right">
                      ₱{item.price.toFixed(2)}
                    </div>
                    <div className="hidden sm:block sm:col-span-2 text-right">
                      ₱{(item.price * item.quantity).toFixed(2)}
                    </div>
                    <div className="text-right sm:col-span-1">
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )
            ) : (
              salesHistory.map((sale, index) => (
                <div
                  key={index}
                  className="grid grid-cols-1 sm:grid-cols-12 items-center py-2 border-b text-xs sm:text-sm"
                >
                  <div className="sm:col-span-3">{sale.date}</div>
                  <div className="sm:col-span-3 text-left">{sale.name}</div>
                  <div className="sm:col-span-2 text-center">{sale.qty}</div>
                  <div className="sm:col-span-2 text-right">
                    ₱{sale.subtotal?.toFixed(2) || 0}
                  </div>
                  <div className="sm:col-span-2 text-center">
                    {sale.status === "completed" ? (
                      <button
                        onClick={() => openRefundModal(sale)}
                        className="text-orange-500 hover:text-orange-700 font-medium"
                      >
                        Refund
                      </button>
                    ) : (
                      <span className="text-red-500 font-semibold">Refunded</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>

          {!showSalesHistory && (
            <div className="border-t border-orange-300 p-3 sm:p-4 text-right">
              <div className="text-xs sm:text-sm text-gray-600">TOTAL</div>
              <div className="text-lg sm:text-2xl font-bold text-gray-800">
                ₱{totalPrice.toFixed(2)}
              </div>
            </div>
          )}
        </div>

        {/* ✅ BUTTONS */}
        <div className="flex flex-wrap lg:flex-col justify-center lg:justify-start items-stretch gap-3 mt-4 lg:mt-0 w-full lg:w-[250px]">
          <button
            onClick={() => {
              if (showSalesHistory) {
                setShowSalesHistory(false);
              } else {
                fetchSalesHistory();
                setShowSalesHistory(true);
              }
            }}
            className="w-full border border-orange-400 text-orange-500 font-semibold py-3 rounded hover:bg-orange-50 transition"
          >
            {showSalesHistory ? "Back to POS" : "Sales History"}
          </button>

          {!showSalesHistory && (
            <button
              onClick={completePurchase}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded transition"
            >
              Complete Purchase
            </button>
          )}
        </div>
      </div>

      {/* 🟠 REFUND MODAL */}
      {showRefundModal && selectedSale && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border-2 border-orange-400 w-[90%] sm:w-[400px] text-center">
            <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-800">
              Admin Authorization Required
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Refunding this transaction requires admin approval.
            </p>

            <div className="bg-orange-50 p-3 rounded-md mb-4">
              <p className="font-semibold text-gray-800">
                Product: {selectedSale.name}
              </p>
              <p className="text-gray-700">
                💰 Total: ₱{(selectedSale.subtotal || 0).toLocaleString()}
              </p>
            </div>

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
                onClick={confirmRefund}
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold text-sm"
              >
                Confirm 
              </button>
              <button
                onClick={() => setShowRefundModal(false)}
                className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-6 py-2 rounded font-semibold text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}