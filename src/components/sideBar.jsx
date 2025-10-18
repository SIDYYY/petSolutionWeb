import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Box, PlusSquare, BarChart2, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "../../firebase";

export default function Sidebar({ onUnlock }) {
  const navigate = useNavigate();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");

  // const handleLogout = async () => {
  //   try {
  //     await signOut(auth);
  //     navigate("/login", { replace: true });
  //   } catch (err) {
  //     console.error("Logout failed", err);
  //   }
  // };

  const handleManageClick = (e) => {
    e.preventDefault();
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (onUnlock(password)) {
      setShowPasswordModal(false);
      setPassword("");
      navigate("/manageProduct"); // ✅ now route exists
    } else {
      alert("Invalid password");
    }
  };

  return (
    <>
      <aside className="w-64 bg-[#FF9500] shadow-md">
        <div className="p-4 text-2xl font-bold border-b flex flex-row gap-3 items-center ">
          <img className="w-16 h-14" src="/petsolution.png" />
          <h3 className="text-2xl font-semibold text-white">Pet Solution</h3>
        </div>
        <nav className="p-4 space-y-2">
          <NavLink to="/dashboard" className="flex items-center gap-3 px-3 py-2 text-white">
            <Home size={20} /> <span>Dashboard</span>
          </NavLink>
          <NavLink to="/cashier" className="flex items-center gap-3 px-3 py-2 text-white">
            <BarChart2 size={20} /> <span>Cashier</span>
          </NavLink>
          <NavLink to="/products" className="flex items-center gap-3 px-3 py-2 text-white">
            <Box size={20} /> <span>Products</span>
          </NavLink>

          {/* Manage Products (protected by password modal) */}
          <a
            href="/manageProduct"
            onClick={handleManageClick}
            className="flex items-center gap-3 px-3 py-2 text-white hover:bg-white/10 rounded-lg"
          >
            <PlusSquare size={20} /> <span>Manage Products</span>
          </a>

          {/* <NavLink to="/reports" className="flex items-center gap-3 px-3 py-2 text-white">
            <BarChart2 size={20} /> <span>Reports</span>
          </NavLink> */}
        </nav>

        {/* Logout button */}
        {/* <button
          onClick={handleLogout}
          className="m-4 flex items-center gap-3 px-3 py-2 rounded-lg font-medium text-white hover:bg-white/10 transition-colors"
        >
          <LogOut size={20} />
          <span>Logout</span>
        </button> */}
      </aside>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">Admin Password</h2>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full border px-3 py-2 rounded mb-4"
              placeholder="Enter password"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword("");
                }}
                className="px-3 py-1 bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-3 py-1 bg-orange-500 text-white rounded"
              >
                Unlock
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
