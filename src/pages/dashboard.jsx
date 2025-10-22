import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import Loading from './functions/loading';
import { Link } from "react-router-dom";
import { AlertTriangle, Archive, Box, X, TrendingUp, CalendarDays, Calendar } from 'lucide-react';

export default function Dashboard() {
  const user = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    count: 0,
    totalQty: 0,
    lowStockCount: 0,
    noStockCount: 0,
    deadStockCount: 0,
  });
  const [staff, setStaff] = useState('');
  const [alerts, setAlerts] = useState([]);
  const [salesSummary, setSalesSummary] = useState({
    today: 0,
    month: 0,
    year: 0,
  });

  // 🧩 FETCH PRODUCTS
  useEffect(() => {
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        let totalQty = 0, lowStock = 0, noStock = 0, deadStock = 0;

        snap.forEach(doc => {
          const data = doc.data();
          const qty = Number(data.qty || 0);
          totalQty += qty;
          if (qty === 0) noStock++;
          else if (qty > 0 && qty < 5) lowStock++;
          if (qty > 1000) deadStock++;
        });

        const alertsArr = [];
        if (lowStock > 0) alertsArr.push({ id: 1, title: 'Low Stock', message: `${lowStock} item(s) are running low.` });
        if (noStock > 0) alertsArr.push({ id: 2, title: 'Out of Stock', message: `${noStock} item(s) are out of stock.` });
        if (deadStock > 0) alertsArr.push({ id: 3, title: 'Dead Stock', message: `${deadStock} item(s) are dead stock.` });

        setStats({
          count: snap.size,
          totalQty,
          lowStockCount: lowStock,
          noStockCount: noStock,
          deadStockCount: deadStock,
        });
        setAlerts(alertsArr);
      } catch (err) {
        console.error('Failed to load product stats:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  // 🧾 FETCH SALES SUMMARY
  useEffect(() => {
    const fetchSales = async () => {
      try {
        const salesSnap = await getDocs(collection(db, 'sales_history'));
        let todayTotal = 0, monthTotal = 0, yearTotal = 0;
        const now = new Date();
        const today = now.toISOString().slice(0, 10);
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        salesSnap.forEach(doc => {
          const sale = doc.data();
          const total = Number(sale.total || 0);
          const createdAt = sale.createdAt?.seconds ? new Date(sale.createdAt.seconds * 1000) : null;

          if (createdAt) {
            const saleDate = createdAt.toISOString().slice(0, 10);
            if (saleDate === today) todayTotal += total;
            if (createdAt.getMonth() === currentMonth && createdAt.getFullYear() === currentYear) monthTotal += total;
            if (createdAt.getFullYear() === currentYear) yearTotal += total;
          }
        });

        setSalesSummary({ today: todayTotal, month: monthTotal, year: yearTotal });
      } catch (err) {
        console.error('Error fetching sales:', err);
      }
    };
    fetchSales();
  }, []);

  // 🧍 FETCH STAFF
  useEffect(() => {
    const fetchStaff = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStaff(docSnap.data());
      }
    };
    fetchStaff();
  }, []);

  if (loading) return <Loading text="Loading..." />;

  const closeAlert = (id) => setAlerts(prev => prev.filter(alert => alert.id !== id));

  const formatCurrency = (amount) =>
    amount.toLocaleString('en-PH', { style: 'currency', currency: 'PHP' });

  return (
    <div className="space-y-8 text-center px-4 sm:px-6 lg:px-8">
      {/* Greeting */}
      <h1 className="text-3xl font-bold text-left mt-10 text-orange-500">Welcome!</h1>

      {/* ALERTS */}
      <div className="fixed top-1 right-6 z-50 flex flex-col sm:flex-row flex-wrap gap-3 justify-end">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="relative bg-white border border-orange-500 rounded-md p-4 w-full sm:w-80 shadow-md flex items-start gap-3"
          >
            <div className="bg-orange-500 p-2 rounded-md">
              <AlertTriangle className="text-white" size={20} />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-orange-500 font-semibold">{alert.title}</h3>
              <p className="text-gray-700 text-sm">{alert.message}</p>
            </div>
            <button
              onClick={() => closeAlert(alert.id)}
              className="text-gray-400 hover:text-red-500 absolute top-2 right-2"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>

      {/* 📦 Inventory Overview */}
      <div className="border border-gray-300 rounded-md p-6 text-left bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Inventory Overview</h2>

        <div className="space-y-3">
          <OverviewRow icon={Box} label={`${stats.count} Products`} progress={80} />
          <OverviewRow icon={AlertTriangle} label={`${stats.lowStockCount} Low stock`} progress={40} color="#f97316" />
          <OverviewRow icon={Archive} label={`${stats.deadStockCount} Dead stock`} progress={20} color="#f97316" />
        </div>

        <div className="border-t border-gray-200 mt-4 pt-4 flex flex-col sm:flex-row justify-between gap-4">
          <div>
            <h3 className="text-sm text-gray-600 font-medium">Total Products</h3>
            <p className="text-lg font-bold text-orange-500">{stats.count}</p>
          </div>
          <div>
            <h3 className="text-sm text-gray-600 font-medium">Total Quantity</h3>
            <p className="text-lg font-bold text-orange-500">{stats.totalQty}</p>
          </div>
          <div className="self-end">
            <Link to="/products" className="text-orange-500 font-medium text-sm hover:underline">
              Go to Inventory →
            </Link>
          </div>
        </div>
      </div>

      {/* 💰 Sales Summary */}
      <div className="border border-gray-300 rounded-md p-6 text-left bg-white shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Sales Summary</h2>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SalesCard
            icon={<TrendingUp size={22} className="text-white" />}
            title="Today"
            value={formatCurrency(salesSummary.today)}
          />
          <SalesCard
            icon={<CalendarDays size={22} className="text-white" />}
            title="This Month"
            value={formatCurrency(salesSummary.month)}
          />
          <SalesCard
            icon={<Calendar size={22} className="text-white" />}
            title="This Year"
            value={formatCurrency(salesSummary.year)}
          />
        </div>

        <div className="text-right mt-4">
          <Link
            to="/cashier?view=sales"
            className="text-orange-500 font-medium text-sm hover:underline"
          >
            View Sales History →
          </Link>
        </div>
      </div>
    </div>
  );
}

// COMPONENTS
function OverviewRow({ icon: Icon, label, progress, color = '#f97316' }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-2">
        <Icon className="text-orange-500" size={20} />
        <p className="text-gray-700 font-medium">{label}</p>
      </div>
      <div className="flex items-center w-full sm:w-1/2 bg-gray-200 rounded-full h-2 overflow-hidden">
        <div
          className="h-2 rounded-full"
          style={{ width: `${progress}%`, backgroundColor: color }}
        ></div>
      </div>
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