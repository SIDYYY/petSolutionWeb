import React, { useState, useEffect } from "react";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  updateDoc,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "../../firebase";
import { useNavigate } from "react-router-dom";
import RefundModal from "../Modals/RefundModal";

export default function SalesHistory() {
  const [salesHistory, setSalesHistory] = useState([]);
  const [filteredSales, setFilteredSales] = useState([]);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [selectedSale, setSelectedSale] = useState(null);
  const [selectedRefundItems, setSelectedRefundItems] = useState([]);
  const [adminPassword, setAdminPassword] = useState("");
  const [message, setMessage] = useState(null);

  const [currentPage, setCurrentPage] = useState(1);
  const salesPerPage = 5;
  const [filterStatus, setFilterStatus] = useState("all");

  const navigate = useNavigate();

  useEffect(() => {
    fetchSalesHistory();
  }, []);

  useEffect(() => {
    if (message) {
      const timer = setTimeout(() => setMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [message]);

  useEffect(() => {
    applyFilter(filterStatus);
  }, [salesHistory, filterStatus]);

  const showMessage = (msg) => {
    setMessage(msg);
    setTimeout(() => setMessage(null), 3000);
  };

  const fetchSalesHistory = async () => {
    try {
      const snap = await getDocs(collection(db, "sales_history"));
      const sales = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      sales.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setSalesHistory(sales);
    } catch (err) {
      console.error("Failed to fetch sales history:", err);
      showMessage("❌ Failed to fetch sales history!");
    }
  };

  const applyFilter = (status) => {
    if (status === "all") setFilteredSales(salesHistory);
    else if (status === "completed") setFilteredSales(salesHistory.filter((s) => s.status === "completed"));
    else setFilteredSales(salesHistory.filter((s) => s.status === status));

    setCurrentPage(1);
  };

  const openRefundModal = (sale) => {
    setSelectedSale(sale);
    setShowRefundModal(true);
  };

  const confirmRefund = async () => {
    if (selectedRefundItems.length === 0) {
      showMessage("❌ No items selected for refund!");
      return;
    }

    try {
      const docRef = doc(db, "adminAccess", "access_control");
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        showMessage("❌ Admin access configuration not found!");
        return;
      }

      const firestorePassword = docSnap.data().master_pin;

      if (adminPassword.trim() !== firestorePassword) {
        showMessage("❌ Incorrect admin password!");
        return;
      }

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
            updatedItems.push({ ...item, refundedQty: (item.refundedQty || 0) + refundQty });
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

      showMessage("✅ Partial refund processed!");
      setShowRefundModal(false);
      setAdminPassword("");
      setSelectedRefundItems([]);
      fetchSalesHistory();
    } catch (error) {
      console.error("Refund error:", error);
      showMessage("❌ Failed to process refund.");
    }
  };

  // Pagination
  const indexOfLastSale = currentPage * salesPerPage;
  const indexOfFirstSale = indexOfLastSale - salesPerPage;
  const currentSales = filteredSales.slice(indexOfFirstSale, indexOfLastSale);
  const totalPages = Math.ceil(filteredSales.length / salesPerPage);

  return (
    <div className="p-4 relative">
      {/* Back + Filter */}
      <div className="mb-4 flex justify-between items-center">
        <button
          onClick={() => navigate("/cashier")}
          className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md shadow"
        >
          ← Back to POS
        </button>

        <div>
          <label className="mr-2 font-semibold text-sm">Filter:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border rounded px-2 py-1 text-sm focus:outline-none focus:border-orange-400"
          >
            <option value="all">ALL</option>
            <option value="completed">COMPLETED</option>
            <option value="partially_refunded">PARTIALLY REFUNDED</option>
            <option value="refunded">REFUNDED</option>
          </select>
        </div>
      </div>

      {/* Toast */}
      {message && (
        <div
          className={`fixed top-6 right-6 z-50 flex items-start gap-3 border-l-4 rounded-md shadow-lg p-4 w-[320px] transition-all duration-300
            ${message.includes("✅") ? "border-green-600 bg-green-50 text-green-800" : ""}
            ${message.includes("❌") ? "border-red-600 bg-red-50 text-red-800" : ""}
            ${message.includes("🟡") ? "border-yellow-500 bg-yellow-50 text-yellow-800" : ""}`}
        >
          <div className="flex-1">
            <p className="font-semibold">
              {message.includes("✅") ? "Success" : message.includes("❌") ? "Error" : "Info"}
            </p>
            <p className="text-sm">{message.replace(/[✅❌🟡]/g, "").trim()}</p>
          </div>
          <button
            onClick={() => setMessage(null)}
            className="ml-2 text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Sales list */}
      {currentSales.map((sale) => (
        <div key={sale.id} className="border border-orange-400 rounded-md p-3 mb-3 bg-orange-50">
          <div className="flex justify-between">
            <span>
              {sale.createdAt?.seconds
                ? new Date(sale.createdAt.seconds * 1000).toLocaleString()
                : "—"}
            </span>
            <span
              className={`font-semibold ${
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

          <div className="mt-2 space-y-1">
            {sale.items.map((item) => {
              const uniqueId = `${sale.id}_${item.productId}`;
              const refundedQty = item.refundedQty || 0;
              const remainingQty = item.qty - refundedQty;
              const alreadyRefunded = remainingQty <= 0;
              const selectedItem = selectedRefundItems.find((r) => r.uniqueId === uniqueId);

              return (
                <div
                  key={uniqueId}
                  className={`flex justify-between items-center bg-white rounded p-2 text-sm transition ${
                    alreadyRefunded ? "opacity-60 line-through cursor-not-allowed" : "hover:bg-orange-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      disabled={alreadyRefunded}
                      checked={!!selectedItem && !alreadyRefunded}
                      onChange={(e) => {
                        if (alreadyRefunded) return;
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
                      <p className={`font-medium text-gray-700 ${alreadyRefunded ? "opacity-60 line-through text-gray-500" : ""}`}>
                        {item.name} (x{remainingQty})
                      </p>
                      {refundedQty > 0 && (
                        <p className="text-xs text-gray-500">({refundedQty} refunded)</p>
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
                        <span className="w-5 text-center text-sm font-medium">{selectedItem.refundQty}</span>
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

                    <span className="text-gray-700 font-semibold">₱{item.subtotal.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="text-right mt-2">
            <button
              onClick={() => openRefundModal(sale)}
              disabled={sale.status === "refunded"}
              className={`font-semibold text-sm ${
                sale.status === "refunded"
                  ? "text-gray-400 cursor-not-allowed"
                  : "text-orange-600 hover:text-orange-800"
              }`}
            >
              {sale.status === "refunded" ? "Already Refunded" : "Refund Selected"}
            </button>
          </div>
        </div>
      ))}

      {/* Pagination */}
      <div className="flex justify-center gap-2 mt-4">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="px-3 py-1 bg-orange-100 rounded disabled:opacity-50"
        >
          Prev
        </button>
        <span className="px-3 py-1 font-semibold">{currentPage} / {totalPages}</span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="px-3 py-1 bg-orange-100 rounded disabled:opacity-50"
        >
          Next
        </button>
      </div>

      {/* Refund Modal */}
      <RefundModal
        show={showRefundModal}
        onClose={() => setShowRefundModal(false)}
        selectedRefundItems={selectedRefundItems}
        onConfirm={confirmRefund}
        adminPassword={adminPassword}
        setAdminPassword={setAdminPassword}
      />
    </div>
  );
}
