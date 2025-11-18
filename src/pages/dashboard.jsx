import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import {
  collection,
  getDocs,
  query,
  orderBy,
} from "firebase/firestore";
import Loading from "./functions/loading";
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, Box } from "lucide-react";

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
        if (data.deadstock && qty > 0) {
          deadStock++;
          deadArr.push({ id: d.id, ...data, qty });
        }
      });

      // Sort deadstock by highest quantity first
      deadArr.sort((a, b) => b.qty - a.qty);

      setStats({
        count: snap.size,
        totalQty,
        lowStockCount: lowStock,
        deadStockCount: deadStock,
      });
      setDeadstockItems(deadArr.slice(0, 5)); // Top 5 by quantity
      setReorderItems(reorderArr.slice(0, 5));

      } catch (err) {
        console.error("Dashboard initial fetch error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAll();
  }, []);

  if (loading) return <Loading text="Loading Dashboard..." />;

  return (
    <div className="px-4 sm:px-6 lg:px-8 mb-10 space-y-6">
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
                    <span className="text-gray-600 text-sm">Qty: {item.qty}</span>
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
    </div>
  );
}

/* ---------- Small Components ---------- */
function OverviewCard({ icon: Icon, label, value, gradientFrom, gradientTo }) {
  const bgClass = gradientFrom && gradientTo
    ? `bg-gradient-to-r ${gradientFrom} ${gradientTo} text-white`
    : "bg-gray-50";
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
