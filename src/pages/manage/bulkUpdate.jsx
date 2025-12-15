import React, { useEffect, useState } from 'react';
import { ArrowLeft } from "lucide-react";
import Papa from 'papaparse';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase';
import { useNavigate } from "react-router-dom";

export default function BulkUpdate() {
  const navigate = useNavigate();
  const [dbProducts, setDbProducts] = useState(new Map());
  const [diff, setDiff] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  useEffect(() => {
    if (!toast.msg) return;
    const id = setTimeout(() => setToast({ msg: '', type: '' }), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  /* Fetch existing Firestore data */
  useEffect(() => {
    const fetchDb = async () => {
      const snap = await getDocs(collection(db, 'products'));
      const map = new Map();
      snap.forEach((d) => map.set(d.id, d.data()));
      setDbProducts(map);
    };
    fetchDb();
  }, []);

  /* Parse CSV + detect changed rows */
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const grouped = {};

        data.forEach(row => {
          const sku = row["SKU"]?.trim();
          if (!sku) return;

          if (!grouped[sku]) grouped[sku] = [];

          grouped[sku].push({
            year: Number(row["Year"]),
            month: row["Month"],
            qty: Number(row["Quantity"] || 0),
            qtySold: Number(row["QuantitySold"] || 0),
            name: row["Name"]?.trim() || "",
            price: Number(row["Price"] || 0),
            leadTime: Number(row["LeadTime"] || 0), 
            productGroup: row["ProductGroup"]?.trim() || "",
            threshold: Number(row["PredictedThreshold"] || 0)
          });
        });

        const changed = [];

        Object.entries(grouped).forEach(([sku, rows]) => {
          rows.sort((a, b) => a.year - b.year);

          const last3 = rows.slice(-3);

          const isDeadstock =
            last3.length >= 2 &&
            last3.every(r => Number(r.qtySold) === 0);

          const latest = rows[rows.length - 1];

          const totalSold = rows.reduce((sum, r) => sum + r.qtySold, 0);

          const product = {
            name: latest.name,
            productGroup: latest.productGroup,
            qty: latest.qty,
            price: latest.price,
            threshold: Math.round(latest.threshold),
            deadstock: isDeadstock,
            quantitySold: totalSold,
            leadTime: latest.leadTime, // <<< included
          };

          const inDb = dbProducts.get(sku);

          const isSame =
            inDb &&
            inDb.name === product.name &&
            inDb.productGroup === product.productGroup &&
            Number(inDb.qty) === product.qty &&
            Number(inDb.price) === product.price &&
            Number(inDb.threshold) === product.threshold &&
            Number(inDb.quantitySold || 0) === product.quantitySold &&
            Boolean(inDb.deadstock) === product.deadstock &&
            Number(inDb.leadTime || 0) === product.leadTime; // <<< check leadTime

          if (!isSame) changed.push({ id: sku, ...product });
        });

        setDiff(changed);
      }
    });
  };

  /* Bulk update Firestore */
  const handleUpdate = async () => {
    if (diff.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < diff.length; i += 500) {
        const batch = writeBatch(db);

        diff.slice(i, i + 500).forEach((prod) => {
          const ref = doc(db, 'products', prod.id);
          batch.set(
            ref,
            {
              name: prod.name,
              productGroup: prod.productGroup,
              qty: prod.qty,
              price: prod.price,
              threshold: prod.threshold,
              deadstock: prod.deadstock,
              quantitySold: prod.quantitySold,
              leadTime: prod.leadTime, // <<< write leadTime to Firestore
            },
            { merge: true }
          );
        });

        await batch.commit();
      }

      setToast({ msg: '✅ Bulk update successful!', type: 'success' });
      setDiff([]);
    } catch (err) {
      console.error(err);
      setToast({ msg: '❌ Update failed – check console.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6 border rounded-sm">
      <button
        onClick={() => navigate(-1)}
        className="flex items-center gap-2 px-5 py-2 bg-orange-500 hover:bg-orange-600 text-white font-semibold rounded-xl shadow-md transition-all duration-200"
      >
        <ArrowLeft size={20} className="text-white" />
        Back
      </button>

      <h2 className="text-2xl font-bold text-orange-500">Bulk Product Update</h2>

      <div className="flex justify-between">
        <input
          type="file"
          accept=".csv"
          onChange={handleCSVUpload}
          className="border p-2 rounded items-center flex"
        />

        <button
          onClick={handleUpdate}
          className="mt-4 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-60"
          disabled={uploading}
        >
          {uploading ? 'Updating…' : 'Confirm Update'}
        </button>
      </div>

      {diff.length > 0 && (
        <div className="overflow-x-auto mt-4">
          <table className="w-full table-auto border text-sm">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">SKU</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Product Group</th>
                <th className="p-2 border">Qty</th>
                <th className="p-2 border">Price</th>
                <th className="p-2 border">Threshold</th>
                <th className="p-2 border">Qty Sold</th>
                <th className="p-2 border">Deadstock</th>
                <th className="p-2 border">Lead Time</th> {/* <<< show leadTime */}
              </tr>
            </thead>
            <tbody>
              {diff.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.id}</td>
                  <td className="p-2 border">{p.name}</td>
                  <td className="p-2 border">{p.productGroup}</td>
                  <td className="p-2 border">{p.qty}</td>
                  <td className="p-2 border">{p.price}</td>
                  <td className="p-2 border">{p.threshold}</td>
                  <td className="p-2 border">{p.quantitySold}</td>
                  <td className="p-2 border">{p.deadstock ? 'Yes' : 'No'}</td>
                  <td className="p-2 border">{p.leadTime}</td> {/* <<< show leadTime */}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {diff.length === 0 && (
        <p className="text-gray-400 mt-4">
          Upload a CSV to see which products will change.
        </p>
      )}
    </div>
  );
}
