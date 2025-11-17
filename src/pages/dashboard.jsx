import React, { useEffect, useState } from "react";
import { auth, db } from "../../firebase";
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  orderBy,
} from "firebase/firestore";
import Loading from "./functions/loading";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  Archive,
  Box,
  TrendingUp,
  CalendarDays,
  Calendar,
  Download,
} from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

  // Inventory / UI states
  const [stats, setStats] = useState({
    count: 0,
    totalQty: 0,
    lowStockCount: 0,
    deadStockCount: 0,
  });
  const [deadstockItems, setDeadstockItems] = useState([]);
  const [reorderItems, setReorderItems] = useState([]);

  // Sales summary
  const [salesSummary, setSalesSummary] = useState({
    today: 0,
    month: 0,
    year: 0,
    todayRefunds: 0,
    monthRefunds: 0,
    yearRefunds: 0,
  });

  const [salesRaw, setSalesRaw] = useState([]);
  const [pinModalOpen, setPinModalOpen] = useState(false);
  const [enteredPin, setEnteredPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [masterPin, setMasterPin] = useState(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("daily");
  const [reportDetails, setReportDetails] = useState({
    rows: [],
    totals: { totalSales: 0, totalRefunds: 0, netSales: 0 },
    periodLabel: "",
  });

  const formatCurrency = (amount = 0) =>
    Number(amount).toLocaleString("en-PH", { style: "currency", currency: "PHP" });

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const snap = await getDocs(collection(db, "products"));
        let totalQty = 0,
          lowStock = 0,
          deadStock = 0;
        const deadArr = [],
          reorderArr = [];

        snap.forEach((d) => {
          const data = d.data();
          const qty = Number(data.qty || 0);
          const threshold = Number(data.threshold || 0);
          totalQty += qty;
          if (qty > 0 && qty < 5) lowStock++;
          if (qty <= threshold && threshold > 0) reorderArr.push({ id: d.id, ...data, qty, threshold });
          if (data.deadstock) {
            deadStock++;
            deadArr.push({ id: d.id, ...data, qty });
          }
        });

        setStats({
          count: snap.size,
          totalQty,
          lowStockCount: lowStock,
          deadStockCount: deadStock,
        });
        setDeadstockItems(deadArr.slice(0, 5));
        setReorderItems(reorderArr.slice(0, 5));

        const salesQ = query(collection(db, "sales_history"), orderBy("createdAt", "desc"));
        const salesSnap = await getDocs(salesQ);
        const raw = [];
        salesSnap.forEach((s) => {
          const data = s.data();
          const createdAt = data.createdAt?.seconds ? new Date(data.createdAt.seconds * 1000) : null;
          raw.push({
            id: s.id,
            createdAt,
            items: data.items || [],
            status: data.status || "completed",
            rawTotal: Number(data.total || 0),
            paymentMode: data.paymentMode || "",
            discountPercent: Number(data.discountPercent || 0),
          });
        });
        setSalesRaw(raw);

        try {
          const pinSnap = await getDoc(doc(db, "adminAccess", "access_control"));
          if (pinSnap.exists()) setMasterPin(pinSnap.data().master_pin || null);
          else setMasterPin(null);
        } catch (pinErr) {
          console.error("Error fetching master PIN:", pinErr);
          setMasterPin(null);
        }

        computeSummaryFromRaw(raw);
      } catch (err) {
        console.error("Dashboard initial fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  const computeSummaryFromRaw = (rawSales) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    let tTotal = 0,
      mTotal = 0,
      yTotal = 0;
    let tRefund = 0,
      mRefund = 0,
      yRefund = 0;

    rawSales.forEach((sale) => {
      const c = sale.createdAt;
      if (!c) return;

      let saleRefundAmount = 0;
      let saleNetAmount = 0;

      (sale.items || []).forEach((it) => {
        const qty = Number(it.qty || 0);
        const refundedQty = Number(it.refundedQty || 0);
        const price = Number(it.price || 0);

        saleRefundAmount += refundedQty * price;
        saleNetAmount += Math.max(0, qty - refundedQty) * price;
      });

      const saleDate = c.toISOString().slice(0, 10);
      const isToday = saleDate === todayStr;
      const isThisMonth = c.getMonth() === curMonth && c.getFullYear() === curYear;
      const isThisYear = c.getFullYear() === curYear;

      if (isToday) {
        tTotal += saleNetAmount;
        tRefund += saleRefundAmount;
      }
      if (isThisMonth) {
        mTotal += saleNetAmount;
        mRefund += saleRefundAmount;
      }
      if (isThisYear) {
        yTotal += saleNetAmount;
        yRefund += saleRefundAmount;
      }
    });

    setSalesSummary({
      today: tTotal,
      month: mTotal,
      year: yTotal,
      todayRefunds: tRefund,
      monthRefunds: mRefund,
      yearRefunds: yRefund,
    });
  };

  const openReportPin = (period) => {
    setReportPeriod(period);
    setEnteredPin("");
    setPinError("");
    setPinModalOpen(true);
  };

  const verifyPinAndOpenReport = () => {
    setPinError("");
    if (!masterPin) return setPinError("Master PIN not configured.");
    if (!enteredPin) return setPinError("Please enter PIN.");
    if (String(enteredPin) !== String(masterPin)) return setPinError("Incorrect PIN.");

    setPinModalOpen(false);
    generateReportDetails(reportPeriod);
    setReportModalOpen(true);
  };

  const generateReportDetails = (period) => {
    const now = new Date();
    const todayStr = now.toISOString().slice(0, 10);
    const curMonth = now.getMonth();
    const curYear = now.getFullYear();

    const filtered = salesRaw.filter((sale) => {
      const c = sale.createdAt;
      if (!c) return false;
      if (period === "daily") return c.toISOString().slice(0, 10) === todayStr;
      if (period === "monthly") return c.getMonth() === curMonth && c.getFullYear() === curYear;
      if (period === "yearly") return c.getFullYear() === curYear;
      return false;
    });

    const agg = {};
    let totalSales = 0,
      totalRefunds = 0,
      netSales = 0;

    filtered.forEach((sale) => {
      (sale.items || []).forEach((it) => {
        const pid = it.productId || `p_${it.name || "unknown"}`;
        const name = it.name || "Unknown";
        const price = Number(it.price || 0);
        const qty = Number(it.qty || 0);
        const refundedQty = Number(it.refundedQty || 0);

        if (!agg[pid]) agg[pid] = { productId: pid, name, price, totalQty: 0, totalRefundedQty: 0, subtotal: 0, refundedAmount: 0 };

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
      return {
        productId: a.productId,
        name: a.name,
        price: a.price,
        totalQty: a.totalQty,
        totalRefundedQty: a.totalRefundedQty,
        netQty,
        subtotal: a.subtotal,
        refundedAmount: a.refundedAmount,
        netSubtotal,
      };
    });

    rows.sort((a, b) => b.netQty - a.netQty || a.name.localeCompare(b.name));

    let label = period === "daily" ? `Daily (${now.toLocaleDateString()})`
      : period === "monthly" ? `Monthly (${now.toLocaleString("default", { month: "long", year: "numeric" })})`
      : `Yearly (${now.getFullYear()})`;

    setReportDetails({ rows, totals: { totalSales, totalRefunds, netSales }, periodLabel: label });
  };

  const csvEscape = (v) => {
    if (v === undefined || v === null) return "";
    const s = String(v);
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };

  const downloadReportCSV = () => {
    const { rows, totals, periodLabel } = reportDetails;
    const headerCols = [
      "Product ID", "Name", "Unit Price", "Total Qty (sold)", "Refunded Qty",
      "Net Qty", "Subtotal (before refunds)", "Refunded Amount", "Net Subtotal"
    ];
    let csv = `${periodLabel}\n${headerCols.join(",")}\n`;
    rows.forEach((r) => {
      csv += [
        csvEscape(r.productId), csvEscape(r.name), r.price, r.totalQty,
        r.totalRefundedQty, r.netQty, r.subtotal, r.refundedAmount, r.netSubtotal
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

  if (loading) return <Loading text="Loading Dashboard..." />;

  return (
    <div className="px-4 sm:px-6 lg:px-8 mb-10 space-y-6">
      {/* SALES SUMMARY */}
      <div className="bg-gray-50 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Sales Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <SummaryCard
          icon={<TrendingUp size={22} />}
          title="Today"
          value={formatCurrency(salesSummary.today)}
          refunds={formatCurrency(salesSummary.todayRefunds)}
          onView={() => openReportPin("daily")}
          gradientFrom="from-orange-500"
          gradientTo="to-orange-400"
        />

        <SummaryCard
          icon={<CalendarDays size={22} />}
          title="This Month"
          value={formatCurrency(salesSummary.month)}
          refunds={formatCurrency(salesSummary.monthRefunds)}
          onView={() => openReportPin("monthly")}
          gradientFrom="from-orange-500"
          gradientTo="to-orange-400"
        />

        <SummaryCard
          icon={<Calendar size={22} />}
          title="This Year"
          value={formatCurrency(salesSummary.year)}
          refunds={formatCurrency(salesSummary.yearRefunds)}
          onView={() => openReportPin("yearly")}
          gradientFrom="from-orange-500"
          gradientTo="to-orange-400"
        />

        </div>
        <div className="text-right mt-4">
          <Link to="/SalesHistory" className="text-orange-500 font-semibold hover:underline">View Sales History →</Link>
        </div>
      </div>

      {/* INVENTORY OVERVIEW */}
      <div className="bg-gray-50 p-6 rounded-2xl shadow-lg">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">Inventory Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 ">
        <OverviewCard icon={Box} label="Total Products" value={stats.count} gradientFrom="from-orange-400" gradientTo="to-orange-400" />
        <OverviewCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} gradientFrom="from-orange-400" gradientTo="to-orange-400" />
        <OverviewCard icon={Archive} label="Deadstock" value={stats.deadStockCount} gradientFrom="from-orange-400" gradientTo="to-orange-400" />

        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {reorderItems.length > 0 && (
            <InfoCard title={`🛒 Reorder Recommendations (${reorderItems.length})`}>
              <ul className="divide-y divide-gray-200">
                {reorderItems.map(item => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-gray-600 text-sm">Qty: {item.qty} / Threshold: {item.threshold}</span>
                  </li>
                ))}
              </ul>
              <div className="text-right mt-2">
                <Link to="/products" className="text-orange-500 font-medium hover:underline">View All →</Link>
              </div>
            </InfoCard>
          )}

          {deadstockItems.length > 0 && (
            <InfoCard title={`🗄 Recently Detected Deadstock (${deadstockItems.length})`}>
              <ul className="divide-y divide-gray-200">
                {deadstockItems.map(item => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-gray-600 text-sm">Qty: {item.qty} | {formatCurrency(item.price)}</span>
                  </li>
                ))}
              </ul>
              <div className="text-right mt-2">
                <Link to="/products?filter=deadStock" className="text-orange-500 font-medium hover:underline">View All Deadstock →</Link>
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* PIN MODAL */}
      {pinModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg w-[90%] sm:w-[420px] p-6">
            <h3 className="text-lg font-bold mb-2">Enter Master PIN</h3>
            <p className="text-sm text-gray-600 mb-4">This report is restricted. Enter the master PIN to proceed.</p>
            <input
              type="password"
              value={enteredPin}
              onChange={(e) => setEnteredPin(e.target.value)}
              className="w-full border rounded-lg px-3 py-2 mb-3"
              placeholder="Master PIN"
            />
            {pinError && <p className="text-sm text-red-600 mb-3">{pinError}</p>}
            <div className="flex justify-end gap-3">
              <button onClick={() => setPinModalOpen(false)} className="px-4 py-2 rounded-lg bg-gray-100">Cancel</button>
              <button onClick={verifyPinAndOpenReport} className="px-4 py-2 rounded-lg bg-orange-500 text-white">Verify</button>
            </div>
          </div>
        </div>
      )}

      {/* REPORT MODAL */}
      {reportModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-start justify-center z-50 overflow-auto py-10">
          <div className="bg-white rounded-2xl shadow-lg w-[95%] md:w-[1000px] p-6">
            <div className="flex justify-between items-start gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold">{reportDetails.periodLabel}</h3>
                <p className="text-sm text-gray-600">Breakdown by product. Refunded quantities are shown but excluded from Net Sales.</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={downloadReportCSV} className="flex items-center gap-2 bg-orange-500 text-white px-3 py-2 rounded-lg">
                  <Download size={16} /> Download CSV
                </button>
                <button onClick={() => setReportModalOpen(false)} className="px-3 py-2 rounded-lg bg-gray-100">Close</button>
              </div>
            </div>

            <div className="overflow-auto max-h-[60vh] mb-4">
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="text-left border-b bg-gray-100">
                    <th className="py-2 px-2">Product</th>
                    <th className="py-2 px-2">Unit Price</th>
                    <th className="py-2 px-2">Total Qty</th>
                    <th className="py-2 px-2">Refunded Qty</th>
                    <th className="py-2 px-2">Net Qty</th>
                    <th className="py-2 px-2">Subtotal</th>
                    <th className="py-2 px-2">Refunded Amount</th>
                    <th className="py-2 px-2">Net Subtotal</th>
                  </tr>
                </thead>
                <tbody>
                  {reportDetails.rows.length === 0 ? (
                    <tr><td colSpan={8} className="py-4 text-center text-gray-500">No sales for this period.</td></tr>
                  ) : reportDetails.rows.map((r) => (
                    <tr key={r.productId} className="border-b hover:bg-gray-50 transition">
                      <td className="py-2 px-2">{r.name}</td>
                      <td className="py-2 px-2">{formatCurrency(r.price)}</td>
                      <td className="py-2 px-2">{r.totalQty}</td>
                      <td className="py-2 px-2">{r.totalRefundedQty}</td>
                      <td className="py-2 px-2">{r.netQty}</td>
                      <td className="py-2 px-2">{formatCurrency(r.subtotal)}</td>
                      <td className="py-2 px-2">{formatCurrency(r.refundedAmount)}</td>
                      <td className="py-2 px-2 font-semibold">{formatCurrency(r.netSubtotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-6">
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Sales (before refunds):</p>
                <p className="font-semibold">{formatCurrency(reportDetails.totals?.totalSales || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">Total Refunded:</p>
                <p className="font-semibold">{formatCurrency(reportDetails.totals?.totalRefunds || 0)}</p>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-600">NET Sales:</p>
                <p className="font-bold text-lg">{formatCurrency(reportDetails.totals?.netSales || 0)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ---------- Redesigned small components ---------- */
function OverviewCard({ icon: Icon, label, value, color, gradientFrom, gradientTo }) {
  const bgClass = gradientFrom && gradientTo
    ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`
    : color || "bg-gray-50";

  const textColorClass = gradientFrom && gradientTo ? "text-white" : "text-gray-800";

  return (
    <div className={`flex items-center gap-4 p-5 rounded-2xl hover:scale-105 transition-transform cursor-pointer ${bgClass}`}>
      <Icon size={28} className={gradientFrom && gradientTo ? "text-white" : "text-orange-500"} />
      <div>
        <p className={`text-sm ${gradientFrom && gradientTo ? "text-white/90" : "text-gray-500"}`}>{label}</p>
        <p className={`text-lg font-bold ${textColorClass}`}>{value}</p>
      </div>
    </div>
  );
}


function InfoCard({ title, children }) {
  return (
    <div className="bg-white p-5 rounded-2xl shadow border border-orange-200 hover:shadow-lg transition">
      <h3 className="font-semibold text-gray-700 mb-3">{title}</h3>
      {children}
    </div>
  );
}

function SummaryCard({ icon, title, value, refunds, onView, gradientFrom, gradientTo }) {
  return (
    <div
      className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white p-5 rounded-2xl shadow-lg flex flex-col justify-between hover:scale-105 transition-transform cursor-pointer`}
    >
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-3">
          <div>{icon}</div>
          <div>
            <p className="text-sm opacity-90">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs mt-1 opacity-80">Refunds: {refunds}</p>
          </div>
        </div>
        <button onClick={onView} className="bg-white/20 hover:bg-white/30 px-3 py-1 rounded text-sm font-semibold">
          View
        </button>
      </div>
    </div>
  );
}
