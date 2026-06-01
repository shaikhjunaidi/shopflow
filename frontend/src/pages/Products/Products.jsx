import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Package, X, FilterX, Printer } from "lucide-react";
import Barcode from "react-barcode";
import axios from "axios";
import { Skeleton } from "../../components/ui/Skeleton";
import { useSearchParams, useNavigate } from "react-router-dom";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryFilterId = searchParams.get("categoryId");

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [barcodeProduct, setBarcodeProduct] = useState(null);
  const user = JSON.parse(localStorage.getItem("user")) || { name: "Admin User", role: "ADMIN" };
  
  // Form state
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    barcode: "",
    purchase_price: "",
    selling_price: "",
    stock: "",
    min_stock: "5",
    category_id: "",
    newCategoryName: "", // for creating on the fly
    image_url: "",
    imageFile: null
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [productsRes, categoriesRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories`, { headers })
      ]);
      
      setProducts(productsRes.data);
      setCategories(categoriesRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingProductId(null);
    setFormData({
      name: "",
      sku: "",
      barcode: "",
      purchase_price: "",
      selling_price: "",
      stock: "",
      min_stock: "5",
      category_id: "",
      newCategoryName: "",
      image_url: "",
      imageFile: null
    });
    setIsModalOpen(true);
  };

  const handleEdit = (product) => {
    setEditingProductId(product.id);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || "",
      purchase_price: product.purchase_price,
      selling_price: product.selling_price,
      stock: product.stock,
      min_stock: product.min_stock,
      category_id: product.category_id || "",
      newCategoryName: "",
      image_url: product.image_url || "",
      imageFile: null
    });
    setIsModalOpen(true);
  };

  const handleAddProduct = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      let finalCategoryId = formData.category_id;

      // Create new category if user typed one
      if (formData.newCategoryName.trim() !== "") {
        const catRes = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories`, 
          { name: formData.newCategoryName }, 
          { headers }
        );
        finalCategoryId = catRes.data.id;
      }

      if (!finalCategoryId) {
        alert("Please select or create a category.");
        setSubmitting(false);
        return;
      }

      let finalImageUrl = formData.image_url;
      if (formData.imageFile) {
        const uploadData = new FormData();
        uploadData.append("image", formData.imageFile);
        const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/upload`, uploadData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
        finalImageUrl = uploadRes.data.url;
      }

      const payload = {
        name: formData.name,
        sku: formData.sku,
        barcode: formData.barcode,
        category_id: finalCategoryId,
        purchase_price: Number(formData.purchase_price),
        selling_price: Number(formData.selling_price),
        stock: Number(formData.stock),
        min_stock: Number(formData.min_stock),
        description: "",
        image_url: finalImageUrl
      };

      if (editingProductId) {
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products/${editingProductId}`, payload, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products`, payload, { headers });
      }
      
      setIsModalOpen(false);
      setEditingProductId(null);
      setFormData({ name: "", sku: "", barcode: "", purchase_price: "", selling_price: "", stock: "", min_stock: "5", category_id: "", newCategoryName: "", image_url: "", imageFile: null });
      fetchData(); // Refresh list
    } catch (error) {
      console.error("Failed to save product:", error);
      alert("Failed to save product: " + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert(error.response?.data?.error || "Error deleting product");
    }
  };

  const handlePrintBarcode = () => {
    window.print();
  };

  const clearCategoryFilter = () => {
    searchParams.delete("categoryId");
    setSearchParams(searchParams);
  };

  const filteredProducts = products.filter(p => {
    if (categoryFilterId && p.category_id !== categoryFilterId) return false;
    return true; // We can add search text filtering here later if needed
  });

  const activeCategory = categories.find(c => c.id === categoryFilterId);

  return (
    <div className="p-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><Package className="mr-2" /> Products Management</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your inventory, pricing, and stock alerts.</p>
        </div>
        {user.role !== "CASHIER" && (
          <button 
            onClick={handleOpenModal}
            className="btn-gradient px-4 py-2 rounded-xl flex items-center text-sm font-medium"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </button>
        )}
      </div>

      <div className="glass-panel rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50 flex-wrap gap-4">
          <div className="flex items-center gap-4 flex-1">
            <div className="relative w-full max-w-sm">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-zinc-400" />
              </div>
              <input
                type="text"
                placeholder="Search products..."
                className="block w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            {activeCategory && (
              <div className="flex items-center gap-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium border border-blue-200 dark:border-blue-800">
                <span>Category: {activeCategory.name}</span>
                <button onClick={clearCategoryFilter} className="hover:bg-blue-100 dark:hover:bg-blue-900/40 p-0.5 rounded-md transition-colors">
                  <FilterX className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>

        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Product Name</th>
                <th className="px-6 py-4 font-medium">Category</th>
                <th className="px-6 py-4 font-medium">SKU / Barcode</th>
                <th className="px-6 py-4 font-medium">Price</th>
                <th className="px-6 py-4 font-medium">Stock</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-16" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-16 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-12 text-center text-zinc-500 flex flex-col items-center">
                    <Package className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                    No products found. Add your first product to get started!
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <img src={product.image_url || 'https://placehold.co/100x100/e4e4e7/71717a?text=Item'} alt={product.name} className="w-10 h-10 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
                        <span className="font-medium text-zinc-900 dark:text-zinc-100">{product.name}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-zinc-500">{product.category?.name || "Uncategorized"}</td>
                    <td className="px-6 py-4 text-zinc-500">
                      <div>{product.sku}</div>
                      {product.barcode && <div className="text-xs text-zinc-400 mt-0.5">BC: {product.barcode}</div>}
                    </td>
                    <td className="px-6 py-4">₹{product.selling_price.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${product.stock <= product.min_stock ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {product.stock} in stock
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      <button onClick={() => setBarcodeProduct(product)} className="text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-400 transition-colors" title="Print Barcode">
                        <Printer className="w-4 h-4 inline" />
                      </button>
                      {user.role !== "CASHIER" && (
                        <button onClick={() => handleEdit(product)} className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition-colors" title="Edit Product">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                      )}
                      {user.role === "ADMIN" && (
                        <button onClick={() => handleDelete(product.id)} className="text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors" title="Delete Product">
                          <Trash2 className="w-4 h-4 inline" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add/Edit Product Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-bold">{editingProductId ? "Edit Product" : "Add New Product"}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingProductId(null); }} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddProduct} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5">Product Name</label>
                  <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. iPhone 15" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">SKU (Stock Keeping Unit)</label>
                  <input required type="text" value={formData.sku} onChange={e => setFormData({...formData, sku: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="e.g. IPH-15-128" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Barcode (Optional)</label>
                  <input type="text" value={formData.barcode} onChange={e => setFormData({...formData, barcode: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Scan or type barcode" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Category</label>
                  {categories.length > 0 ? (
                    <select value={formData.category_id} onChange={e => setFormData({...formData, category_id: e.target.value, newCategoryName: ""})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="">Select a category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                      <option value="NEW">+ Create New Category</option>
                    </select>
                  ) : (
                    <input type="text" required value={formData.newCategoryName} onChange={e => setFormData({...formData, newCategoryName: e.target.value, category_id: "NEW"})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter new category name" />
                  )}
                  {formData.category_id === "NEW" && categories.length > 0 && (
                    <input type="text" required value={formData.newCategoryName} onChange={e => setFormData({...formData, newCategoryName: e.target.value})} className="w-full mt-3 px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="Enter new category name" />
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium mb-1.5">Initial Stock</label>
                  <input required type="number" min="0" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0" />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1.5">Purchase Price (₹)</label>
                  <input required type="number" step="0.01" min="0" value={formData.purchase_price} onChange={e => setFormData({...formData, purchase_price: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5">Selling Price (₹)</label>
                  <input required type="number" step="0.01" min="0" value={formData.selling_price} onChange={e => setFormData({...formData, selling_price: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="0.00" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5">Product Image</label>
                  <div className="flex items-center gap-4">
                    {formData.image_url || formData.imageFile ? (
                      <img src={formData.imageFile ? URL.createObjectURL(formData.imageFile) : formData.image_url} className="w-16 h-16 rounded-lg object-cover border border-zinc-200 dark:border-zinc-700" />
                    ) : (
                      <div className="w-16 h-16 rounded-lg bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 border border-zinc-200 dark:border-zinc-700">
                        <Package className="w-8 h-8" />
                      </div>
                    )}
                    <input type="file" accept="image/*" onChange={e => setFormData({...formData, imageFile: e.target.files[0]})} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingProductId(null); }} className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-gradient px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50">
                  {submitting ? "Saving..." : (editingProductId ? "Update Product" : "Save Product")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Barcode Modal */}
      {barcodeProduct && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 print:bg-white print:p-0">
          <div className="glass-panel rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl print:shadow-none print:border-none print:w-full print:max-w-none">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800 print:hidden">
              <h3 className="text-lg font-bold">Print Barcode Label</h3>
              <button onClick={() => setBarcodeProduct(null)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center bg-white text-black" id="printable-barcode">
              <div className="text-center mb-2 font-bold text-lg">{barcodeProduct.name}</div>
              <div className="text-center mb-4 font-semibold text-xl border-2 border-black rounded-full px-4 py-1">₹{barcodeProduct.selling_price.toFixed(2)}</div>
              <Barcode 
                value={barcodeProduct.barcode || barcodeProduct.sku} 
                width={2}
                height={60}
                fontSize={14}
                background="#ffffff"
                lineColor="#000000"
                margin={0}
              />
            </div>

            <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 flex justify-end gap-3 print:hidden">
              <button onClick={() => setBarcodeProduct(null)} className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handlePrintBarcode} className="btn-gradient px-6 py-2 rounded-lg text-sm font-medium flex items-center">
                <Printer className="w-4 h-4 mr-2" /> Print Label
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
