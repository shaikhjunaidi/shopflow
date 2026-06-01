import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Save, X, Edit2, Trash2, AlertTriangle, CheckCircle, Search, ArrowUpDown } from "lucide-react";
import axios from "axios";

const ImportPreview = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const parsedData = location.state?.parsedData;
  const supplierId = location.state?.supplierId;
  
  const [products, setProducts] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  useEffect(() => {
    if (!parsedData) {
      navigate("/imports");
      return;
    }
    
    // Initialize products with default import action if they seem like duplicates
    // We didn't do full duplicate check in backend yet for this preview (could be done by sending an initial query)
    // For MVP, we allow user to set action if they know it exists. 
    const initialProducts = parsedData.extractedProducts.map((p, index) => ({
      ...p,
      id: index, // temporary id for frontend
      importAction: "CREATE", // default
    }));
    setProducts(initialProducts);
  }, [parsedData, navigate]);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedProducts = React.useMemo(() => {
    let sortableItems = [...products];
    if (searchTerm) {
      sortableItems = sortableItems.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.sku.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        if (a[sortConfig.key] < b[sortConfig.key]) return sortConfig.direction === 'asc' ? -1 : 1;
        if (a[sortConfig.key] > b[sortConfig.key]) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [products, sortConfig, searchTerm]);

  const handleActionChange = (id, newAction) => {
    setProducts(products.map(p => p.id === id ? { ...p, importAction: newAction } : p));
  };

  const handleDeleteRow = (id) => {
    setProducts(products.filter(p => p.id !== id));
  };

  const handleSave = async (action = "APPROVE") => {
    setIsSaving(true);
    try {
      const token = localStorage.getItem("token");
      
      if (location.state?.isReviewingDraft && action === "APPROVE") {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/imports/${location.state.draftId}/approve`, {
          products: products
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/imports/confirm`, {
          fileName: parsedData.fileName,
          filePath: parsedData.filePath,
          products: products,
          supplierId: supplierId,
          action: action
        }, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      
      navigate("/imports/history"); // Navigate to history
    } catch (error) {
      console.error("Error saving import:", error);
      alert(error.response?.data?.error || "Failed to save import");
    } finally {
      setIsSaving(false);
    }
  };

  if (!parsedData) return null;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Review Imported Data</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Found {products.length} products in <span className="font-medium text-gray-700 dark:text-gray-300">{parsedData.fileName}</span>
          </p>
        </div>
        <div className="flex space-x-3">
          <button 
            onClick={() => navigate("/imports")}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center"
          >
            <X size={18} className="mr-2" /> Cancel
          </button>
          <button 
            onClick={() => handleSave("DRAFT")}
            disabled={isSaving || products.length === 0}
            className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center disabled:opacity-50"
          >
            {isSaving ? "Saving..." : <><Save size={18} className="mr-2" /> Save as Draft</>}
          </button>
          <button 
            onClick={() => handleSave("APPROVE")}
            disabled={isSaving || products.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-50"
          >
            {isSaving ? "Saving..." : <><CheckCircle size={18} className="mr-2" /> Approve & Commit</>}
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Search products..."
              className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('sku')}>
                  <div className="flex items-center">SKU <ArrowUpDown size={14} className="ml-1" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('name')}>
                  <div className="flex items-center">Product Name <ArrowUpDown size={14} className="ml-1" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('quantity')}>
                  <div className="flex items-center">Qty <ArrowUpDown size={14} className="ml-1" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('price')}>
                  <div className="flex items-center">Purchase Price <ArrowUpDown size={14} className="ml-1" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider cursor-pointer" onClick={() => handleSort('sellingPrice')}>
                  <div className="flex items-center">Selling Price <ArrowUpDown size={14} className="ml-1" /></div>
                </th>
                <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Action
                </th>
                <th className="p-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Manage
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {sortedProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                  <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">{product.sku}</td>
                  <td className="p-4 text-sm text-gray-600 dark:text-gray-300">{product.name}</td>
                  <td className="p-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${product.quantity > 0 ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'}`}>
                      {product.quantity}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">${product.price?.toFixed(2)}</td>
                  <td className="p-4 text-sm text-green-600 dark:text-green-400 font-medium">${product.sellingPrice?.toFixed(2)}</td>
                  <td className="p-4">
                    <select 
                      value={product.importAction}
                      onChange={(e) => handleActionChange(product.id, e.target.value)}
                      className="text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white rounded-md py-1 px-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="CREATE">Create New</option>
                      <option value="UPDATE">Update Existing</option>
                      <option value="INCREASE">Increase Stock</option>
                    </select>
                  </td>
                  <td className="p-4 text-right">
                    <button 
                      onClick={() => handleDeleteRow(product.id)}
                      className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                      title="Remove from import"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {sortedProducts.length === 0 && (
                <tr>
                  <td colSpan="6" className="p-8 text-center text-gray-500 dark:text-gray-400">
                    No products found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default ImportPreview;
