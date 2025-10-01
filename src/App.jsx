import React, { useState } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";

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

  // Unlock with password
  const handleUnlock = (password) => {
    if (password === "admin123") {
      setIsInventoryUnlocked(true);
      return true;
    }
    return false;
  };

  // Manual lock (Finish button or leaving)
  const handleLock = () => {
    setIsInventoryUnlocked(false);
  };

  return (
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
        <Route path="cashier" element={<Cashier/>}/>

        {/* CRUD routes only available if unlocked */}
        {isInventoryUnlocked && (
          <>
            <Route path="manageProduct" element={<ManageProduct />} />
            <Route path="manage/bulkUpdate" element={<BulkUpdate />} />
            <Route path="manage/addProduct" element={<AddProduct />} />
            <Route path="manage/updateProduct" element={<UpdateProduct />} />
          </>
        )}
      </Route>
    </Routes>
  );
}
