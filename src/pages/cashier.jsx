import React, { useState, useEffect, useRef } from "react";
import {
  collection,
  getDocs,
  doc,
  updateDoc,
  addDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";

export default function Cashier() {
  const [search, setSearch] = useState("");
  const [allProducts, setAllProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [message, setMessage] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);

  const searchRef = useRef(null);

  // 🔄 Load all products
  useEffect(() => {
    const fetchProducts = async () => {
      const snap = await getDocs(collection(db, "products"));
      const items = snap.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      setAllProducts(items);
    };
    fetchProducts();
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
      return keywords.every((word) => name.includes(word));
    });
    setProducts(results);
    setShowDropdown(true);
  }, [search, allProducts]);

  // ⛔ Close dropdown on outside click
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
              quantity: Math.max(1, Math.min(item.qty, item.quantity + amount)),
            }
          : item
      )
    );
  };

  // ❌ Remove
  const removeFromCart = (id) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  // ✅ Purchase
  const completePurchase = async () => {
    if (cart.length === 0) return;
    try {
      for (const item of cart) {
        const productRef = doc(db, "products", item.id);
        await updateDoc(productRef, { qty: item.qty - item.quantity });
      }

      const total = cart.reduce(
        (sum, item) => sum + (item.price || 0) * item.quantity,
        0
      );

      const saleDoc = await addDoc(collection(db, "sales"), {
        items: cart.map((item) => ({
          productId: item.id,
          name: item.name,
          qty: item.quantity,
          price: item.price || 0,
          subtotal: (item.price || 0) * item.quantity,
        })),
        total,
        status: "completed",
        createdAt: serverTimestamp(),
      });

      setRecentTransactions((prev) => [
        ...prev,
        { id: saleDoc.id, items: cart },
      ]);
      setCart([]);
      setMessage("✅ Purchase completed & saved to Sales!");
    } catch (err) {
      console.error("Error completing purchase:", err);
    }
  };

  // 🔄 Refund last
  const refundLast = async () => {
    if (recentTransactions.length === 0) return;
    const last = recentTransactions[recentTransactions.length - 1];
    try {
      for (const item of last.items) {
        const productRef = doc(db, "products", item.productId || item.id);
        await updateDoc(productRef, { qty: item.qty + item.quantity });
      }
      const saleRef = doc(db, "sales", last.id);
      await updateDoc(saleRef, { status: "refunded" });
      setRecentTransactions((prev) => prev.slice(0, -1));
      setMessage("🔄 Last transaction refunded!");
    } catch (err) {
      console.error("Error refunding:", err);
    }
  };

  const totalPrice = cart.reduce(
    (sum, item) => sum + (item.price || 0) * item.quantity,
    0
  );

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">🛒 Cashier POS</h1>

      {/* Grid layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* LEFT: Search + Products */}
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

          {/* Stock Message */}
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

          {/* Total */}
          <div className="text-right mt-4 text-xl font-bold">
            Total: ₱{totalPrice.toFixed(2)}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4">
            <button
              onClick={completePurchase}
              className="flex-1 bg-green-600 text-white py-3 rounded-lg text-lg"
            >
              ✅ Complete Purchase
            </button>
            <button
              onClick={refundLast}
              className="flex-1 bg-red-600 text-white py-3 rounded-lg text-lg"
            >
              🔄 Refund Last
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
