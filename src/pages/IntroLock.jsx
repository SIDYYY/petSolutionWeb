import React, { useState, useEffect } from "react";
import { db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import logo from "../assets/petsolution.png"; 
import { FaPaw } from "react-icons/fa";

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
    <div className="flex flex-col items-center justify-center h-screen bg-pink-50">
      {/* Cute paw icons floating around */}
      <div className="absolute top-10 left-10 text-yellow-400 animate-bounce">
        <FaPaw size={24} />
      </div>
      <div className="absolute top-20 right-20 text-blue-300 animate-bounce delay-200">
        <FaPaw size={20} />
      </div>

      {/* Logo */}
      <img
        src={logo}
        alt="PetSolution Logo"
        className="h-28 w-auto mb-4 drop-shadow-lg animate-bounce"
      />

      {/* Friendly title */}
      <h1 className="text-3xl font-bold mb-6 text-pink-400 text-center">
        Welcome to PetSolution 🐶🐱
      </h1>

      {/* Password form */}
      <form onSubmit={handleSubmit} className="flex flex-col items-center gap-4 w-80">
        <input
          type="password"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Enter password"
          className="p-3 w-full border border-pink-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-400 text-center placeholder-pink-200"
        />
        <button
          type="submit"
          className="w-full py-3 bg-yellow-300 text-pink-500 font-bold rounded-2xl hover:bg-yellow-400 hover:scale-105 transition transform"
        >
          Unlock 🐾
        </button>
      </form>

      {/* Error message */}
      {error && <p className="text-red-400 mt-4 font-semibold text-center">{error}</p>}
    </div>
  );
}
