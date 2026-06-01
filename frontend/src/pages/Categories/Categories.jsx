import { useState, useEffect } from "react";
import { Plus, Search, Edit2, Trash2, Tags, X, Package } from "lucide-react";
import axios from "axios";
import { Skeleton } from "../../components/ui/Skeleton";
import { useNavigate } from "react-router-dom";

export default function Categories() {
  const navigate = useNavigate();
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [currentCategory, setCurrentCategory] = useState({ id: null, name: "", description: "" });
  const [submitting, setSubmitting] = useState(false);
  const user = JSON.parse(localStorage.getItem("user")) || { name: "Admin User", role: "ADMIN" };

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCategories(res.data);
    } catch (error) {
      console.error("Failed to fetch categories:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    (c.description && c.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const openAddModal = () => {
    setIsEditMode(false);
    setCurrentCategory({ id: null, name: "", description: "" });
    setIsModalOpen(true);
  };

  const openEditModal = (category) => {
    setIsEditMode(true);
    setCurrentCategory(category);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setCurrentCategory({ id: null, name: "", description: "" });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      if (isEditMode) {
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories/${currentCategory.id}`, {
          name: currentCategory.name,
          description: currentCategory.description
        }, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories`, {
          name: currentCategory.name,
          description: currentCategory.description
        }, { headers });
      }
      
      await fetchCategories();
      closeModal();
    } catch (error) {
      console.error("Failed to save category:", error);
      alert("Failed to save category. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (window.confirm(`Are you sure you want to delete the category "${name}"?\nProducts assigned to this category might be affected.`)) {
      try {
        const token = localStorage.getItem("token");
        await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories/${id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetchCategories();
      } catch (error) {
        console.error("Failed to delete category:", error);
        alert("Failed to delete category. It might be in use by products.");
      }
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><Tags className="mr-2" /> Categories</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">Manage product categories to keep your inventory organized.</p>
        </div>
        {user.role !== "CASHIER" && (
          <button 
            onClick={openAddModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" /> Add Category
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search categories..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Category Name</th>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Description</th>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-64" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-8 w-20 ml-auto rounded-lg" /></td>
                  </tr>
                ))
              ) : filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan="3" className="py-12 text-center text-zinc-500">
                    <Tags className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p>No categories found.</p>
                  </td>
                </tr>
              ) : (
                filteredCategories.map(category => (
                  <tr 
                    key={category.id} 
                    className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/products?categoryId=${category.id}`)}
                  >
                    <td className="py-4 px-6">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{category.name}</div>
                    </td>
                    <td className="py-4 px-6">
                      <div className="text-sm text-zinc-500 dark:text-zinc-400">{category.description || "No description provided."}</div>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <button 
                        onClick={(e) => { e.stopPropagation(); navigate(`/products?categoryId=${category.id}`); }}
                        className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
                        title="View Products"
                      >
                        <Package className="w-4 h-4" />
                      </button>
                      {user.role !== "CASHIER" && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); openEditModal(category); }}
                          className="text-zinc-400 hover:text-blue-600 dark:hover:text-blue-400 p-2 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors ml-1"
                          title="Edit Category"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                      )}
                      {user.role === "ADMIN" && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(category.id, category.name); }}
                          className="text-zinc-400 hover:text-red-600 dark:hover:text-red-400 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ml-1"
                          title="Delete Category"
                        >
                          <Trash2 className="w-4 h-4" />
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

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center p-4 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="font-semibold text-lg">{isEditMode ? "Edit Category" : "Add New Category"}</h3>
              <button onClick={closeModal} className="text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-1 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Category Name <span className="text-red-500">*</span></label>
                <input 
                  type="text" 
                  required
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={currentCategory.name}
                  onChange={e => setCurrentCategory({...currentCategory, name: e.target.value})}
                  placeholder="e.g., Electronics"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1.5">Description</label>
                <textarea 
                  rows="3"
                  className="w-full px-3 py-2 bg-white dark:bg-zinc-950 border border-zinc-300 dark:border-zinc-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={currentCategory.description}
                  onChange={e => setCurrentCategory({...currentCategory, description: e.target.value})}
                  placeholder="Optional description for this category..."
                ></textarea>
              </div>

              <div className="pt-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={closeModal}
                  className="px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submitting}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50"
                >
                  {submitting ? "Saving..." : isEditMode ? "Update Category" : "Create Category"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
