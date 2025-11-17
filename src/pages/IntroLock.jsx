import React, { useState, useEffect } from "react";
import { db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import curve from "../assets/curve.png";
import dog from "../assets/dog.png";
import toast, { Toaster } from "react-hot-toast";

export default function Welcome({ onAccess }) {
  const [hovered, setHovered] = useState(false);
  const [password, setPassword] = useState("");
  const [storedPassword, setStoredPassword] = useState("");

  // Fetch password from Firebase
  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const docRef = doc(db, "adminAccess", "access_control");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStoredPassword(docSnap.data().password);
        else toast.error("Password not found in server");
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch password");
      }
    };
    fetchPassword();
  }, []);

  const handleUnlockClick = () => {
    if (!storedPassword) {
      toast.error("Password not loaded yet. Try again.");
      return;
    }
    if (password === storedPassword) {
      toast.success("Access granted!");
      onAccess(); // unlock the app
    } else {
      toast.error("Incorrect password");
    }
  };

  return (
    <div
      className={`relative w-full h-screen flex flex-col items-center justify-center overflow-hidden transition-all duration-700 ease-in-out ${
        hovered ? "bg-white" : "bg-orange-500"
      }`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <Toaster position="top-center" reverseOrder={false} />

      {/* Dog image and text */}
      <div
        className={`flex flex-col items-center text-center transition-all duration-700 ease-in-out z-30 ${
          hovered ? "translate-y-[-180px]" : "translate-y-0"
        }`}
      >
        <img
          src={dog}
          alt="dog"
          className={`w-[250px] md:w-[750px] mb-4 transition-all duration-700 ${
            hovered ? "scale-90" : "scale-100"
          }`}
        />
        <h1
          className={`text-2xl md:text-4xl font-bold transition-colors duration-700 ${
            hovered ? "text-gray-800" : "text-white"
          }`}
        >
          Welcome to
        </h1>
        <h2
          className={`text-3xl md:text-5xl font-extrabold transition-colors duration-700 ${
            hovered ? "text-orange-500" : "text-white"
          }`}
        >
          Pet Solutions
        </h2>
        <h2
          className={`text-3xl md:text-5xl font-extrabold transition-colors duration-700 ${
            hovered ? "text-orange-500" : "text-white"
          }`}
        >
          CDO
        </h2>
      </div>

      {/* Password input section */}
      <div
        className={`absolute inset-0 flex flex-col items-center justify-end transition-all duration-700 ${
          hovered
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-10 pointer-events-none"
        }`}
      >
        <div className="flex flex-col items-center space-y-5 mb-[10%] z-30">
          <input
            type="password"
            placeholder="Enter Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="px-10 py-4 w-[280px] md:w-[340px] rounded-2xl bg-orange-100 text-black text-lg md:text-xl font-medium text-center placeholder-black outline-none focus:ring-2 focus:ring-orange-400 shadow-md transition-transform duration-300 hover:scale-105"
          />
          <button
            onClick={handleUnlockClick}
            className={`px-10 py-4 w-[280px] md:w-[340px] rounded-2xl text-lg md:text-xl font-semibold transition-all duration-500 shadow-md border-2 ${
              hovered
                ? "bg-orange-500 text-white border-orange-500 hover:bg-orange-600"
                : "bg-white text-orange-500 border-white"
            }`}
          >
            Unlock
          </button>
        </div>

        <img
          src={curve}
          alt="curve"
          className="absolute bottom-0 left-0 w-full h-[125%] object-cover z-20"
        />
      </div>
    </div>
  );
}
