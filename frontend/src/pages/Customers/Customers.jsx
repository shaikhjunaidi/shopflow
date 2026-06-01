import { useState, useEffect } from "react";
import { Plus, Search, Edit, Trash2, Users, X, Phone, Mail, MapPin, FileText } from "lucide-react";
import axios from "axios";
import { Skeleton } from "../../components/ui/Skeleton";

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editingCustomerId, setEditingCustomerId] = useState(null);
  const user = JSON.parse(localStorage.getItem("user")) || { name: "Admin User", role: "ADMIN" };

  const [formData, setFormData] = useState({
    name: "",
    countryCode: "+91",
    phone: "",
    email: "",
    address: "",
    gst_number: "",
    notes: ""
  });

  useEffect(() => {
    fetchCustomers();
  }, []);

  const fetchCustomers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/customers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCustomers(res.data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setEditingCustomerId(null);
    setFormData({
      name: "",
      countryCode: "+91",
      phone: "",
      email: "",
      address: "",
      gst_number: "",
      notes: ""
    });
    setIsModalOpen(true);
  };

  const handleEdit = (customer) => {
    setEditingCustomerId(customer.id);
    
    // Naive split to separate country code and phone if stored together
    let extractedCode = "+91";
    let extractedPhone = customer.phone || "";
    if (extractedPhone.startsWith("+")) {
      const parts = extractedPhone.split(" ");
      if (parts.length > 1) {
        extractedCode = parts[0];
        extractedPhone = parts.slice(1).join("").replace(/\D/g, '');
      } else {
        // Just extract the last 10 digits as phone, rest as code
        const digits = extractedPhone.replace(/\D/g, '');
        if (digits.length > 10) {
          extractedPhone = digits.slice(-10);
          // the code is whatever is before those 10 digits
          extractedCode = customer.phone.slice(0, customer.phone.indexOf(extractedPhone)).trim();
        } else {
          extractedPhone = digits;
        }
      }
    }

    setFormData({
      name: customer.name,
      countryCode: extractedCode,
      phone: extractedPhone,
      email: customer.email || "",
      address: customer.address || "",
      gst_number: customer.gst_number || "",
      notes: customer.notes || ""
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const payload = {
        ...formData,
        phone: `${formData.countryCode} ${formData.phone}` // Combine for backend
      };
      
      if (editingCustomerId) {
        await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/customers/${editingCustomerId}`, payload, { headers });
      } else {
        await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/customers`, payload, { headers });
      }
      
      setIsModalOpen(false);
      setEditingCustomerId(null);
      fetchCustomers();
    } catch (error) {
      console.error("Failed to save customer:", error);
      alert("Failed to save customer: " + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id) => {
    if(!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/customers/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchCustomers();
    } catch (error) {
      console.error("Failed to delete:", error);
      alert(error.response?.data?.error || "Error deleting customer");
    }
  };

  return (
    <div className="p-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><Users className="mr-2" /> Customers Management</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your customer database and view their history.</p>
        </div>
        {user.role !== "CASHIER" && (
          <button 
            onClick={handleOpenModal}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl flex items-center text-sm font-medium transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4 mr-2" />
            Add Customer
          </button>
        )}
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search customers..."
              className="block w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Customer Name</th>
                <th className="px-6 py-4 font-medium">Phone</th>
                <th className="px-6 py-4 font-medium">Email</th>
                <th className="px-6 py-4 font-medium">Invoices</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-6 w-20 rounded-full" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 flex flex-col items-center">
                    <Users className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                    No customers found. Add your first customer!
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{customer.name}</td>
                    <td className="px-6 py-4 text-zinc-500">{customer.phone}</td>
                    <td className="px-6 py-4 text-zinc-500">{customer.email || "-"}</td>
                    <td className="px-6 py-4">
                      <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                        {customer._count?.invoices || 0} Orders
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-3">
                      {user.role !== "CASHIER" && (
                        <button onClick={() => handleEdit(customer)} className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 transition-colors">
                          <Edit className="w-4 h-4 inline" />
                        </button>
                      )}
                      {user.role === "ADMIN" && (
                        <button onClick={() => handleDelete(customer.id)} className="text-red-600 hover:text-red-800 dark:hover:text-red-400 transition-colors">
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

      {/* Add/Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800">
              <h3 className="text-xl font-bold">{editingCustomerId ? "Edit Customer" : "Add New Customer"}</h3>
              <button onClick={() => { setIsModalOpen(false); setEditingCustomerId(null); }} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Customer Name *</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Users className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input required type="text" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="John Doe" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Phone Number *</label>
                  <div className="flex relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none z-10">
                      <Phone className="h-4 w-4 text-zinc-400" />
                    </div>
                    <select
                      value={formData.countryCode}
                      onChange={e => setFormData({...formData, countryCode: e.target.value})}
                      className="pl-9 pr-2 py-2 border border-zinc-300 border-r-0 dark:border-zinc-700 rounded-l-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    >
                      <option value="+91">+91 (IN)</option>
                      <option value="+1">+1 (US)</option>
                      <option value="+44">+44 (UK)</option>
                      <option value="+971">+971 (AE)</option>
                    </select>
                    <input 
                      required 
                      type="text" 
                      pattern="\d{10}"
                      maxLength="10"
                      title="Please enter exactly 10 digits"
                      value={formData.phone} 
                      onChange={e => {
                        const val = e.target.value.replace(/\D/g, ''); // only allow digits
                        setFormData({...formData, phone: val});
                      }} 
                      className="w-full pl-3 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-r-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" 
                      placeholder="9876543210" 
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input type="email" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder="john@example.com" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">GST Number</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <FileText className="h-4 w-4 text-zinc-400" />
                    </div>
                    <input 
                      type="text" 
                      pattern="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$"
                      title="Must be a valid 15-character GSTIN (e.g. 22AAAAA0000A1Z5)"
                      value={formData.gst_number} 
                      onChange={e => setFormData({...formData, gst_number: e.target.value.toUpperCase()})} 
                      className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 uppercase" 
                      placeholder="22AAAAA0000A1Z5" 
                    />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Billing Address</label>
                  <div className="relative">
                    <div className="absolute top-3 left-3 pointer-events-none">
                      <MapPin className="h-4 w-4 text-zinc-400" />
                    </div>
                    <textarea value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full pl-9 pr-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]" placeholder="Full physical address"></textarea>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-6 border-t border-zinc-200 dark:border-zinc-800">
                <button type="button" onClick={() => { setIsModalOpen(false); setEditingCustomerId(null); }} className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                  {submitting ? "Saving..." : (editingCustomerId ? "Update Customer" : "Save Customer")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
