import React, { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Home, Box, PlusSquare, CreditCard , Lock, PieChart, Settings   } from "lucide-react";
import logo from "../assets/petsolution.png";
import toast from "react-hot-toast";

export default function Sidebar({ onUnlock, onLock }) {
  const [isOpen, setIsOpen] = useState(true);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState("");
  const navigate = useNavigate();

  const navItems = [
    { name: "Dashboard", icon: <Home size={30} />, path: "/dashboard" },
    { name: "Cashier", icon: <CreditCard  size={30} />, path: "/cashier" },
    { name: "Products", icon: <Box size={30} />, path: "/products" },
    { name: "Sales Report", icon: <PieChart  size={30} />, path: "/salesReport" }
  ];

  const handleManageClick = (e) => {
    e.preventDefault();
    setShowPasswordModal(true);
  };

  const handlePasswordSubmit = () => {
    if (onUnlock(password)) {
      setShowPasswordModal(false);
      setPassword("");
      navigate("/manageProduct");
    } else {
      toast.error("Invalid password");
    }
  };

  return (
    <>
      <div
        className={`bg-[#FF9500] h-screen relative transition-all duration-300 ${
          isOpen ? "w-64" : "w-20"
        } flex flex-col`}
      >
        {/* Logo */}
        <div
          className={`p-4 flex items-center border-b border-orange-600 transition-all duration-300 ${
            isOpen ? "justify-start" : "justify-center"
          }`}
        >
          <img
            src={logo}
            alt="Logo"
            className={`transition-all duration-300 ${
              isOpen ? "w-20 h-16" : "w-14 h-12"
            }`}
          />
          {isOpen && (
            <span className="text-white font-semibold text-xl ml-3">
              Pet Solution
            </span>
          )}
        </div>

        {/* Normal nav items */}
        <nav className="flex-1 flex flex-col p-2 space-y-2">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                  isActive
                    ? "bg-white text-[#FF9500] font-semibold"
                    : "text-white hover:bg-white/20"
                }`
              }
            >
              {item.icon}
              {isOpen && <span>{item.name}</span>}
            </NavLink>
          ))}

          {/* Manage Products WITH PIN */}
          <div
            onClick={handleManageClick}
            className={`cursor-pointer flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
              window.location.pathname === "/manageProduct"
                ? "bg-white text-[#FF9500] font-semibold"
                : "text-white hover:bg-white/20"
            }`}
          >
            <Settings  size={30} />
            {isOpen && <span>Manage Products</span>}
          </div>
        </nav>

        <div className="mt-auto p-3">
          <button
            onClick={() => {
              onLock();         
              navigate("/");
              toast("🔒 App Locked!");
            }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-white hover:bg-white/20 w-full justify-center"
          >
            <Lock size={24} />
            {isOpen && <span>Locked</span>}
          </button>
        </div>

        {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          absolute right-0 top-1/2 -translate-y-1/2 
          bg-white/20 hover:bg-white/50 backdrop-blur-sm 
          text-white w-8 h-12 flex items-center justify-center 
          rounded-l-lg shadow-md 
          transition-all duration-300 ease-in-out
          hover:scale-105
        `}
      >
        <span className="text-lg font-bold">{isOpen ? "❮" : "❯"}</span>
      </button>

      </div>

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-80">
            <h2 className="text-lg font-bold mb-4">Enter Admin PIN</h2>
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
