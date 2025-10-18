import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  addDoc,
  serverTimestamp,
  increment,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function Cashier() {
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [salesHistory, setSalesHistory] = useState([]);
  const [message, setMessage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showSales, setShowSales] = useState(false);
  const [showAdminPrompt, setShowAdminPrompt] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");
  const [selectedSale, setSelectedSale] = useState(null);

  const ADMIN_PASSWORD = "admin123";
  const searchRef = useRef(null);

  // 🔄 Load all products
  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      setAllProducts(items);
    };
    fetchProducts();
  }, []);

  // 🔄 Load sales history
  useEffect(() => {
    const fetchSales = async () => {
      const snap = await getDocs(collection(db, "sales_history"));
      const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      sales.sort((a, b) => {
        const as = a.createdAt?.seconds || 0;
        const bs = b.createdAt?.seconds || 0;
        return bs - as;
      });
      setSalesHistory(sales);
    };
    fetchSales();
  }, []);

  // 🔍 Multi-keyword search
  useEffect(() => {
    if (!search.trim()) {
      setProducts([]);
      return;
    }
    const keywords = search.toLowerCase().split(" ").filter(Boolean);
    const results = allProducts.filter((p) => {
      const name = p.name?.toLowerCase() || "";
      const sku = (p.sku || "").toLowerCase();
      return keywords.every((word) => name.includes(word) || sku.includes(word));
    });
    setProducts(results);
    setShowDropdown(true);
  }, [search, allProducts]);

  // ⛔ Close dropdown when clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // 🛒 Add product to cart
  const addToCart = (product) => {
    if (product.qty <= 0) {
      setMessage("❌ No stock available!");
      return;
    }
    if (product.qty > 0 && product.qty <= 5) {
      setMessage("⚠️ Low stock – restock soon!");
    } else {
      setMessage(null);
    }

    setCart((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        if (existing.quantity >= product.qty) {
          setMessage("❌ Not enough stock available!");
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
  };

  // ➕ ➖ Update qty
  const updateQuantity = (id, amount) => {
    setCart((prev) =>
      prev.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity: Math.max(
                1,
                Math.min(item.qty, item.quantity + amount)
              ),
            }
          : item
      )
    );
  };

  // ❌ Remove from cart
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // ✅ Complete Purchase (with dynamic monthly tracking)
  const completePurchase = async () => {
    if (cart.length === 0) return;

    try {
      const monthKey = new Date().toISOString().slice(0, 7); // e.g. "2025-10"

      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        const productSnap = await getDoc(productRef);
        const currentData = productSnap.data();

        const currentMonthlySales = currentData.monthlySales || {};
        const currentMonthSales = currentMonthlySales[monthKey] || 0;

        await updateDoc(productRef, {
          qty: currentData.qty - item.quantity,
          [`monthlySales.${monthKey}`]: currentMonthSales + item.quantity,
        });
      }

      const saleItems = cart.map((item) => ({
        productId: item.id,
        name: item.name,
        qty: item.quantity,
        price: item.price || 0,
        subtotal: (item.price || 0) * item.quantity,
      }));

      const total = saleItems.reduce((s, it) => s + it.subtotal, 0);

      const saleDoc = await addDoc(collection(db, "sales_history"), {
        items: saleItems,
        total,
        month: monthKey,
        status: "completed",
        createdAt: serverTimestamp(),
      });

      setSalesHistory((prev) => [
        {
          id: saleDoc.id,
          items: saleItems,
          total,
          month: monthKey,
          status: "completed",
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
        },
        ...prev,
      ]);

      setCart([]);
      setMessage(" Purchase completed & logged for this month!");
    } catch (err) {
      console.error("Error completing purchase:", err);
      setMessage("❌ Error completing purchase.");
    }
  };

  // 🔁 Request refund
  const requestRefund = (sale) => {
    if (sale.status === "refunded") {
      setMessage("❌ This sale is already refunded.");
      return;
    }
    setSelectedSale(sale);
    setShowAdminPrompt(true);
  };

  // 🔒 Confirm refund (reverse monthly record)
  const confirmRefund = async () => {
    if (!selectedSale) return;
    if (adminPassword !== ADMIN_PASSWORD) {
      alert("❌ Incorrect admin password!");
      return;
    }

    try {
      const monthKey =
        selectedSale.month || new Date().toISOString().slice(0, 7);

      for (const soldItem of selectedSale.items) {
        const productRef = doc(db, "products", soldItem.productId);
        const productSnap = await getDoc(productRef);
        const currentData = productSnap.data();

        const currentMonthlySales = currentData.monthlySales || {};
        const currentMonthSales = currentMonthlySales[monthKey] || 0;

        await updateDoc(productRef, {
          qty: currentData.qty + soldItem.qty,
          [`monthlySales.${monthKey}`]: Math.max(
            0,
            currentMonthSales - soldItem.qty
          ),
        });
      }

      const saleRef = doc(db, "sales_history", selectedSale.id);
      await updateDoc(saleRef, { status: "refunded" });

      setSalesHistory((prev) =>
        prev.map((s) =>
          s.id === selectedSale.id ? { ...s, status: "refunded" } : s
        )
      );

      setMessage("🔄 Sale refunded and monthly stats updated!");
    } catch (err) {
      console.error("Error refunding sale:", err);
      setMessage("❌ Error refunding sale.");
    } finally {
      setShowAdminPrompt(false);
      setAdminPassword("");
      setSelectedSale(null);
    }
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Pet Solution CDO</h1>

      {/* Buttons */}
      <div className="flex justify-center mb-6 gap-4">
        <button
          onClick={() => setShowSales(false)}
          className={`px-5 py-2 rounded-lg ${
            !showSales ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
           Cashier
        </button>
        <button
          onClick={() => setShowSales(true)}
          className={`px-5 py-2 rounded-lg ${
            showSales ? "bg-blue-600 text-white" : "bg-gray-200"
          }`}
        >
           Sales History
        </button>
      </div>

      {/* Cashier View */}
      {!showSales && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* LEFT: Search */}
          <div>
            <div className="mb-4 relative" ref={searchRef}>
              <input
                type="text"
                placeholder="Search product..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full border p-3 rounded-lg text-lg"
              />
              {showDropdown && products.length > 0 && (
                <div className="absolute top-full left-0 bg-white border rounded shadow-md w-full max-h-60 overflow-y-auto z-10">
                  <ul>
                    {products.map((p) => (
                      <li
                        key={p.id}
                        className="flex justify-between px-4 py-3 cursor-pointer hover:bg-orange-100"
                        onClick={() => addToCart(p)}
                      >
                        <span>{p.name}</span>
                        <span className="text-sm text-gray-500">
                          Stock: {p.qty}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {message && (
              <div className="mb-4 p-3 bg-yellow-100 text-yellow-800 rounded">
                {message}
              </div>
            )}
          </div>

          {/* RIGHT: Cart */}
          <div className="border rounded-lg p-4 bg-gray-50">
            <h2 className="text-xl font-semibold mb-3">🛒 Cart</h2>
            {cart.length === 0 ? (
              <p className="text-gray-500">No items added</p>
            ) : (
              <ul>
                {cart.map((item) => (
                  <li
                    key={item.id}
                    className="flex justify-between items-center py-3 border-b"
                  >
                    <span className="font-medium">
                      {item.name} (₱{item.price})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        className="px-3 py-1 bg-gray-300 rounded text-lg"
                        onClick={() => updateQuantity(item.id, -1)}
                      >
                        −
                      </button>
                      <span className="text-lg">{item.quantity}</span>
                      <button
                        className="px-3 py-1 bg-gray-300 rounded text-lg"
                        onClick={() => updateQuantity(item.id, 1)}
                      >
                        +
                      </button>
                      <button
                        className="px-3 py-1 bg-red-500 text-white rounded"
                        onClick={() => removeFromCart(item.id)}
                      >
                        ✕
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}

            <div className="text-right mt-4 text-xl font-bold">
              Total: ₱{totalPrice.toFixed(2)}
            </div>

            <div className="flex gap-3 mt-4">
              <button
                onClick={completePurchase}
                className="flex-1 bg-green-600 text-white py-3 rounded-lg text-lg"
              >
                 Complete Purchase
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 📜 Sales History */}
      {showSales && (
        <div className="mt-6">
          <h2 className="text-2xl font-semibold mb-4 text-center">
            📦 Sales History
          </h2>
          <div className="overflow-x-auto border rounded-lg bg-white">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-100 text-gray-700">
                  <th className="p-3 border">Date</th>
                  <th className="p-3 border">Items</th>
                  <th className="p-3 border">Total</th>
                  <th className="p-3 border">Status</th>
                  <th className="p-3 border">Action</th>
                </tr>
              </thead>
              <tbody>
                {salesHistory.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50">
                    <td className="p-3 border">
                      {sale.createdAt?.seconds
                        ? new Date(
                            sale.createdAt.seconds * 1000
                          ).toLocaleString()
                        : "—"}
                    </td>
                    <td className="p-3 border">
                      {sale.items.map((i) => (
                        <div key={i.productId}>
                          {i.name} x{i.qty}
                        </div>
                      ))}
                    </td>
                    <td className="p-3 border">
                      ₱{(sale.total || 0).toFixed(2)}
                    </td>
                    <td
                      className={`p-3 border font-medium ${
                        sale.status === "refunded"
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {sale.status}
                    </td>
                    <td className="p-3 border">
                      {sale.status !== "refunded" ? (
                        <button
                          onClick={() => requestRefund(sale)}
                          className="bg-red-500 text-white px-3 py-1 rounded"
                        >
                          Refund
                        </button>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 🔐 Admin Prompt */}
      {showAdminPrompt && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-xl font-semibold mb-4 text-center">
              🔐 Admin Confirmation
            </h3>
            <p className="mb-3 text-gray-600 text-center">
              Please enter admin password to confirm refund.
            </p>
            <input
              type="password"
              placeholder="Enter password"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full border p-2 rounded mb-4"
            />
            <div className="flex gap-3">
              <button
                onClick={confirmRefund}
                className="flex-1 bg-green-600 text-white py-2 rounded"
              >
                Confirm
              </button>
              <button
                onClick={() => {
                  setShowAdminPrompt(false);
                  setAdminPassword("");
                  setSelectedSale(null);
                }}
                className="flex-1 bg-gray-300 py-2 rounded"
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
