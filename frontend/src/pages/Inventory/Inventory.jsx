import { useState, useEffect } from "react";
import { Search, ArrowUpRight, ArrowDownRight, RefreshCw, ClipboardList } from "lucide-react";
import axios from "axios";
import { Skeleton } from "../../components/ui/Skeleton";

export default function Inventory() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("ALL");

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/inventory`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setLogs(res.data);
    } catch (error) {
      console.error("Failed to fetch inventory logs:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const matchesSearch = log.product.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          log.product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterType === "ALL" || log.action_type === filterType;
    return matchesSearch && matchesFilter;
  });

  const getActionBadge = (action_type) => {
    switch(action_type) {
      case "STOCK_IN":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-500/30"><ArrowDownRight className="w-3 h-3 mr-1" /> Stock In</span>;
      case "STOCK_OUT":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-red-100 text-red-800 dark:bg-red-500/20 dark:text-red-400 border border-red-200 dark:border-red-500/30"><ArrowUpRight className="w-3 h-3 mr-1" /> Stock Out</span>;
      case "ADJUSTMENT":
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-400 border border-amber-200 dark:border-amber-500/30"><RefreshCw className="w-3 h-3 mr-1" /> Adjustment</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-medium bg-zinc-100 text-zinc-800 dark:bg-zinc-500/20 dark:text-zinc-400">{action_type}</span>;
    }
  };

  return (
    <div className="p-6 h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><ClipboardList className="mr-2" /> Inventory Logs</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1 text-sm">View a complete history of stock movements across all products.</p>
        </div>
      </div>

      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm flex flex-col flex-1 overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between gap-4 bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400" />
            <input
              type="text"
              placeholder="Search product or SKU..."
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 transition-shadow text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select 
            className="w-full sm:w-48 px-4 py-2 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
          >
            <option value="ALL">All Actions</option>
            <option value="STOCK_IN">Stock In</option>
            <option value="STOCK_OUT">Stock Out</option>
            <option value="ADJUSTMENT">Adjustments</option>
          </select>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-zinc-50 dark:bg-zinc-900 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Date & Time</th>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Product</th>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800">Action</th>
                <th className="py-3 px-6 text-xs font-semibold text-zinc-500 uppercase tracking-wider border-b border-zinc-200 dark:border-zinc-800 text-right">Qty Change</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-32" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-48" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-6 w-24 rounded-md" /></td>
                    <td className="py-4 px-6"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-12 text-center text-zinc-500">
                    <ClipboardList className="mx-auto h-12 w-12 text-zinc-300 dark:text-zinc-700 mb-3" />
                    <p>No inventory logs found.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map(log => (
                  <tr key={log.id} className="hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="py-3 px-6 whitespace-nowrap">
                      <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                        {new Date(log.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-zinc-500">
                        {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      <div className="flex items-center">
                        <div className="h-10 w-10 shrink-0 mr-3 bg-zinc-100 dark:bg-zinc-800 rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-700">
                          {log.product.image_url ? (
                            <img src={log.product.image_url} alt={log.product.name} className="h-full w-full object-cover" />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center text-zinc-400 text-xs">No img</div>
                          )}
                        </div>
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{log.product.name}</div>
                          <div className="text-xs text-zinc-500">SKU: {log.product.sku}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-6">
                      {getActionBadge(log.action_type)}
                    </td>
                    <td className="py-3 px-6 text-right whitespace-nowrap">
                      <span className={`text-sm font-bold ${log.action_type === 'STOCK_IN' ? 'text-emerald-600 dark:text-emerald-400' : log.action_type === 'STOCK_OUT' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`}>
                        {log.action_type === 'STOCK_IN' || log.action_type === 'ADJUSTMENT' && log.quantity > 0 ? '+' : ''}{log.quantity}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
