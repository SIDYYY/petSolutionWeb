import React, { useState, useEffect } from "react";
import { db } from "../../firebase";
import { collection, getDocs, query, orderBy, doc, getDoc } from "firebase/firestore";
import { Download, Calendar, CalendarDays, TrendingUp } from "lucide-react";
import toast from "react-hot-toast";
import Loading from "./functions/loading";

export default function SalesReportPage() {
  const [salesRaw, setSalesRaw] = useState([]);
  const [loading, setLoading] = useState(true);
  const [masterPin, setMasterPin] = useState(null);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [pinVerified, setPinVerified] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [customRange, setCustomRange] = useState({ start: "", end: "" });
  const [reportDetails, setReportDetails] = useState({
    rows: [],
    totals: { totalSales: 0, totalRefunds: 0, netSales: 0 },
    periodLabel: "",
  });

  const formatCurrency = (amt = 0) =>
    Number(amt).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

  // Fetch sales + master PIN
  useEffect(() => {
    const fetchData = async () => {
      try {
        const salesQ = query(collection(db, "sales_history"), orderBy("createdAt", "desc"));
        const snap = await getDocs(salesQ);
        const raw = snap.docs.map((s) => {
          const data = s.data();
          const createdAt = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;
          return {
            id: s.id,
            createdAt,
            items: data.items || [],
            status: data.status || "completed",
            rawTotal: Number(data.total || 0),
            paymentMode: data.paymentMode || "",
            discountPercent: Number(data.discountPercent || 0),
          };
        });
        setSalesRaw(raw);

        const pinSnap = await getDoc(doc(db, "adminAccess", "access_control"));
        if (pinSnap.exists()) setMasterPin(pinSnap.data().master_pin || null);
      } catch (err) {
        toast.error("Failed to fetch sales data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  const verifyPin = () => {
    setPinError("");
    if (!masterPin) return setPinError("Master PIN not configured.");
    if (!enteredPin) return setPinError("Please enter PIN.");
    if (String(enteredPin) !== String(masterPin)) return setPinError("Incorrect PIN.");
    setPinVerified(true);
    generateReportDetails(reportPeriod);
  };

  const generateReportDetails = (period) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const filtered = salesRaw.filter((sale) => {
      if (!sale.createdAt) return false;
      const saleTime = sale.createdAt.getTime();
      if (period === "daily") return sale.createdAt.toISOString().slice(0, 10) === todayStr;
      if (period === "monthly") return sale.createdAt.getMonth() === curMonth && sale.createdAt.getFullYear() === curYear;
      if (period === "yearly") return sale.createdAt.getFullYear() === curYear;
      if (period === "custom") {
        if (!customRange.start || !customRange.end) return false;
        const startTime = new Date(customRange.start).getTime();
        const endTime = new Date(customRange.end).getTime() + 86400000 - 1;
        return saleTime >= startTime && saleTime <= endTime;
      }
      return false;
    });

    const agg = {};
    let totalSales = 0, totalRefunds = 0, netSales = 0;

    filtered.forEach((sale) => {
      (sale.items || []).forEach((it) => {
        const pid = it.productId || `p_${it.name || "unknown"}`;
        const name = it.name || "Unknown";
        const price = Number(it.price || 0);
        const qty = Number(it.qty || 0);
        const refundedQty = Number(it.refundedQty || 0);

        if (!agg[pid])
          agg[pid] = { productId: pid, name, price, totalQty: 0, totalRefundedQty: 0, subtotal: 0, refundedAmount: 0 };

        agg[pid].totalQty += qty;
        agg[pid].totalRefundedQty += refundedQty;
        agg[pid].subtotal += qty * price;
        agg[pid].refundedAmount += refundedQty * price;
      });
    });

    const rows = Object.values(agg).map((a) => {
      const netQty = Math.max(0, a.totalQty - a.totalRefundedQty);
      const netSubtotal = Math.max(0, a.subtotal - a.refundedAmount);
      totalSales += a.subtotal;
      totalRefunds += a.refundedAmount;
      netSales += netSubtotal;
      return { ...a, netQty, netSubtotal };
    });

    rows.sort((a, b) => b.netQty - a.netQty || a.name.localeCompare(b.name));

    const label =
      period === "daily"
        ? `Daily Report (${now.toLocaleDateString()})`
        : period === "monthly"
        ? `Monthly Report (${now.toLocaleString("default", { month: "long", year: "numeric" })})`
        : period === "yearly"
        ? `Yearly Report (${now.getFullYear()})`
        : period === "custom"
        ? `Custom Report (${customRange.start} → ${customRange.end})`
        : "";

    setReportDetails({ rows, totals: { totalSales, totalRefunds, netSales }, periodLabel: label });
  };

  const downloadReportCSV = () => {
    if (!pinVerified) return toast.error("Enter Master PIN to download full report.");
    const { rows, totals, periodLabel } = reportDetails;
    const headerCols = [
      "Product ID", "Name", "Unit Price", "Total Qty", "Refunded Qty",
      "Net Qty", "Subtotal", "Refunded Amount", "Net Subtotal"
    ];
    let csv = `${periodLabel}\n${headerCols.join(",")}\n`;
    rows.forEach((r) => {
      csv += [
        r.productId, r.name, r.price, r.totalQty, r.totalRefundedQty, r.netQty, r.subtotal, r.refundedAmount, r.netSubtotal
      ].join(",") + "\n";
    });
    csv += `\nTotals,,,,, ,${totals.totalSales},${totals.totalRefunds},${totals.netSales}\n`;

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `sales-report-${reportPeriod}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) return <Loading text="Loading sales data..." />;

  return (
    <div className="p-6 space-y-6 bg-white shadow rounded-md min-h-[80vh]">

      {/* --- PERIOD BUTTONS --- */}
      <div className="flex flex-wrap gap-3 mt-2">
        {[ 
          { label: "Today", period: "daily", icon: <TrendingUp size={20} /> },
          { label: "Month", period: "monthly", icon: <CalendarDays size={20} /> },
          { label: "Year", period: "yearly", icon: <Calendar size={20} /> },
          { label: "Custom", period: "custom", icon: <Calendar size={20} /> },
        ].map(({ label, period, icon }) => {
          const isActive = reportPeriod === period;
          return (
            <button
                key={period}
                onClick={() => {
                    // Reset PIN every time period changes
                    setPinVerified(false);
                    setEnteredPin("");
                    setPinError("");

                    // Apply period + regenerate report
                    setReportPeriod(period);
                    generateReportDetails(period);
                }}
              className={`flex items-center gap-2 px-4 py-2 rounded-md font-medium transition
                ${isActive ? "bg-orange-500 text-white shadow-md" : "bg-gray-100 text-gray-700 hover:bg-gray-200"}`}
            >
              {icon}
              {label}
            </button>
          );
        })}
      </div>

      {/* --- CUSTOM DATE PICKER --- */}
      {reportPeriod === "custom" && (
        <div className="flex gap-2 items-center mt-3 flex-wrap">
          <input
            type="date"
            value={customRange.start}
            onChange={(e) => setCustomRange({ ...customRange, start: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <span className="text-gray-600 font-medium">to</span>
          <input
            type="date"
            value={customRange.end}
            onChange={(e) => setCustomRange({ ...customRange, end: e.target.value })}
            className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button
            className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition"
            onClick={() => generateReportDetails("custom")}
          >
            Generate
          </button>
        </div>
      )}

      {/* --- PIN INPUT ABOVE TABLE --- */}
      {!pinVerified && masterPin && (
        <div className="border rounded-md p-4 bg-gray-50 space-y-2">
          <p className="text-gray-700 font-semibold text-center">Enter Master PIN to view product breakdown</p>
          <div className="flex flex-col sm:flex-row gap-2 justify-center items-center">
            <input
              type="password"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              placeholder="Master PIN"
              className="border border-gray-300 rounded px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <button
              onClick={verifyPin}
              className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition"
            >
              Unlock
            </button>
          </div>
          {pinError && <p className="text-red-600 text-center">{pinError}</p>}
        </div>
      )}

      {/* --- PRODUCT BREAKDOWN TABLE --- */}
      {pinVerified && (
        <div className="overflow-auto max-h-[60vh] border rounded-md shadow-sm mt-4">
          <div className="flex justify-between my-4">
            <h3 className="font-bold text-lg text-gray-800 border-b p-3">{reportDetails.periodLabel}</h3>
            <button
              onClick={downloadReportCSV}
              className="flex items-center gap-2 mr-4 bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition"
            >
              <Download size={16} /> Download CSV
            </button>
          </div>

          <table className="w-full text-sm border-collapse table-auto">
            <thead className="bg-gray-100 sticky top-0">
              <tr>
                {["Product", "Unit Price", "Total Qty", "Refunded Qty", "Net Qty", "Subtotal", "Refunded", "Net Subtotal"].map((col) => (
                  <th key={col} className="p-3 border text-left text-gray-700">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {reportDetails.rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-4 text-center text-gray-500">No sales in this period.</td>
                </tr>
              ) : reportDetails.rows.map((r) => (
                <tr key={r.productId} className="border-b hover:bg-gray-50 transition">
                  <td className="p-3">{r.name}</td>
                  <td className="p-3">{formatCurrency(r.price)}</td>
                  <td className="p-3">{r.totalQty}</td>
                  <td className="p-3">{r.totalRefundedQty}</td>
                  <td className="p-3">{r.netQty}</td>
                  <td className="p-3">{formatCurrency(r.subtotal)}</td>
                  <td className="p-3">{formatCurrency(r.refundedAmount)}</td>
                  <td className="p-3 font-semibold">{formatCurrency(r.netSubtotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* --- KPI SUMMARY --- */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500">Total Sales</p>
          <p className="font-bold text-xl text-gray-800">{formatCurrency(reportDetails.totals.totalSales)}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500">Total Refunds</p>
          <p className="font-bold text-xl text-gray-800">{formatCurrency(reportDetails.totals.totalRefunds)}</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-500">NET Sales</p>
          <p className="font-bold text-2xl text-gray-900">{formatCurrency(reportDetails.totals.netSales)}</p>
        </div>
      </div>
    </div>
  );
}
