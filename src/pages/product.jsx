import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Search } from 'lucide-react';
import { db } from '../../firebase';
import Loading from './functions/loading';
import { useLocation } from 'react-router-dom';

export default function Products() {
  const location = useLocation();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [option, setOption] = useState('');

  // SORT STATE
  
  const [sortField, setSortField] = useState(null);
  const [sortOrder, setSortOrder] = useState('asc'); // "asc" | "desc"

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const filterParam = params.get('filter');
    if (filterParam) setOption(filterParam);
  }, [location]);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const snap = await getDocs(collection(db, 'products'));
        const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setProducts(items);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, []);

  if (loading) return <Loading text="Loading..." />;

  // 🔽 SORT HANDLER
  const handleSort = (field) => {
    if (sortField === field) {
      // Toggle asc/desc
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  // 🧮 SORT FUNCTION
  const applySorting = (items) => {
    if (!sortField) return items;

    return [...items].sort((a, b) => {
      const valA = a[sortField];
      const valB = b[sortField];

      // NAME SORTING → must be string compare
      if (sortField === 'name') {
        return sortOrder === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      // NUMBER SORTING → price or qty
      return sortOrder === 'asc'
        ? valA - valB
        : valB - valA;
    });
  };

  // 🔍 FILTER + SEARCH
  const filtered = products.filter((prod) => {
    const keyword = search.trim().toLowerCase();
    const name = prod.name?.toLowerCase() || '';

    const matchedSearch = keyword === '' ? true : name.includes(keyword);

    const matchedOption =
      option === '' ||
      (option === 'noStock' && prod.qty === 0) ||
      (option === 'lowStock' && prod.qty > 0 && prod.qty < (prod.threshold || 3)) ||
      (option === 'deadStock' && prod.deadstock === true && prod.qty > 0) ||
      (option === 'negative' && prod.qty < 0);

    return matchedSearch && matchedOption;
  });

  const finalList = applySorting(filtered);

  // Arrow UI
  const renderArrow = (field) => {
    if (sortField !== field) return "↕"; // neutral arrow

    return sortOrder === 'asc' ? "▲" : "▼";
  };

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-xl shadow space-y-4">
      <h2 className="text-2xl font-bold text-[#FF9500]">Product List</h2>

      {/* 🔍 Search */}
      <div className="relative w-full max-w-lg">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/4 text-gray-400" size={18} />
        <input
          type="text"
          value={search}
          placeholder="Search Products"
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 pr-4 py-2 mt-4 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
      </div>

      {/* 🔽 Stock Filter */}
      <select
        value={option}
        onChange={(e) => setOption(e.target.value)}
        className="border px-4 py-2 rounded w-40"
      >
        <option value="">Check Stocks</option>
        <option value="noStock">No Stocks</option>
        <option value="lowStock">Low on Stocks</option>
        <option value="deadStock">Dead Stock</option>
        <option value="negative">Need Actions</option>
      </select>

      {/* 🧾 Table */}
      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-orange-500 text-left text-white">
            <th
              onClick={() => handleSort("name")}
              className="p-2 border-b cursor-pointer select-none"
            >
              Name {renderArrow("name")}
            </th>

            <th
              onClick={() => handleSort("price")}
              className="p-2 border-b cursor-pointer select-none"
            >
              Price {renderArrow("price")}
            </th>

            <th
              onClick={() => handleSort("qty")}
              className="p-2 border-b cursor-pointer select-none"
            >
              Quantity {renderArrow("qty")}
            </th>
          </tr>
        </thead>

        <tbody>
          {finalList.map((prod) => (
            <tr key={prod.id} className="hover:bg-gray-50">
              <td className="p-2 border-b">{prod.name}</td>
              <td className="p-2 border-b">₱ {prod.price}</td>
              <td className="p-2 border-b">
                {prod.qty}

                {/* BADGES */}
                {prod.deadstock && prod.qty > 0 && (
                  <span className="ml-4 px-2 py-1 rounded-full bg-gray-800 text-white text-sm">
                    • Dead Stock
                  </span>
                )}

                {prod.qty === 0 && (
                  <span className="ml-4 px-2 py-1 rounded-full bg-red-600 text-white text-sm">
                    • No Stock Available
                  </span>
                )}

                {prod.qty > 0 && prod.qty < (prod.threshold || 3) && !prod.deadstock && (
                  <span className="ml-4 px-2 py-1 rounded-full bg-orange-500 text-white text-sm">
                    • Low on Stock
                  </span>
                )}

                {prod.qty < 0 && (
                  <span className="ml-4 px-2 py-1 rounded-full bg-yellow-500 text-white text-sm">
                    • Negative - Check Inventory
                  </span>
                )}
              </td>
            </tr>
          ))}

          {finalList.length === 0 && (
            <tr>
              <td colSpan={3} className="text-center py-4 text-gray-400 italic">
                No products found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
