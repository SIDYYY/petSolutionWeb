import React, { useEffect, useState } from 'react';
import { auth, db } from '../../firebase';
import { collection, getDocs, doc, getDoc } from 'firebase/firestore';
import Loading from './functions/loading';
import {  Link } from "react-router-dom";
import { Package, PackageX, AlertTriangle, Archive, Box } from 'lucide-react';


export default function Dashboard() {
  const user = auth.currentUser;
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    count: 0,
    totalQty: 0,
    lowStockCount: 0,
    noStockCount: 0,
    deadStockCount: 0
  });
  const [staff, setStaff] = useState('');

  useEffect(() => { // Status Qty/Stock (No,Low,Dead)
    const fetchData = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));

        let totalQty = 0;
        let lowStock = 0;
        let noStock = 0;
        let deadStock = 0;

        snap.forEach(doc => {
          const data = doc.data();

          // Handle missing or invalid stock/qty
          const qty = Number(data.qty || 0);
          const stock = Number(data.qty || 0);

          totalQty += qty;

          if (stock === 0) noStock++; 
          else if (stock > 0 && stock < 5) lowStock++;
          if (stock > 1000) deadStock++;
        });

        setStats({
          count: snap.size,
          totalQty,
          lowStockCount: lowStock,
          noStockCount: noStock,
          deadStockCount: deadStock
        });
      } catch (err) {
        console.error('Failed to load product stats:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  useEffect(() => { // Users display
    const fetchStaff = async () => {
      const user = auth.currentUser;
      if (user) {
        const docRef = doc(db, 'users', user.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStaff(docSnap.data());
        }
      }
    };

    fetchStaff();
  }, []);

  if (loading) return <Loading text="Loading..." />;

  return (
    <div className="space-y-8 text-center">
      {/* Greeting */}
      <h1 className="text-3xl font-bold text-left mt-10">
        Welcome {/*<span className="text-[#F96F45;]">{staff ? `, ${staff.firstName}` : 'Staff'}!</span>*/}
      </h1>

      {/* Stat cards */}
      <div className="flex justify-around mt-10">
        <div className="mt-24 bg-white shadow-lg rounded-xl px-6 py-6 w-full max-w-md space-y-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2 text-left"> Inventory Overview</h2>
          
          <StatRow label="Total Products" value={stats.count} icon={Package} />
          <StatRow label="Total Quantity" value={stats.totalQty} icon={Box} />
          <StatRow label="Low Stock" value={stats.lowStockCount} icon={AlertTriangle} />
          <StatRow label="Dead Stock" value={stats.deadStockCount} icon={Archive} />
          <StatRow label="No Stock" value={stats.noStockCount} icon={PackageX} />
          <Link to="/products" className='block'>
          <div className="w-full flex justify-end">
          <div className=" hover:bg-orange-400 hover:text-white transition-all duration-200 px-6 py-4 rounded-lg shadow-lg max-w-52 w-full text-right">
            <h4 className='font-semibold'>Go View Intentory → </h4>
            </div>
          </div>
          </Link>

          
        </div>

        {/* <div>
        <div className="mt-24 bg-white shadow-lg rounded-xl px-6 py-6 w-full space-y-4">
          <h2 className="text-xl font-bold text-gray-800 mb-2 text-left"> Sales Summary</h2>
          <p> Sales Today </p>
          <p>P1000.00 php</p>
          
        </div>
        </div> */}
      </div>
    </div>
  );
}

function StatRow({ label, value, icon: Icon }) {
  return (
    <div className="flex items-center justify-between border-b last:border-none pb-2">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-[#F96F45] rounded-full">
          <Icon className="text-white" size={24} />
        </div>
        <p className="text-gray-600 font-medium">{label}</p>
      </div>
      <p className="text-xl font-bold text-[#FF9500]">{value}</p>
    </div>
  );
}