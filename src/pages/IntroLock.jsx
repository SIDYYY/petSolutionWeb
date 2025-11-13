import React, { useState, useEffect } from "react";
import { db } from "../../firebase"; 
import { doc, getDoc } from "firebase/firestore";
import logo from "../assets/dog.png";
import toast, { Toaster } from "react-hot-toast";

export default function IntroLock({ onAccess }) {
  const [input, setInput] = useState("");
  const [storedPassword, setStoredPassword] = useState("");

  useEffect(() => {
    const fetchPassword = async () => {
      try {
        const docRef = doc(db, "adminAccess", "access_control");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) setStoredPassword(docSnap.data().password);
      } catch (err) {
        console.error("Error fetching password:", err);
        toast.error("Failed to fetch password from server");
      }
    };
    fetchPassword();
  }, []);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (input === storedPassword) {
      toast.success(" Access granted!");
      onAccess();
    } else {
      toast.error(" Incorrect password");
    }
  };

  return (
    <div className="flex flex-col items-center justify-start h-screen w-full" style={{ backgroundColor: "#FF9500" }}>
      {/* Toast container */}
      <Toaster position="top-center" reverseOrder={false} />

      {/* Top white card with curved bottom */}
      <div className="bg-white w-full h-3/5 flex flex-col items-center justify-end rounded-b-[40%] py-6 px-6">
        <div>
          <img src={logo} alt="PetSolution Logo" className="h-52 w-auto"/>
        </div>
        <h3 className="text-2xl font-serif font-bold"> Welcome to </h3>
        <h1 className="text-4xl font-serif font-medium text-[#FF9500] text-center">
          Pet Solutions<br /> CDO
        </h1>
      </div>

      {/* Bottom orange section with form */}
      <div className="flex flex-col items-center justify-start flex-1 w-full px-6 ">
        <div className="bg-white py-10 px-20 rounded-b-[20%] border-t-2 border-[#FF9500]">
          <form onSubmit={handleSubmit} className="flex flex-col gap-4 w-full max-w-xs ">
            <input
              type="password"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Enter Password"
              className="p-3 w-full border border-[#FF9500] rounded-md focus:outline-none focus:ring-2 focus:ring-[#FF9500] text-gray-800 placeholder-gray-500 text-center"
            />
            <button
              type="submit"
              className="w-full py-3 border border-white bg-orange-500 text-white font-semibold rounded-md hover:bg-orange-400 hover:text-white transition"
            >
              Unlock
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
