import React from 'react';
import { useForm } from 'react-hook-form';
import { addDoc, collection } from 'firebase/firestore';
import { db } from '../../../firebase';          

export default function manageProduct() {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors }
  } = useForm();

  const onSubmit = async (data) => {
    // coerce numeric fields
    const payload = {
      ...data,
      qty: Number(data.qty),
      createdAt: new Date(),
    };

    try {
      await addDoc(collection(db, 'products'), payload);
      window.alert('Product added successfully!');
      reset(); // clear the form
    } catch (err) {
      console.error('Error adding product:', err);
      window.alert('Failed to add product.');
    }
  };

  return (
    <div>
      <h1 className="text-3xl font-bold mb-4">Add Product</h1>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-4 max-w-lg"
      >
        {/* Product Name */}
        <input
          {...register('name', { required: 'Name is required' })}
          placeholder="Product Name"
          className="w-full border p-3 rounded-lg"
        />
        {errors.name && (
          <p className="text-sm text-red-600">{errors.name.message}</p>
        )}

        {/* Quantity */}
        <input
          {...register('qty', {
            required: 'Quantity is required',
            valueAsNumber: true
          })}
          type="number"
          placeholder="Quantity"
          className="w-full border p-3 rounded-lg"
        />
        {errors.qty && (
          <p className="text-sm text-red-600">{errors.qty.message}</p>
        )}

        <button
          type="submit"
          className="bg-[#FF9500] text-white px-6 py-3 rounded-lg hover:bg-orange-600"
        >
          Save
        </button>
      </form>
    </div>
  );
}
