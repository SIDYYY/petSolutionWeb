import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase"; 

export default function ChangePasswordWithMasterPin() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newMasterPin, setNewMasterPin] = useState("");
  const [masterPinInput, setMasterPinInput] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [masterPin, setMasterPin] = useState("");
  const [message, setMessage] = useState("");

  const docRef = doc(db, "adminAccess", "access_control"); // ✅ use db directly

  // Fetch current password & master PIN from Firestore
  useEffect(() => {
    const fetchData = async () => {
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        setStoredPassword(data.password);
        setMasterPin(data.master_pin);
      }
    };
    fetchData();
  }, []);

  const handleChange = async (e) => {
    e.preventDefault();

    // Verify current password and master PIN
    if (currentPassword !== storedPassword) {
      setMessage("Current password is incorrect.");
      return;
    }
    if (masterPinInput !== masterPin) {
      setMessage("Master PIN is incorrect.");
      return;
    }

    // Update Firestore with new password and/or new master PIN
    const updateData = {};
    if (newPassword) updateData.password = newPassword;
    if (newMasterPin) updateData.master_pin = newMasterPin;

    if (Object.keys(updateData).length === 0) {
      setMessage("No changes detected.");
      return;
    }

    await updateDoc(docRef, updateData);
    setMessage("Password and/or Master PIN successfully updated!");
    setCurrentPassword("");
    setNewPassword("");
    setNewMasterPin("");
    setMasterPinInput("");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-100">
      <h1 className="text-2xl font-bold mb-4">Change Password & Master PIN</h1>
      <form onSubmit={handleChange} className="flex flex-col gap-2 w-80">
        <input
          type="password"
          placeholder="Current Password"
          value={currentPassword}
          onChange={(e) => setCurrentPassword(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="password"
          placeholder="New Password (optional)"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="password"
          placeholder="New Master PIN (optional)"
          value={newMasterPin}
          onChange={(e) => setNewMasterPin(e.target.value)}
          className="p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Master PIN"
          value={masterPinInput}
          onChange={(e) => setMasterPinInput(e.target.value)}
          className="p-2 border rounded"
        />
        <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded">
          Update
        </button>
      </form>
      {message && <p className="mt-2 text-blue-600">{message}</p>}
    </div>
  );
}
