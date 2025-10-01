import React from 'react';
import { useForm } from 'react-hook-form';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useNavigate } from 'react-router-dom';

export default function Register() {
  const { register, handleSubmit, formState: { errors } } = useForm();
  const navigate = useNavigate();

  const onSubmit = async ({ firstName, lastName, email, password }) => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Store staff profile in Firestore
      await setDoc(doc(db, 'users', user.uid), {
        firstName,
        lastName,
        email,
        role: 'staff',
        createdAt: new Date()
      });

      navigate('/dashboard');
    } catch (err) {
      console.error('Registration error:', err);
      alert('Failed to register. ' + err.message);
    }
  };

  return (
    <div className="flex items-center justify-center h-screen bg-[#fff]">
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="bg-[#FF9500] p-8 rounded-xl shadow-md space-y-6 w-full max-w-md"
      >
        <h2 className="text-2xl font-bold text-center text-white">Staff Register</h2>

        <input
          {...register('firstName', { required: 'First name is required' })}
          type="text"
          placeholder="First Name"
          className="w-full border px-4 py-3 rounded-lg"
        />
        <input
          {...register('lastName', { required: 'Last name is required' })}
          type="text"
          placeholder="Last Name"
          className="w-full border px-4 py-3 rounded-lg"
        />
        <input
          {...register('email', { required: 'Email is required' })}
          type="email"
          placeholder="Email"
          className="w-full border px-4 py-3 rounded-lg"
        />
        <input
          {...register('password', { required: 'Password is required', minLength: 6 })}
          type="password"
          placeholder="Password"
          className="w-full border px-4 py-3 rounded-lg"
        />

        {errors.password && (
          <p className="text-sm text-red-100 bg-red-500 px-4 py-2 rounded">
            {errors.password.message}
          </p>
        )}

        <button
          type="submit"
          className="w-full bg-white text-gray-800 py-3 rounded-lg hover:bg-orange-600 hover:text-white"
        >
          Register
        </button>
      </form>
    </div>
  );
}
