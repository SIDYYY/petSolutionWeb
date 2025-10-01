// src/pages/Login.jsx
import React, {useEffect, useState} from 'react';
import { useForm } from 'react-hook-form';
import { signInWithEmailAndPassword,onAuthStateChanged  } from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth } from '../../firebase';

export default function Login() {
  const { register, handleSubmit, formState: { errors }, setError } = useForm();
  const navigate = useNavigate();
  const location  = useLocation();
  const from      = location.state?.from?.pathname || '/dashboard';

  // toast state
  const [toast, setToast] = useState(null);

  useEffect(() => {
  const unsub = onAuthStateChanged(auth, (user) => {
    if (user) navigate('/dashboard');  // or any page
  });

  return unsub;
}, []);

  // auto-dismiss after 3 s
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  const onSubmit = async ({ email, password }) => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
      navigate(from, { replace: true });
    } catch (e) {
      console.error(e);
      setError('password', { type: 'manual', message: 'Invalid credentials' });
      setToast('🚫 Invalid credentials');
    }
  };

  return (
    <div className="relative flex items-center justify-center h-screen bg-[#FF9500]">

      

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-white p-8 rounded-xl shadow-md space-y-6 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Staff&nbsp;Login
        </h2>

        <input
          {...register('email', { required: 'Email is required' })}
          type="email"
          placeholder="Email"
          className="w-full border px-4 py-3 rounded-lg"
        />

        <input
          {...register('password', { required: 'Password is required' })}
          type="password"
          placeholder="Password"
          className="w-full border px-4 py-3 rounded-lg"
        />

        <button
          type="submit"
          className="w-full bg-[#FF9500] text-white py-3 rounded-lg hover:bg-orange-600"
        >
          Login
        </button>
      </form>
      
        {/* ✅ Slide-in Toast */}
      {toast && (
        <div id="toast-top-right" class="absolute top-10 right-0 bg-red-500 text-white p-4 rounded-l-full "
         role="alert">
          {toast}
        </div>
      )}

    </div>
  );
}
