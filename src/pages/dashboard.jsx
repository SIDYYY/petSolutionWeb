import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import Loading from './functions/loading';
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, Box, TrendingUp, CalendarDays, Calendar } from 'lucide-react';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    count: 0,
    totalQty: 0,
    lowStockCount: 0,
    deadStockCount: 0,
  });
  const [staff, setStaff] = useState('');
  const [salesSummary, setSalesSummary] = useState({ today: 0, month: 0, year: 0 });
  const [deadstockItems, setDeadstockItems] = useState([]);
  const [reorderItems, setReorderItems] = useState([]);

  // FETCH PRODUCTS + DEADSTOCK + REORDER INFO
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        let totalQty = 0, lowStock = 0, deadStock = 0;
        const deadstockArr = [], reorderArr = [];

        snap.forEach(doc => {
          const data = doc.data();
          const qty = Number(data.qty || 0);
          const threshold = Number(data.threshold || 0);
          totalQty += qty;

          if (qty > 0 && qty < 5) lowStock++;
          if (qty <= threshold && threshold > 0) reorderArr.push({ id: doc.id, ...data, qty, threshold });
          if (data.deadstock) {
            deadStock++;
            deadstockArr.push({ id: doc.id, ...data, qty });
          }
        });

        setStats({ count: snap.size, totalQty, lowStockCount: lowStock, deadStockCount: deadStock });
        setDeadstockItems(deadstockArr.slice(0, 5));
        setReorderItems(reorderArr.slice(0, 5));
      } catch (err) {
        console.error('Failed to load product stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // FETCH SALES SUMMARY
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const salesSnap = await getDocs(collection(db, 'sales_history'));
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const month = now.getMonth(), year = now.getFullYear();
        let todayTotal = 0, monthTotal = 0, yearTotal = 0;

        salesSnap.forEach(doc => {
          const sale = doc.data();
          const total = Number(sale.total || 0);
          const createdAt = sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000) : null;
          if (!createdAt) return;

          const saleDate = createdAt.toISOString().slice(0, 10);
          if (saleDate === today) todayTotal += total;
          if (createdAt.getMonth() === month && createdAt.getFullYear() === year) monthTotal += total;
          if (createdAt.getFullYear() === year) yearTotal += total;
        });

        setSalesSummary({ today: todayTotal, month: monthTotal, year: yearTotal });
      } catch (err) {
        console.error('Error fetching sales:', err);
      }
    };
    fetchSales();
  }, []);

  // FETCH STAFF INFO
  useEffect(() => {
    const fetchStaff = async () => {
      const user = auth.currentUser;
      if (!user) return;
      const docRef = doc(db, 'users', user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) setStaff(docSnap.data());
    };
    fetchStaff();
  }, []);

  if (loading) return <Loading text="Loading Dashboard..." />;

  const formatCurrency = amount => amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

  return (
    <div className="space-y-8 px-4 sm:px-6 lg:px-8">
      {/* INVENTORY OVERVIEW */}
      <div className="bg-white shadow rounded-md p-6 text-left">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">Inventory Overview</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          <OverviewCard icon={Box} label="Total Products" value={stats.count} />
          <OverviewCard icon={AlertTriangle} label="Low Stock" value={stats.lowStockCount} color="#f97316" />
          <OverviewCard icon={Archive} label="Deadstock" value={stats.deadStockCount} color="#f97316" />
        </div>

        <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-6">
          {/* Reorder Items */}
          {reorderItems.length > 0 && (
            <InfoCard title={`🛒 Reorder Recommendations (${reorderItems.length})`}>
              <ul className="divide-y divide-gray-200">
                {reorderItems.map(item => (
                  <li key={item.id} className="flex justify-between py-2 text-left">
                    <span className="font-medium text-gray-800">{item.name}</span>
                    <span className="text-gray-600 text-sm">Qty: {item.qty} / Threshold: {item.threshold}</span>
                  </li>
                ))}
              </ul>
              <div className="text-right mt-2">
                <Link to="/products" className="text-orange-500 text-sm font-medium hover:underline">View All →</Link>
              </div>
            </InfoCard>
          )}

          {/* Deadstock Items */}
          {deadstockItems.length > 0 &&  (
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
                <Link to="/products" className="text-orange-500 text-sm font-medium hover:underline">View All Deadstock →</Link>
              </div>
            </InfoCard>
          )}
        </div>
      </div>

      {/* SALES SUMMARY */}
      <div className="bg-white shadow rounded-md p-6 text-left">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Sales Summary</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <SalesCard icon={<TrendingUp size={22} />} title="Today" value={formatCurrency(salesSummary.today)} />
          <SalesCard icon={<CalendarDays size={22} />} title="This Month" value={formatCurrency(salesSummary.month)} />
          <SalesCard icon={<Calendar size={22} />} title="This Year" value={formatCurrency(salesSummary.year)} />
        </div>
        <div className="text-right mt-4">
          <Link to="/cashier?view=sales" className="text-orange-500 text-sm font-medium hover:underline">View Sales History →</Link>
        </div>
      </div>
    </div>
  );
}

// COMPONENTS
function OverviewCard({ icon: Icon, label, value, color = '#10B981' }) {
  return (
    <div className="bg-gray-50 p-4 rounded-md flex items-center gap-4 shadow-sm">
      <Icon size={24} className="text-orange-500" />
      <div>
        <p className="text-gray-500 text-sm">{label}</p>
        <p className="text-lg font-bold text-gray-800">{value}</p>
      </div>
    </div>
  );
}

function InfoCard({ title, children }) {
  return (
    <div className="bg-gray-50 p-4 rounded-md border border-gray-200 shadow-sm">
      <h3 className="text-md font-semibold text-gray-700 mb-2">{title}</h3>
      {children}
    </div>
  );
}

function SalesCard({ icon, title, value }) {
  return (
    <div className="bg-orange-500 hover:bg-orange-600 transition-all duration-300 rounded-md p-4 flex flex-col items-center justify-center shadow-md text-white cursor-pointer">
      <div className="mb-2">{icon}</div>
      <h3 className="text-sm font-medium">{title}</h3>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}
