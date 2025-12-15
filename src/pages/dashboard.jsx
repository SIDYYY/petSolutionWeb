import React, { useEffect, useState } from "react";
import { db } from "../../firebase";
import { collection, getDocs } from "firebase/firestore";
import Loading from "./functions/loading";
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, Box } from "lucide-react";

export default function Dashboard() {
  const [loading, setLoading] = useState(true);

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

        let totalQty = 0;
        let lowStock = 0;
        let deadStock = 0;

        const deadArr = [];
        const reorderArr = [];

        snap.forEach((d) => {
          const data = d.data();

          // Use exact Firestore field names
          const qty = Number(data.qty ?? 0);
          const threshold = Number(data.threshold ?? 0); // ML-based threshold
          const leadTime = Number(data.leadTime ?? 0);
          const isDead = Boolean(data.deadstock);

          totalQty += qty;

          // Low stock items (<5)
          if (qty > 0 && qty < 5) lowStock++;

          // RESTOCK LOGIC: only if qty < ML threshold
          if (qty < threshold) {
            // Priority = combination of threshold and leadTime
            // Both contribute: higher threshold and longer lead time => higher priority
            const priorityScore = threshold * 2 + leadTime; // tweak weights if needed

            reorderArr.push({
              id: d.id,
              ...data,
              qty,
              threshold,
              leadTime,
              priorityScore,
            });
          }

          // DEADSTOCK
          if (isDead && qty > 0) {
            deadStock++;
            deadArr.push({ id: d.id, ...data, qty });
          }
        });

        // Sort deadstock by quantity DESC
        deadArr.sort((a, b) => b.qty - a.qty);

        // Sort reorder items by priorityScore DESC
        reorderArr.sort((a, b) => b.priorityScore - a.priorityScore);

        // Update state
        setStats({
          count: snap.size,
          totalQty,
          lowStockCount: lowStock,
          deadStockCount: deadStock,
        });

        setDeadstockItems(deadArr.slice(0, 5));
        setReorderItems(reorderArr.slice(0, 5));
      } catch (err) {
        console.error("Dashboard fetch error:", err);
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

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <OverviewCard icon={Box} label="Total Products" value={stats.count} />
          <OverviewCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} />
          <OverviewCard icon={Archive} label="Deadstock" value={stats.deadStockCount} />
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* REORDER LIST — prioritized by threshold + leadTime */}
          {reorderItems.length > 0 && (
            <InfoCard title={`🛒 Urgent Reorder (${reorderItems.length})`}>
              <ul className="divide-y divide-gray-200">
                {reorderItems.map((item) => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-gray-600 text-sm">
                      Qty: {item.qty} | Thresh: {item.threshold} | LT: {item.leadTime}d
                    </span>
                  </li>
                ))}
              </ul>
              <div className="text-right mt-2">
                <Link to="/products" className="text-orange-500 font-medium hover:underline">
                  View All →
                </Link>
              </div>
            </InfoCard>
          )}

          {/* DEADSTOCK */}
          {deadstockItems.length > 0 && (
            <InfoCard title={`🗄 Recently Detected Deadstock (${deadstockItems.length})`}>
              <ul className="divide-y divide-gray-200">
                {deadstockItems.map((item) => (
                  <li key={item.id} className="flex justify-between py-2">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-gray-600 text-sm">Qty: {item.qty}</span>
                  </li>
                ))}
              </ul>
              <div className="text-right mt-2">
                <Link to="/products?filter=deadStock" className="text-orange-500 font-medium hover:underline">
                  View All Deadstock →
                </Link>
              </div>
            </InfoCard>
          )}
        </div>
      </div>
    </div>
  );
}

/* ---------- Small Components ---------- */
function OverviewCard({ icon: Icon, label, value }) {
  return (
    <div className="flex items-center gap-4 p-5 rounded-2xl bg-white shadow hover:scale-105 transition-transform cursor-pointer">
      <Icon size={28} className="text-orange-500" />
      <div>
        <p className="text-sm text-gray-500">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
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
