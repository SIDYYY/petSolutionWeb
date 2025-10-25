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
  const [selectedRefundItems, setSelectedRefundItems] = useState([]);
  const [adminPassword, setAdminPassword] = useState("");
  const searchRef = useRef(null);
  const location = useLocation();

  // ✅ Handle ?view=sales link
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    if (query.get("view") === "sales") {
      fetchSalesHistory();
      setShowSalesHistory(true);
    }
  }, [location]);

  // ✅ Fetch products
  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllProducts(items);
    };
    fetchProducts();
  }, []);

  // ✅ Fetch sales history
  const fetchSalesHistory = async () => {
    const snap = await getDocs(collection(db, "sales_history"));
    const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    sales.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    setSalesHistory(sales);
  };

  // ✅ Search logic
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

  // ✅ Add to cart
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

  // ✅ Update qty in cart
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

  // ✅ Remove from cart
  const removeFromCart = (id) => setCart((prev) => prev.filter((i) => i.id !== id));

  // ✅ Complete purchase
  const completePurchase = async () => {
    if (cart.length === 0) {
      setMessage("⚠️ No products in cart!");
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
        refundedQty: 0,
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

  // ✅ Open refund modal
  const openRefundModal = (sale) => {
    setSelectedSale(sale);
    setShowRefundModal(true);
  };

  // ✅ Confirm refund
  const confirmRefund = async () => {
    if (adminPassword !== "admin123") {
      setMessage("❌ Incorrect admin password!");
      setTimeout(() => setMessage(null), 3000);
      return;
    }

    try {
      const saleRef = doc(db, "sales_history", selectedSale.id);
      const updatedItems = [];

      for (const item of selectedSale.items) {
        const refundData = selectedRefundItems.find(
          (r) => r.uniqueId === `${selectedSale.id}_${item.productId}`
        );

        if (refundData) {
          const refundQty = Math.min(
            refundData.refundQty,
            item.qty - (item.refundedQty || 0)
          );

          if (refundQty > 0) {
            const productRef = doc(db, "products", item.productId);
            const productSnap = await getDoc(productRef);
            if (productSnap.exists()) {
              const stock = productSnap.data().qty || 0;
              await updateDoc(productRef, { qty: stock + refundQty });
            }

            const newRefundedQty = (item.refundedQty || 0) + refundQty;

            updatedItems.push({
              ...item,
              refundedQty: newRefundedQty,
            });
          } else {
            updatedItems.push(item);
          }
        } else {
          updatedItems.push(item);
        }
      }

      const allRefunded = updatedItems.every(
        (i) => (i.refundedQty || 0) >= i.qty
      );
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

  const totalPrice = cart.reduce((s, i) => s + (i.price || 0) * i.quantity, 0);

  return (
    <div className="h-full w-full bg-white flex flex-col lg:flex-row justify-between items-start p-3 sm:p-4 md:p-6">
      {/* ✅ Message */}
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

      <div className="flex flex-col lg:flex-row w-full gap-4">
        {/* ✅ POS / History */}
        <div className="flex-1 border border-orange-300 rounded-md bg-white shadow-sm flex flex-col">
          {/* ✅ Search bar */}
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

          {/* ✅ Main body */}
          <div
            className={`flex-1 p-3 sm:p-4 ${
              showSalesHistory ? "overflow-y-auto max-h-[70vh] pr-2" : "overflow-y-auto"
            }`}
          >
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
                    className="grid grid-cols-2 sm:grid-cols-12 items-center py-2 border-b text-sm"
                  >
                    <div className="sm:col-span-5">
                      <div className="font-medium text-gray-700">{item.name}</div>
                      <div className="text-xs text-gray-400">Stock: {item.qty}</div>
                    </div>
                    <div className="flex sm:col-span-2 justify-center items-center gap-2">
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
              // ✅ SALES HISTORY
              salesHistory.map((sale) => (
                <div
                  key={sale.id}
                  className="border border-orange-300 rounded-md mb-4 p-3 bg-orange-50"
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-semibold text-gray-700">
                      🧾{" "}
                      {sale.createdAt?.seconds
                        ? new Date(sale.createdAt.seconds * 1000).toLocaleString()
                        : "—"}
                    </span>
                    <span
                      className={`text-sm font-semibold ${
                        sale.status === "refunded"
                          ? "text-red-600"
                          : sale.status === "partially_refunded"
                          ? "text-yellow-600"
                          : "text-green-600"
                      }`}
                    >
                      {sale.status.replace("_", " ")}
                    </span>
                  </div>

                  <div className="space-y-1 mb-2">
                    {sale.items.map((item) => {
                      const uniqueId = `${sale.id}_${item.productId}`;
                      const refundedQty = item.refundedQty || 0;
                      const remainingQty = item.qty - refundedQty;
                      const alreadyRefunded = remainingQty <= 0;
                      const selectedItem = selectedRefundItems.find(
                        (r) => r.uniqueId === uniqueId
                      );

                      return (
                        <div
                          key={uniqueId}
                          className={`flex justify-between items-center bg-white rounded p-2 text-sm transition ${
                            alreadyRefunded
                              ? "opacity-60 line-through cursor-not-allowed"
                              : "hover:bg-orange-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            {/* 🟠 Hide checkbox if refunded */}
                            <input
                            type="checkbox"
                            disabled={alreadyRefunded}
                            checked={!!selectedItem && !alreadyRefunded}
                            onChange={(e) => {
                              if (alreadyRefunded) return; // safety
                              if (e.target.checked) {
                                setSelectedRefundItems((prev) => [
                                  ...prev,
                                  { ...item, uniqueId, refundQty: 1 },
                                ]);
                              } else {
                                setSelectedRefundItems((prev) =>
                                  prev.filter((r) => r.uniqueId !== uniqueId)
                                );
                              }
                            }}
                            className={`h-4 w-4 accent-orange-500 ${
                              alreadyRefunded ? "opacity-50 cursor-not-allowed" : ""
                            }`}
                          />


                            <div>
                              <p
                                className={`font-medium text-gray-700 ${
                                  alreadyRefunded
                                    ? "opacity-60 line-through text-gray-500"
                                    : ""
                                }`}
                              >
                                {item.name} (x{remainingQty})
                              </p>
                              {refundedQty > 0 && (
                                <p className="text-xs text-gray-500">
                                  ({refundedQty} refunded)
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {selectedItem && !alreadyRefunded && remainingQty > 1 && (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() =>
                                    setSelectedRefundItems((prev) =>
                                      prev.map((r) =>
                                        r.uniqueId === uniqueId && r.refundQty > 1
                                          ? { ...r, refundQty: r.refundQty - 1 }
                                          : r
                                      )
                                    )
                                  }
                                  className="bg-orange-100 px-2 rounded hover:bg-orange-200"
                                >
                                  –
                                </button>
                                <span className="w-5 text-center text-sm font-medium">
                                  {selectedItem.refundQty}
                                </span>
                                <button
                                  onClick={() =>
                                    setSelectedRefundItems((prev) =>
                                      prev.map((r) =>
                                        r.uniqueId === uniqueId && r.refundQty < remainingQty
                                          ? { ...r, refundQty: r.refundQty + 1 }
                                          : r
                                      )
                                    )
                                  }
                                  className="bg-orange-100 px-2 rounded hover:bg-orange-200"
                                >
                                  +
                                </button>
                              </div>
                            )}
                            <span className="text-gray-700 font-semibold">
                              ₱{item.subtotal.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="text-right">
                    <button
                      onClick={() => openRefundModal(sale)}
                      disabled={sale.status === "refunded"}
                      className={`font-semibold text-sm px-3 py-1 rounded ${
                        sale.status === "refunded"
                          ? "text-gray-400 cursor-not-allowed"
                          : "text-orange-600 hover:text-orange-800"
                      }`}
                    >
                      {sale.status === "refunded"
                        ? "Already Refunded"
                        : "Refund Selected"}
                    </button>
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

        {/* ✅ Right Buttons */}
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

      {/* 🟠 Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 sm:p-8 rounded-lg shadow-lg border-2 border-orange-400 w-[90%] sm:w-[400px] text-center">
            <h2 className="text-lg sm:text-xl font-bold mb-2 text-gray-800">
              Admin Authorization Required
            </h2>
            <p className="text-sm text-gray-600 mb-4">
              Refunding this transaction requires admin approval.
            </p>

            <div className="bg-orange-50 p-3 rounded-md mb-4">
              <p className="font-semibold text-gray-800 mb-2">
                Selected Refund Items:
              </p>

              {selectedRefundItems.length === 0 ? (
                <p className="text-gray-600 text-sm">No items selected.</p>
              ) : (
                <ul className="space-y-2">
                  {selectedRefundItems.map((r, idx) => (
                    <li
                      key={idx}
                      className="flex justify-between items-center bg-white px-3 py-2 rounded-md shadow-sm border border-orange-200"
                    >
                      <div className="text-left">
                        <p className="text-gray-800 font-medium text-sm">{r.name}</p>
                        <p className="text-xs text-gray-500">
                          {r.refundQty} pcs × ₱{r.price.toLocaleString()}
                        </p>
                      </div>
                      <p className="text-sm font-semibold text-orange-600">
                        ₱{(r.price * r.refundQty).toLocaleString()}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
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
