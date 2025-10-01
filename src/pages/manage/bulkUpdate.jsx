import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import { collection, doc, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '../../../firebase';

export default function BulkUpdate() {
  // Firestore snapshot
  const [dbProducts, setDbProducts] = useState(new Map());
  // CSV rows that actually differ
  const [diff, setDiff] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState({ msg: '', type: '' });

  useEffect(() => {
    if (!toast.msg) return;
    const id = setTimeout(() => setToast({ msg: '', type: '' }), 3000);
    return () => clearTimeout(id);
  }, [toast]);

  /* 0️⃣  fetch existing products once */
  useEffect(() => {
    const fetchDb = async () => {
      const snap = await getDocs(collection(db, 'products'));
      const map = new Map();
      snap.forEach((d) => map.set(d.id, d.data()));
      setDbProducts(map);
    };
    fetchDb();
  }, []);

  /* 1️⃣  Parse CSV + diff */
  const handleCSVUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: ({ data }) => {
        const changed = data
          .map((row, i) => {
            const id   = row['ID']?.trim();
            const name = row['Product']?.trim() ?? '';
            const qty  = Number((row['Qty.'] || '0').toString().replace(/[^\d.-]/g, ''));

            if (!id) return null;

            const inDb = dbProducts.get(id);
            const sameName = inDb?.name === name;
            const sameQty  = Number(inDb?.qty) === qty;

            // keep if something is different or doc missing
            return sameName && sameQty ? null : { id, name, qty };
          })
          .filter(Boolean); // remove nulls

        setDiff(changed);
      },
    });
  };

  /* 2️⃣  Bulk update only changed docs */
  const handleUpdate = async () => {
    if (diff.length === 0) return;
    setUploading(true);

    try {
      for (let i = 0; i < diff.length; i += 500) {
        const batch = writeBatch(db);
        diff.slice(i, i + 500).forEach(prod => {
          const ref = doc(db, 'products', prod.id);
          batch.set(ref, { name: prod.name, qty: prod.qty }, { merge: true });
        });
        await batch.commit();
      }
      setToast({ msg: ' ✅ Bulk update successful!', type: 'success' });
      setDiff([]);
    } catch (err) {
      console.error(err);
      setToast({ msg: ' ❌ Update failed – check console.', type: 'error' });
    } finally {
      setUploading(false);
    }
  };

  /* 3️⃣  UI */
  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6 border rounded-sm  ">
      <h2 className="text-2xl font-bold text-orange-500">Bulk Product Update</h2>

      <div className='flex justify-between'>
      <input
        type="file"
        accept=".csv"
        onChange={handleCSVUpload}
        className="border p-2 rounded items-center align-middle flex"
      />

      <button
            onClick={handleUpdate}
            className="mt-4 bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 disabled:opacity-60"
            disabled={uploading}
          >
            {uploading ? 'Updating…' : 'Confirm Update'}
      </button>
      </div>

      {toast.msg && (
        <div
          className={`fixed top-2 right-0 px-5 py-3 rounded-l-full shadow-lg text-white 
                      ${toast.type === 'success' ? 'bg-green-600' : 'bg-red-600'}
                      animate-slide-right `}
        >
          {toast.msg}
        </div>
      )}
      {/* show only changed rows */}
      {diff.length > 0 && (
        <>
          <p className="text-gray-600 mt-4">
            Showing {diff.length} product{diff.length > 1 && 's'} with changes
          </p>

          <table className="w-full mt-2 table-auto border">
            <thead>
              <tr className="bg-gray-100">
                <th className="p-2 border">ID</th>
                <th className="p-2 border">Name</th>
                <th className="p-2 border">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {diff.map((p) => (
                <tr key={p.id}>
                  <td className="p-2 border">{p.id}</td>
                  <td className="p-2 border">{p.name}</td>
                  <td className="p-2 border">{p.qty}</td>
                </tr>
              ))}
            </tbody>
          </table>

          
        </>
      )}

      {diff.length === 0 && (
        <p className="text-gray-400 mt-4">
          Upload a CSV to see which products will change.
        </p>
      )}
    </div>
  );
}
