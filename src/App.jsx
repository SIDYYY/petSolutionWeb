import React, { useState, useEffect } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { Toaster } from "react-hot-toast";


import { doc, getDoc } from "firebase/firestore";
import { db } from "../firebase"; 

import Sidebar from "./components/sideBar";
import Dashboard from "./pages/dashboard";
import Products from "./pages/product";
import ManageProduct from "./pages/manageProduct";
import BulkUpdate from "./pages/manage/bulkUpdate";
import AddProduct from "./pages/manage/addProduct";
import UpdateProduct from "./pages/manage/updateProduct";
import Reports from "./pages/reports";
import Settings from "./pages/settings";
import Cashier from "./pages/cashier";
import IntroLock from "./pages/IntroLock";
import AdminPass from "./pages/manage/adminPass";
import SalesHistory from "./pages/SalesHistory"; 
import SalesReport from "./pages/salesReport";

function PrivateLayout({ isInventoryUnlocked, onUnlock, onLock }) {
  return (
    <div className="flex h-screen bg-gray-100">
      <Sidebar
        isInventoryUnlocked={isInventoryUnlocked}
        onUnlock={onUnlock}
        onLock={onLock}
      />
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}

export default function App() {
  const [isInventoryUnlocked, setIsInventoryUnlocked] = useState(false);
  const [isAccessGranted, setIsAccessGranted] = useState(false);
  const [storedPassword, setStoredPassword] = useState("");

  // Fetch the password from Firestore
  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const docRef = doc(db, "adminAccess", "access_control");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setStoredPassword(docSnap.data().master_pin);
        } else {
          console.error("No access_control document found in adminAccess!");
        }
      } catch (error) {
        console.error("Error fetching password:", error);
      }
    };
    fetchPassword();
  }, []);

  // Unlock with password from Firestore
const handleUnlock = (password) => {
    if (password === storedPassword) {
      setIsInventoryUnlocked(true);
      setIsAccessGranted(true); // user can now see PrivateLayout
      return true;
    }
    return false;
  };

  const handleLock = () => {
    setIsInventoryUnlocked(false);
    setIsAccessGranted(false); // this will hide the PrivateLayout
  };

  // Show IntroLock until access is granted
  if (!isAccessGranted) {
    return <IntroLock onAccess={() => setIsAccessGranted(true)} />;
  }

  return (
  <>
  <Toaster position="top-center" reverseOrder={false} />
    <Routes>
      <Route
        element={
          <PrivateLayout
            isInventoryUnlocked={isInventoryUnlocked}
            onUnlock={handleUnlock}
            onLock={handleLock}
          />
        }
      >
        <Route index element={<Navigate to="dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="products" element={<Products />} />
        <Route path="reports" element={<Reports />} />
        <Route path="settings" element={<Settings />} />
        <Route path="cashier" element={<Cashier />} />
        <Route path="SalesHistory" element={<SalesHistory />} />
        <Route path="salesReport" element={<SalesReport />} />
        

        {/* CRUD routes only available if unlocked */}
        {isInventoryUnlocked && (
          <>
            <Route path="manageProduct" element={<ManageProduct />} />
            <Route path="manage/bulkUpdate" element={<BulkUpdate />} />
            <Route path="manage/addProduct" element={<AddProduct />} />
            <Route path="manage/updateProduct" element={<UpdateProduct />} />
            <Route path="manage/adminPass" element={<AdminPass />} />
          </>
        )}
      </Route>
    </Routes>
    </>
  );
}
