import fs from 'fs/promises';
import Papa from 'papaparse';
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';


const serviceAccount = JSON.parse(await fs.readFile('./serviceAccount.json', 'utf8'));

initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore();

// 1) read & parse CSV
const csv = await fs.readFile('./inventory.csv', 'utf8');
const { data } = Papa.parse(csv, { header: true, skipEmptyLines: true });

// 2) batch write to /products collection
const batch = db.batch();
data.forEach((row, index) => {
    const id = row['ID']?.trim();
    const name = row['Product']?.trim();
    const qty = Number(row['Qty.'] ?? 0);

  if (!name) {
    console.warn(`⚠️ Skipped row ${index + 1}: missing product name`);
    return;
  }

  const ref = db.collection('products').doc();
  batch.set(ref, {
    id,
    name,
    qty,
    createdAt: new Date()
  });
});

await batch.commit();

console.log(`Imported ${data.length} products ✔`);
