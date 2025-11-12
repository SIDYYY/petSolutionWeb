import React, { useState, useEffect } from "react";
import { db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import logo from "../assets/petsolution.png"; // logo import

export default function IntroLock({ onAccess }) {
  const [input, setInput] = useState("");
  const [storedPassword, setStoredPassword] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const docRef = doc(db, "adminAccess", "access_control");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStoredPassword(docSnap.data().password);
      } catch (err) {
        console.error("Error fetching password:", err);
      }
    };
    fetchPassword();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === storedPassword) onAccess();
    else setError("Oops! Wrong password 🐾");
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen" style={{ backgroundColor: "#FF9500" }}>
      {/* Logo */}
      <img
        src={logo}
        alt="PetSolution Logo"
        className="h-28 w-auto mb-6 drop-shadow-lg"
      />

      {/* Friendly title */}
      <h1 className="text-3xl font-bold mb-6 text-white text-center">
        Welcome to PetSolution 🐶🐱
      </h1>

      {/* Password form */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-80">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter password"
          className="p-3 w-full border border-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-white text-center placeholder-white"
        />
        <button
          type="submit"
          className="w-full py-3 bg-white text-orange-500 font-bold rounded-2xl hover:bg-gray-100 transition transform"
        >
          Unlock 🐾
        </button>
      </form>

      {/* Error message */}
      {error && <p className="text-red-600 mt-4 font-semibold text-center">{error}</p>}
    </div>
  );
}
