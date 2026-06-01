import { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts";
import { Calendar, Download, TrendingUp, DollarSign, ShoppingBag, Activity } from "lucide-react";
import axios from "axios";
import { Skeleton } from "../../components/ui/Skeleton";

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Date Range State
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  
  const [endDate, setEndDate] = useState(() => {
    return new Date().toISOString().split('T')[0];
  });

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  useEffect(() => {
    fetchReportData();
  }, [startDate, endDate]);

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reports/advanced?startDate=${startDate}&endDate=${endDate}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (error) {
      console.error("Failed to fetch advanced report:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportCSV = () => {
    if (!data || !data.rawInvoices) return;

    // Build CSV content
    const headers = ["Invoice No", "Date", "Customer", "Items Count", "Subtotal", "Tax", "Discount", "Total Amount"];
    const rows = data.rawInvoices.map(inv => [
      inv.invoice_number,
      new Date(inv.created_at).toLocaleDateString(),
      inv.customer?.name || "Walk-in",
      inv.items?.length || 0,
      inv.subtotal.toFixed(2),
      inv.tax_amount.toFixed(2),
      inv.discount_amount.toFixed(2),
      inv.total_amount.toFixed(2)
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.join(","))
    ].join("\n");

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `shopflow_sales_report_${startDate}_to_${endDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><Activity className="mr-2 text-blue-500" /> Advanced Reports</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Analyze your sales, profit margins, and top products.</p>
        </div>
        
        <div className="flex items-center gap-3 glass-panel p-2 rounded-xl shadow-sm">
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 text-zinc-400 mr-2 ml-1" />
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 focus:ring-0"
            />
          </div>
          <span className="text-zinc-300 dark:text-zinc-700">to</span>
          <div className="flex items-center text-sm">
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 focus:ring-0"
            />
          </div>
          <button 
            onClick={handleExportCSV}
            disabled={!data || data.rawInvoices.length === 0}
            className="ml-2 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 p-2 rounded-lg transition-colors disabled:opacity-50 flex items-center"
            title="Export CSV"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
            <Skeleton className="h-32 rounded-2xl" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Skeleton className="h-96 rounded-2xl" />
            <Skeleton className="h-96 rounded-2xl" />
          </div>
        </div>
      ) : data ? (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="glass-panel hover-lift p-6 rounded-2xl shadow-sm flex items-center">
              <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl mr-5">
                <DollarSign className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Revenue</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{data.summary.totalRevenue.toFixed(2)}</h3>
                <p className="text-xs text-zinc-400 mt-1">Gross sales</p>
              </div>
            </div>

            <div className="glass-panel hover-lift p-6 rounded-2xl shadow-sm flex items-center">
              <div className="bg-green-50 dark:bg-green-900/20 p-4 rounded-xl mr-5">
                <TrendingUp className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Net Profit</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">₹{data.summary.netProfit.toFixed(2)}</h3>
                <p className="text-xs text-zinc-400 mt-1">Revenue minus COGS</p>
              </div>
            </div>

            <div className="glass-panel hover-lift p-6 rounded-2xl shadow-sm flex items-center">
              <div className="bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl mr-5">
                <ShoppingBag className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <div>
                <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">Total Orders</p>
                <h3 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">{data.summary.invoiceCount}</h3>
                <p className="text-xs text-zinc-400 mt-1">Invoices created</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top Products Chart */}
            <div className="glass-panel hover-lift p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold mb-6">Top Selling Products</h3>
              {data.topProducts.length > 0 ? (
                <div style={{ height: "300px", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.topProducts} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e4e4e7" opacity={0.5} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="quantity" fill="#3b82f6" radius={[4, 4, 0, 0]} name="Units Sold" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  No sales data found for this period.
                </div>
              )}
            </div>

            {/* Revenue by Category Pie Chart */}
            <div className="glass-panel hover-lift p-6 rounded-2xl shadow-sm">
              <h3 className="text-lg font-bold mb-6">Revenue by Category</h3>
              {data.revenueByCategory.length > 0 ? (
                <div style={{ height: "300px", minWidth: 0 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={data.revenueByCategory}
                        cx="50%"
                        cy="45%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {data.revenueByCategory.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => `₹${value.toFixed(2)}`} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                      <Legend verticalAlign="bottom" height={36} iconType="circle" />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-zinc-400 border-2 border-dashed border-zinc-200 dark:border-zinc-800 rounded-xl">
                  No sales data found for this period.
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
