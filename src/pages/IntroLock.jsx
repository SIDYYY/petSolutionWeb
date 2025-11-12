import React, { useState, useEffect } from "react";
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { app } from "../firebase"; // Your firebase config

export default function IntroLock({ onAccess }) {
  const [input, setInput] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [error, setError] = useState("");

  const db = getFirestore(app);

  // Fetch current password from Firestore
  useEffect(() => {
    const fetchPassword = async () => {
      const docRef = doc(db, "settings", "access_control");
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        setStoredPassword(docSnap.data().password);
      }
    };
    fetchPassword();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === storedPassword) {
      onAccess();
    } else {
      setError("Incorrect password");
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gray-200">
      <h1 className="text-2xl font-bold mb-4">Enter Password</h1>
      <form onSubmit={handleSubmit}>
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Password"
          className="p-2 border rounded mb-2"
        />
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded">
          Unlock
        </button>
      </form>
      {error && <p className="text-red-500 mt-2">{error}</p>}
    </div>
  );
}
