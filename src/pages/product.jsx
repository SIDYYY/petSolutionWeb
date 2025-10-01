import React, { useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { Search} from 'lucide-react';
import { db } from '../../firebase';
import Loading from './functions/loading';



export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('')
  console.log(search)

  const [option, setOption] = useState('')

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
  

  return (
    <div className="h-full overflow-y-auto p-4 bg-white rounded-xl shadow space-y-4">
      <h2 className="text-2xl font-bold text-[#FF9500]">Product List</h2>
      
        <form className="relative w-full max-w-lg ">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/4 text-gray-400" size={18} />
        <input
            type="text"
            value={search}
            placeholder="Search Products"
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10 pr-4 py-2 mt-4 border border-gray-300 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-orange-300"
        />
        </form>

        <select
        value={option}
        onChange={(e) => setOption(e.target.value)}
        className={`border px-4 py-2 rounded text-black transition
            ${
                  option === 'noStock'
                ? 'bg-red-600 text-white'
                : option === 'lowStock'
                ? 'bg-orange-500 text-white'
                : option === 'attention'
                ? 'bg-yellow-500 text-white'
                : 'bg-white text-black'
            }`}
        >
        <option className='bg-white text-black' value="">Check Stocks</option>
        <option className='bg-white text-black' value="noStock">No Stocks</option>
        <option className='bg-white text-black' value="lowStock">Low on stocks</option>
        <option className='bg-white text-black' value="attention">Need Attention</option>
        </select>

      <table className="w-full table-auto border-collapse">
        <thead>
          <tr className="bg-gray-100 text-left">
            <th className="p-2 border-b">Name</th>
            <th className="p-2 border-b">Quantity</th>
          </tr>
        </thead>
        <tbody>
          {products.filter((prod) => {
            const keyword = search.trim().toLowerCase();
            const name = prod.name || '';
            const matchedSearch = keyword === '' ? true : name.toLowerCase().includes(keyword);

            const matchedOption =
                option === '' ||
                (option === 'attention' && prod.qty < 0) ||
                (option === 'noStock' && prod.qty === 0) ||
                (option === 'lowStock' && prod.qty > 0 && prod.qty <= 5);

            return matchedSearch && matchedOption;
            })

          
          .map(prod => (
            <tr key={prod.id} className="hover:bg-gray-50">
              <td className="p-2 border-b">{prod.name}</td>
              <td className="p-2 border-b ">{prod.qty}
                {prod.qty < 0 && (
                <span className="ml-4 px-2 py-1 rounded-full bg-yellow-500 text-white text-sm font-semibold  items-center whitespace-nowrap ">
                    • Need Attention
                </span>
                )}
                {prod.qty === 0 && (
                <span className="ml-4 px-2 py-1 rounded-full bg-red-600 text-white text-sm font-semibold  items-center whitespace-nowrap">
                    • No stock available
                </span>
                )}
                {prod.qty > 0 && prod.qty <= 5 && (
                <span className="ml-4 px-2 py-1 rounded-full bg-orange-500 text-white text-sm font-semibold  items-center whitespace-nowrap">
                    • Low on stock
                </span>
                )}
              </td>
            </tr>
          ))}
          {products.filter(prod =>
            prod.name?.toLowerCase().includes(search.trim().toLowerCase())
            ).length === 0 && (
            <tr>
                <td colSpan={2} className="text-center py-4 text-gray-400 italic">
                No matching products found.
                </td>
            </tr>
            )}
        </tbody>
      </table>
    </div>
  );
}
