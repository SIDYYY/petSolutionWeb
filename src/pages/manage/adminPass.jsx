import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../../firebase";
import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";


export default function ChangeAccess() {
  const [mode, setMode] = useState("password"); // "password" or "masterPin"
  const [currentPassword, setCurrentPassword] = useState("");
  const [newValue, setNewValue] = useState("");
  const [verifyMasterPin, setVerifyMasterPin] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [storedMasterPin, setStoredMasterPin] = useState("");

  const navigate = useNavigate();
  const docRef = doc(db, "adminAccess", "access_control");

  // Fetch stored credentials
  useEffect(() => {
    const fetchData = async () => {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoredPassword(data.password);
        setStoredMasterPin(data.master_pin);
      }
    };
    fetchData();
  }, []);

  const handleChange = async (e) => {
    e.preventDefault();

    try {
      if (mode === "password") {
        if (currentPassword !== storedPassword) {
          toast.error("❌ Current password is incorrect.");
          return;
        }
        if (!verifyMasterPin || verifyMasterPin !== storedMasterPin) {
          toast.error("❌ Master PIN verification failed.");
          return;
        }
        await updateDoc(docRef, { password: newValue });
        toast.success("✅ Admin password successfully updated!");
      } else {
        if (!verifyMasterPin || verifyMasterPin !== storedMasterPin) {
          toast.error("❌ Current Master PIN is incorrect.");
          return;
        }
        await updateDoc(docRef, { master_pin: newValue });
        toast.success("✅ Master PIN successfully updated!");
      }

      // Reset fields
      setCurrentPassword("");
      setNewValue("");
      setVerifyMasterPin("");

      // ✅ Go back to Manage Product page after short delay
      setTimeout(() => {navigate("/dashboard", { state: { unlocked: true } });}, 1000);
    } catch (error) {
      toast.error("❌ An error occurred while updating credentials.");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100 px-4 relative">
  {/* Back Button */}
  <button
    onClick={() => navigate(-1)}
    className="flex items-center gap-2 px-4 py-2
               bg-[#FF9500] hover:bg-[#e67f00]
               text-white font-semibold rounded-xl
               shadow-md transition-all duration-200 absolute top-4 left-4"
  >
    <ArrowLeft size={20} className="text-white" />
    Back
  </button>
      <div className="bg-white p-8 rounded-2xl shadow-lg w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-orange-600 mb-6">
          Change {mode === "password" ? "Password" : "Master PIN"}
        </h1>

        {/* Mode Selector */}
        <div className="flex justify-center mb-6 space-x-3">
          <button
            onClick={() => setMode("password")}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === "password"
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Password
          </button>
          <button
            onClick={() => setMode("masterPin")}
            className={`px-4 py-2 rounded-lg font-medium ${
              mode === "masterPin"
                ? "bg-orange-500 text-white"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Master PIN
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleChange} className="flex flex-col gap-4">
          {mode === "password" && (
            <input
              type="password"
              placeholder="Current Password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="p-3 border rounded-lg focus:ring-2 focus:ring-orange-400"
            />
          )}

          <input
            type="password"
            placeholder={`New ${mode === "password" ? "Password" : "Master PIN"}`}
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
            className="p-3 border rounded-lg focus:ring-2 focus:ring-orange-400"
          />

          <input
            type="password"
            placeholder={
              mode === "password"
                ? "Verify Master PIN"
                : "Enter Current Master PIN"
            }
            value={verifyMasterPin}
            onChange={(e) => setVerifyMasterPin(e.target.value)}
            className="p-3 border rounded-lg focus:ring-2 focus:ring-orange-400"
          />

          <button
            type="submit"
            className="bg-orange-500 text-white font-semibold py-3 rounded-lg hover:bg-orange-600 transition"
          >
            Update {mode === "password" ? "Password" : "Master PIN"}
          </button>
        </form>
      </div>
    </div>  
  );
}
