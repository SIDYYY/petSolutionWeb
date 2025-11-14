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
import toast, { Toaster } from "react-hot-toast";

export default function Cashier() {
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);

  const [salesHistory, setSalesHistory] = useState([]);
  const [cashReceived, setCashReceived] = useState(0);
  const [changeDue, setChangeDue] = useState(0);
  const [showChangeModal, setShowChangeModal] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [paymentMode, setPaymentMode] = useState("Cash");
  const [isProcessing, setIsProcessing] = useState(false);
  const [message, setMessage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedRefundItems, setSelectedRefundItems] = useState([]);
  const [adminPassword, setAdminPassword] = useState("");
  const searchRef = useRef(null);
  const location = useLocation();

    // MULTI-CART: carts array, each cart { id, name, items: [ { ...product, quantity } ] }
    // Each cart now contains its own totals
  const [carts, setCarts] = useState(() => {
    try {
      const saved = localStorage.getItem("pos_carts");
      return saved ? JSON.parse(saved) : [{
        id: Date.now(),
        name: "Cart 1",
        items: [],
        cashReceived: 0,
        discount: 0,
        paymentMode: "Cash"
      }];
    } catch {
      return [{
        id: Date.now(),
        name: "Cart 1",
        items: [],
        cashReceived: 0,
        discount: 0,
        paymentMode: "Cash"
      }];
    }
  });

  const handleCashChange = (value) => {
    setCarts(prev => prev.map(c => 
      c.id === activeCartId ? { ...c, cashReceived: value } : c
    ));
  };

  const handleDiscountChange = (value) => {
    setCarts(prev => prev.map(c => 
      c.id === activeCartId ? { ...c, discount: value } : c
    ));
  };

  const handlePaymentModeChange = (value) => {
    setCarts(prev => prev.map(c => 
      c.id === activeCartId ? { ...c, paymentMode: value } : c
    ));
  };

  const [activeCartId, setActiveCartId] = useState(() => {
    try {
      const savedId = localStorage.getItem("pos_activeCartId");
      return savedId ? Number(savedId) : carts[0].id;
    } catch {
      return carts[0].id;
    }
  });

  // Persist carts & activeCartId to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pos_carts", JSON.stringify(carts));
      localStorage.setItem("pos_activeCartId", String(activeCartId));
    } catch (e) {
      // ignore
    }
  }, [carts, activeCartId]);

  // Handle ?view=sales link
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("view") === "sales") {
      fetchSalesHistory();
      setShowSalesHistory(true);
    }
  }, [location]);

  // Fetch products
  const fetchProducts = async () => {
    try {
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllProducts(items);
    } catch (err) {
      console.error("Fetch products error:", err);
    }
  };

  // Call once on mount
  useEffect(() => {
    fetchProducts();
  }, []);


  // Fetch sales history
  const fetchSalesHistory = async () => {
    try {
      const snap = await getDocs(collection(db, "sales_history"));
      const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      sales.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSalesHistory(sales);
    } catch (err) {
      console.error("Fetch sales history error:", err);
    }
  };

  // Search logic
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

  // Helper: get active cart object & index
  const activeCartIndex = carts.findIndex((c) => c.id === activeCartId);
  const activeCart = activeCartIndex >= 0 ? carts[activeCartIndex] : carts[0];


  const activeCartCash = activeCart?.cashReceived || 0;
  const activeCartDiscount = activeCart?.discount || 0;
  const activeCartPaymentMode = activeCart?.paymentMode || "Cash";

  // Add product to active cart
  const addToCart = (product) => {
    if (!product) return;
    if (product.qty <= 0) {
      setMessage("❌ No stock available!");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    setCarts((prev) => {
      const next = [...prev];
      const idx = next.findIndex((c) => c.id === activeCartId);
      const targetCart = idx >= 0 ? { ...next[idx] } : { ...next[0] };
      const existing = targetCart.items.find((it) => it.id === product.id);

      if (existing) {
        if (existing.quantity >= product.qty) {
          toast.error("❌ Not enough stock!");
          return prev;
        }
        targetCart.items = targetCart.items.map((it) =>
          it.id === product.id ? { ...it, quantity: it.quantity + 1 } : it
        );
      } else {
        targetCart.items = [...targetCart.items, { ...product, quantity: 1 }];
      }

      if (idx >= 0) next[idx] = targetCart;
      return next;
    });

    setSearch("");
    setShowDropdown(false);
    setMessage(null);
  };

  // Update quantity inside active cart
  const updateQuantity = (id, change) => {
    setCarts((prev) =>
      prev.map((c) => {
        if (c.id !== activeCartId) return c;
        const items = c.items.map((item) => {
          if (item.id !== id) return item;
          const newQty = item.quantity + change;
          if (newQty < 1) return item;
          if (newQty > item.qty) {
            setMessage("❌ Exceeds available stock!");
            setTimeout(() => setMessage(null), 3000);
            return item;
          }
          return { ...item, quantity: newQty };
        });
        return { ...c, items };
      })
    );
  };

  // Remove from active cart
  const removeFromCart = (id) =>
    setCarts((prev) => prev.map((c) => (c.id === activeCartId ? { ...c, items: c.items.filter((i) => i.id !== id) } : c)));

  // Create new cart
  const createNewCart = () => {
    const newCart = { id: Date.now(), name: `Cart ${carts.length + 1}`, items: [] };
    setCarts((prev) => [...prev, newCart]);
    setActiveCartId(newCart.id);
  };

  // Delete an empty cart (prevent deleting the only cart)
  const deleteCart = (id) => {
    setCarts((prev) => {
      if (prev.length === 1) return prev; // keep at least one
      const next = prev.filter((c) => c.id !== id);
      if (id === activeCartId) {
        setActiveCartId(next[0].id);
      }
      return next;
    });
  };

  // Computed totals based on active cart
  const totalPrice = (activeCart?.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
  const discountedTotal = Math.max(0, totalPrice - (totalPrice * (Number(discount) || 0)) / 100);

  // Update change due whenever cashReceived or discountedTotal changes
  useEffect(() => {
    const cash = parseFloat(cashReceived) || 0;
    if (!cash || cash < discountedTotal) {
      setChangeDue(0);
    } else {
      setChangeDue(cash - discountedTotal);
    }
  }, [cashReceived, discountedTotal]);

  // handle complete purchase (validations)
  const completePurchase = () => {
    if (!activeCart || (activeCart.items || []).length === 0) {
      toast("⚠️ No products in cart!", { icon: "⚠️" });
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const cash = Number(activeCart.cashReceived || 0);
    const discount = Number(activeCart.discount || 0);

    const totalPrice = (activeCart.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0);
    const discountedTotal = Math.max(0, totalPrice - (totalPrice * discount) / 100);

    if (cash < discountedTotal) {
      toast.error("❌ Cash received is less than total after discount!");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    const change = cash - discountedTotal;
    setChangeDue(change);
    setShowChangeModal(true);
  };


  // Finalize sale after change confirmed
  const finalizeSale = async () => {
    try {
      // Use a snapshot of items to ensure we finalize the right cart
      const saleCart = carts.find((c) => c.id === activeCartId);
      if (!saleCart || (saleCart.items || []).length === 0) {
        toast.error("❌ Nothing to checkout.");
        return;
      }

      const monthKey = new Date().toISOString().slice(0, 7);

      // 1) Update product stocks
      for (const item of saleCart.items) {
        const ref = doc(db, "products", item.id);
        const snap = await getDoc(ref);
        const current = snap.data() || {};
        const newQty = (current.qty || 0) - item.quantity;
        await updateDoc(ref, {
          qty: newQty,
          [`monthlySales.${monthKey}`]: (current.monthlySales?.[monthKey] || 0) + item.quantity,
        });
      }

      // 2) Compose sale items and totals
      const saleItems = saleCart.items.map((i) => ({
        productId: i.id,
        name: i.name,
        qty: i.quantity,
        price: i.price,
        subtotal: i.price * i.quantity,
        refundedQty: 0,
      }));
      const totalBefore = saleItems.reduce((s, it) => s + it.subtotal, 0);

      // 3) Save to Firestore (include discount & paymentMode)
      await addDoc(collection(db, "sales_history"), {
        items: saleItems,
        discountPercent: Number(discount) || 0,
        paymentMode: paymentMode || "Cash",
        totalBeforeDiscount: totalBefore,
        totalAfterDiscount: discountedTotal,
        month: monthKey,
        status: "completed",
        createdAt: serverTimestamp(),
      });

      // 4) Clear that cart's items (but keep the cart)
      setCarts((prevCarts) => {
        const updated = prevCarts.filter((cart) => cart.id !== activeCartId);
        if (updated.length > 0) {
          setActiveCartId(updated[0].id);
        } else {
          // No carts left → create a new empty one
          const newCart = { id: Date.now(), name: "Cart 1", items: [] };
          updated.push(newCart);
          setActiveCartId(newCart.id);
        }
        return updated;
      });


      // Reset cash, discount optionally
      setCashReceived(0);
      setDiscount(0);
      setPaymentMode("Cash");
      setShowChangeModal(false);
      fetchProducts();

      toast.success(`Purchase completed! Change given: ₱${changeDue.toFixed(2)}`);
    } catch (err) {
      console.error(err);
      toast.error("❌ Error completing purchase.");
    }
  };

  // Refund logic (unchanged, operates on existing sales)
  const openRefundModal = (sale) => {
    setSelectedSale(sale);
    setShowRefundModal(true);
  };

  const confirmRefund = async () => {
    if (selectedRefundItems.length === 0) {
    setMessage("⚠️ No items selected for refund!");
    setTimeout(() => setMessage(null), 3000);
    return; // stop execution
  }
    try {
      // Fetch admin password from Firestore
      const docRef = doc(db, "adminAccess", "access_control");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        setMessage("❌ Admin access configuration not found!");
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      const firestorePassword = docSnap.data().master_pin;
      if (adminPassword !== firestorePassword) {
        setMessage("❌ Incorrect admin password!");
        setTimeout(() => setMessage(null), 3000);
        return;
      }

      // Proceed refund
      const saleRef = doc(db, "sales_history", selectedSale.id);
      const updatedItems = [];

      for (const item of selectedSale.items) {
        const refundData = selectedRefundItems.find(
          (r) => r.uniqueId === `${selectedSale.id}_${item.productId}`
        );

        if (refundData) {
          const refundQty = Math.min(refundData.refundQty, item.qty - (item.refundedQty || 0));
          if (refundQty > 0) {
            const productRef = doc(db, "products", item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const stock = productSnap.data().qty || 0;
              await updateDoc(productRef, { qty: stock + refundQty });
            }
            const newRefundedQty = (item.refundedQty || 0) + refundQty;
            updatedItems.push({ ...item, refundedQty: newRefundedQty });
          } else {
            updatedItems.push(item);
          }
        } else {
          updatedItems.push(item);
        }
      }

      const allRefunded = updatedItems.every((i) => (i.refundedQty || 0) >= i.qty);
      const newStatus = allRefunded ? "refunded" : "partially_refunded";

      await updateDoc(saleRef, {
        items: updatedItems,
        status: newStatus,
        refundDate: serverTimestamp(),
      });

      setMessage("✅ Partial refund processed!");
      setShowRefundModal(false);
      setAdminPassword("");
      setSelectedRefundItems([]);
      fetchSalesHistory();
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      console.error("Refund error:", error);
      setMessage("❌ Failed to process refund.");
      setTimeout(() => setMessage(null), 3000);
    }
  };

  // UI helpers
  const formatCurrency = (v) => `₱${Number(v || 0).toFixed(2)}`;

  return (
    <div className="h-full w-full bg-white flex flex-col lg:flex-row justify-between items-start p-3 sm:p-4 md:p-6">
      <Toaster />
      {/* Message */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-start gap-3 border-l-4 rounded-md shadow-lg p-4 w-[300px]
          ${message.includes("✅") ? "border-green-600 bg-green-50 text-green-800" : ""}
          ${message.includes("❌") ? "border-red-600 bg-red-50 text-red-800" : ""}
          ${message.includes("⚠️") ? "border-yellow-500 bg-yellow-50 text-yellow-800" : ""}`}
        >
          <div className="flex-1">
            <p className="font-semibold">
              {message.includes("✅") ? "Success" : message.includes("❌") ? "Error" : "Notice"}
            </p>
            <p className="text-sm">{message.replace(/[✅❌⚠️]/g, "").trim()}</p>
          </div>
          <button onClick={() => setMessage(null)} className="ml-2 text-gray-400 hover:text-gray-600">
            ✕
          </button>
        </div>
      )}

      <div className="flex flex-col lg:flex-row w-full gap-4">
        {/* Left / POS area */}
        <div className="flex-1 border border-orange-300 rounded-md bg-white shadow-sm flex flex-col">
          {/* Top bar: carts + search */}
          {!showSalesHistory && (
            <div className="p-3 sm:p-4 border-b border-orange-200">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={createNewCart}
                    className="bg-orange-500 text-white px-3 py-2 rounded-md hover:bg-orange-600"
                  >
                    ➕ New Cart
                  </button>

                  <div className="flex gap-2 ml-2 overflow-x-auto">
                    {carts.map((c) => (
                      <div key={c.id} className="flex items-center gap-2">
                        <button
                          onClick={() => setActiveCartId(c.id)}
                          className={`px-3 py-1 rounded-md ${
                            activeCartId === c.id ? "bg-orange-500 text-white" : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                          }`}
                        >
                          {c.name} ({c.items.length})
                        </button>
                        {/* allow deleting empty carts */}
                        {c.items.length === 0 && carts.length > 1 && (
                          <button
                            onClick={() => deleteCart(c.id)}
                            className="text-red-500 hover:text-red-700"
                            title="Delete cart"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Search */}
                <div ref={searchRef} className="relative w-1/3 min-w-[220px]">
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
                    <div className="absolute left-0 right-0 z-30 mt-2 bg-white border border-gray-200 rounded-md shadow-lg max-h-60 overflow-y-auto">
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
              </div>
            </div>
          )}

          {/* Main body: cart items or sales history */}
          <div
            className={`flex-1 p-3 sm:p-4 ${showSalesHistory ? "overflow-y-auto max-h-[70vh] pr-2" : "overflow-y-auto"}`}
          >
            {!showSalesHistory ? (
              (!activeCart || activeCart.items.length === 0) ? (
                <div className="text-center text-gray-400 py-24 text-sm">
                  <div className="text-base font-medium">No items</div>
                  <div className="text-xs mt-2">Add products using the search bar above</div>
                </div>
              ) : (
                activeCart.items.map((item) => {
                  return (
                    <div key={item.id} className="grid grid-cols-2 sm:grid-cols-12 items-center py-2 border-b text-sm">
                      <div className="sm:col-span-5">
                        <div className="font-medium text-gray-700">{item.name}</div>
                        <div className="text-xs text-gray-400">Stock: {item.qty}</div>
                      </div>
                      <div className="flex sm:col-span-2 justify-center items-center gap-2">
                        <button onClick={() => updateQuantity(item.id, -1)} className="bg-orange-100 text-orange-600 px-2 py-1 rounded hover:bg-orange-200">–</button>
                        <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.id, 1)} className="bg-orange-100 text-orange-600 px-2 py-1 rounded hover:bg-orange-200">+</button>
                      </div>
                      <div className="hidden sm:block sm:col-span-2 text-right">₱{item.price.toFixed(2)}</div>
                      <div className="hidden sm:block sm:col-span-2 text-right">₱{(item.price * item.quantity).toFixed(2)}</div>
                      <div className="text-right sm:col-span-1">
                        <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )
            ) : (
              // Sales history view
              salesHistory.map((sale) => (
                <div key={sale.id} className="border border-orange-300 rounded-md mb-4 p-3 bg-orange-50">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      🧾 {sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000).toLocaleString() : "—"}
                    </span>
                    <span className={`text-sm font-semibold ${sale.status === "refunded" ? "text-red-600" : sale.status === "partially_refunded" ? "text-yellow-600" : "text-green-600"}`}>
                      {sale.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-1 mb-2">
                    {sale.items.map((item) => {
                      const uniqueId = `${sale.id}_${item.productId}`;
                      const refundedQty = item.refundedQty || 0;
                      const remainingQty = item.qty - refundedQty;
                      const alreadyRefunded = remainingQty <= 0;
                      const selectedItem = selectedRefundItems.find((r) => r.uniqueId === uniqueId);

                      return (
                        <div key={uniqueId} className={`flex justify-between items-center bg-white rounded p-2 text-sm transition ${alreadyRefunded ? "opacity-60 line-through cursor-not-allowed" : "hover:bg-orange-50"}`}>
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              disabled={alreadyRefunded}
                              checked={!!selectedItem && !alreadyRefunded}
                              onChange={(e) => {
                                if (alreadyRefunded) return;
                                if (e.target.checked) {
                                  setSelectedRefundItems((prev) => [...prev, { ...item, uniqueId, refundQty: 1 }]);
                                } else {
                                  setSelectedRefundItems((prev) => prev.filter((r) => r.uniqueId !== uniqueId));
                                }
                              }}
                              className={`h-4 w-4 accent-orange-500 ${alreadyRefunded ? "opacity-50 cursor-not-allowed" : ""}`}
                            />

                            <div>
                              <p className={`font-medium text-gray-700 ${alreadyRefunded ? "opacity-60 line-through text-gray-500" : ""}`}>
                                {item.name} (x{remainingQty})
                              </p>
                              {refundedQty > 0 && <p className="text-xs text-gray-500">({refundedQty} refunded)</p>}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {selectedItem && !alreadyRefunded && remainingQty > 1 && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => setSelectedRefundItems((prev) => prev.map((r) => r.uniqueId === uniqueId && r.refundQty > 1 ? { ...r, refundQty: r.refundQty - 1 } : r))} className="bg-orange-100 px-2 rounded hover:bg-orange-200">–</button>
                                <span className="w-5 text-center text-sm font-medium">{selectedItem.refundQty}</span>
                                <button onClick={() => setSelectedRefundItems((prev) => prev.map((r) => r.uniqueId === uniqueId && r.refundQty < remainingQty ? { ...r, refundQty: r.refundQty + 1 } : r))} className="bg-orange-100 px-2 rounded hover:bg-orange-200">+</button>
                              </div>
                            )}
                            <span className="text-gray-700 font-semibold">₱{item.subtotal.toFixed(2)}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right">
                    <button onClick={() => openRefundModal(sale)} disabled={sale.status === "refunded"} className={`font-semibold text-sm px-3 py-1 rounded ${sale.status === "refunded" ? "text-gray-400 cursor-not-allowed" : "text-orange-600 hover:text-orange-800"}`}>
                      {sale.status === "refunded" ? "Already Refunded" : "Refund Selected"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / totals / payment area (hidden when viewing sales history) */}
          {!showSalesHistory && activeCart && (
                <div className="border-t border-gray-300 p-4 sm:p-6 bg-gray-50 rounded-t-md text-right space-y-3">

                  {/* Discount */}
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-sm text-gray-700 font-medium">Discount (%):</label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      value={activeCart.discount || 0}
                      onChange={(e) =>
                        setCarts(prev =>
                          prev.map(c =>
                            c.id === activeCartId ? { ...c, discount: Number(e.target.value) } : c
                          )
                        )
                      }
                      className="border border-gray-300 rounded-md px-3 py-1 text-right w-24 focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    />
                  </div>

                  {/* Payment Mode */}
                  <div className="flex justify-between items-center mb-3">
                    <label className="text-sm text-gray-700 font-medium">Mode of Payment:</label>
                    <select
                      value={activeCart.paymentMode || "Cash"}
                      onChange={(e) =>
                        setCarts(prev =>
                          prev.map(c =>
                            c.id === activeCartId ? { ...c, paymentMode: e.target.value } : c
                          )
                        )
                      }
                      className="border border-gray-300 rounded-md px-3 py-1 w-32 text-sm focus:ring-2 focus:ring-orange-400 focus:outline-none"
                    >
                      <option value="Cash">Cash</option>
                      <option value="Card">Card</option>
                      <option value="GCash">GCash</option>
                    </select>
                  </div>

                  {/* Total after discount */}
                  <div className="flex justify-between items-center border-t pt-2">
                    <span className="text-sm sm:text-base text-gray-600 font-medium">TOTAL after discount</span>
                    <span className="text-xl sm:text-2xl font-bold text-gray-900">
                      {formatCurrency(
                        Math.max(0, totalPrice - (totalPrice * (activeCart.discount || 0)) / 100)
                      )}
                    </span>
                  </div>

                  {/* Cash Received & Change */}
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mt-2">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                      <label className="text-gray-700 text-sm font-medium">Cash Received:</label>
                      <input
                        type="number"
                        placeholder="Enter amount"
                        value={activeCart.cashReceived || 0}
                        onChange={(e) =>
                          setCarts(prev =>
                            prev.map(c =>
                              c.id === activeCartId ? { ...c, cashReceived: Number(e.target.value) } : c
                            )
                          )
                        }
                        className="border border-gray-300 rounded-md px-3 py-2 w-full sm:w-40 text-right focus:ring-2 focus:ring-orange-400 focus:outline-none"
                      />
                    </div>

                    <div className="flex flex-col text-right">
                      <span className="text-gray-700 text-sm font-medium">Change Due</span>
                      <span className="text-lg sm:text-xl font-semibold text-gray-900">
                        {formatCurrency(
                          Math.max(0, (activeCart.cashReceived || 0) - (totalPrice - ((totalPrice * (activeCart.discount || 0)) / 100)))
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              )}

        </div>

        {/* Right Buttons */}
        <div className="flex flex-wrap lg:flex-col justify-center lg:justify-start items-stretch gap-3 mt-4 lg:mt-0 w-full lg:w-[250px]">
          <button onClick={() => { if (showSalesHistory) { setShowSalesHistory(false); } else { fetchSalesHistory(); setShowSalesHistory(true); } }} className="w-full border border-orange-400 text-orange-500 font-semibold py-3 rounded hover:bg-orange-50 transition">
            {showSalesHistory ? "Back to POS" : "Sales History"}
          </button>

          {!showSalesHistory && (
            <button onClick={completePurchase} className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 rounded transition">
              Complete Purchase
            </button>
          )}
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border-2 border-orange-400 w-[90%] sm:w-[400px] text-center">
            <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-800">Admin Authorization Required</h2>
            <p className="text-sm text-gray-600 mb-4">Refunding this transaction requires admin approval.</p>

            <div className="bg-orange-50 p-3 rounded-md mb-4">
              <p className="font-semibold text-gray-800 mb-2">Selected Refund Items:</p>

              {selectedRefundItems.length === 0 ? (
                <p className="text-gray-600 text-sm">No items selected.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedRefundItems.map((r, idx) => (
                    <li key={idx} className="flex justify-between items-center bg-white px-3 py-2 rounded-md shadow-sm border border-orange-200">
                      <div className="text-left">
                        <p className="text-gray-800 font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-gray-500">{r.refundQty} pcs × ₱{r.price.toLocaleString()}</p>
                      </div>
                      <p className="text-sm font-semibold text-orange-600">₱{(r.price * r.refundQty).toLocaleString()}</p>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="block text-sm font-medium text-gray-700 mb-1">Enter Master PIN</label>
            <input type="password" className="w-full border-b-2 border-gray-300 focus:border-orange-400 outline-none px-2 py-2 mb-4 text-sm text-center" placeholder="Master PIN" value={adminPassword} onChange={(e) => setAdminPassword(e.target.value)} />

            <div className="flex justify-center gap-3">
              <button onClick={confirmRefund} className="bg-orange-500 hover:bg-orange-600 text-white px-6 py-2 rounded font-semibold text-sm">Confirm</button>
              <button onClick={() => setShowRefundModal(false)} className="bg-orange-100 hover:bg-orange-200 text-orange-700 px-6 py-2 rounded font-semibold text-sm">Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Change Confirmation Modal */}
      {showChangeModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-lg border border-gray-300 w-[90%] sm:w-[400px] p-6 sm:p-8 text-center">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Confirm Customer Change</h2>

            <div className="space-y-2 mb-6 text-left">
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Total:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(
                    (activeCart?.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0)
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Discount:</span>
                <span className="font-semibold text-gray-800">{activeCart?.discount || 0}%</span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Total after discount:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(
                    Math.max( 
                      0,
                      ((activeCart?.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0)) -
                      (((activeCart?.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0) *
                        (activeCart?.discount || 0)) /
                        100)
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-medium text-gray-700">Cash Received:</span>
                <span className="font-semibold text-gray-800">{formatCurrency(activeCart?.cashReceived || 0)}</span>
              </div>
              <div className="flex justify-between border-t pt-2 mt-2">
                <span className="font-medium text-gray-700">Change Due:</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(
                    Math.max(
                      0,
                      (activeCart?.cashReceived || 0) -
                      ((activeCart?.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0) -
                        (((activeCart?.items || []).reduce((s, i) => s + (i.price || 0) * i.quantity, 0) *
                          (activeCart?.discount || 0)) /
                          100))
                    )
                  )}
                </span>
              </div>
            </div>


            <div className="flex justify-center gap-4">
              <button
                onClick={async () => {
                  setIsProcessing(true); // show loading
                  await finalizeSale();  // wait for async completion
                  setIsProcessing(false); // hide loading
                  setShowChangeModal(false);
                }}
                className="bg-green-600 hover:bg-green-700 text-white font-semibold px-6 py-2 rounded transition"
                disabled={isProcessing} // prevent multiple clicks
              >
                {isProcessing ? "Processing..." : "Confirm"}
              </button>
              <button onClick={() => setShowChangeModal(false)} className="bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold px-6 py-2 rounded transition">Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
