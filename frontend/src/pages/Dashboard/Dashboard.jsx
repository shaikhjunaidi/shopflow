import { useState, useEffect } from "react";
import { 
  Package, 
  Users, 
  TrendingUp,
  CreditCard,
  IndianRupee
} from "lucide-react";
import axios from "axios";
import { Skeleton } from "../../components/ui/Skeleton";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Dashboard() {
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalCustomers: 0,
    salesToday: 0,
    totalProducts: 0,
    recentSales: []
  });
  const [loading, setLoading] = useState(true);
  const [chartData, setChartData] = useState([]);
  const [chartPeriod, setChartPeriod] = useState("week");

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchChartData();
  }, [chartPeriod]);

  const fetchChartData = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reports/chart?period=${chartPeriod}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setChartData(res.data);
    } catch (error) {
      console.error("Failed to fetch chart data:", error);
    }
  };

  const fetchMetrics = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/reports/summary`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMetrics(res.data);
    } catch (error) {
      console.error("Failed to fetch dashboard metrics:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Dashboard Overview</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Welcome back, here's what's happening with your store today.</p>
      </div>

      {/* Stats Cards */}
      {loading ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass-panel hover-lift rounded-2xl p-6 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <Skeleton className="h-4 w-24 mb-2" />
                    <Skeleton className="h-8 w-32" />
                  </div>
                  <Skeleton className="w-11 h-11 rounded-xl" />
                </div>
                <Skeleton className="h-4 w-40 mt-4" />
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel hover-lift rounded-2xl p-6 shadow-sm">
              <Skeleton className="h-6 w-48 mb-4" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
            <div className="glass-panel hover-lift rounded-2xl p-6 shadow-sm">
              <Skeleton className="h-6 w-32 mb-4" />
              <div className="space-y-4">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                    <div className="flex items-center">
                      <Skeleton className="w-10 h-10 rounded-full mr-3" />
                      <div>
                        <Skeleton className="h-4 w-24 mb-1" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
            <StatCard title="Total Revenue" value={`₹${metrics.totalRevenue.toFixed(2)}`} icon={IndianRupee} trend="From all time sales" trendUp={true} />
            <StatCard title="Sales Today" value={`₹${metrics.salesToday.toFixed(2)}`} icon={CreditCard} trend="Since midnight" trendUp={true} />
            <StatCard title="Total Customers" value={metrics.totalCustomers.toString()} icon={Users} trend="Active buyers" trendUp={true} />
            <StatCard title="Total Products" value={metrics.totalProducts.toString()} icon={Package} trend="In inventory" trendUp={true} />
          </div>

          {/* Charts Area */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 glass-panel hover-lift rounded-2xl p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg">Revenue Overview</h3>
                <select 
                  value={chartPeriod}
                  onChange={(e) => setChartPeriod(e.target.value)}
                  className="bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 rounded-lg px-3 py-1.5 text-sm outline-none"
                >
                  <option value="week">This Week</option>
                  <option value="month">This Month</option>
                  <option value="year">This Year</option>
                </select>
              </div>
              <div className="mt-4 w-full" style={{ height: "300px", minWidth: 0 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#3f3f46" opacity={0.2} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#71717a' }} tickFormatter={(value) => `₹${value}`} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px', color: '#f4f4f5' }}
                      itemStyle={{ color: '#60a5fa' }}
                      formatter={(value) => [`₹${value}`, 'Revenue']}
                    />
                    <Area type="monotone" dataKey="revenue" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="glass-panel hover-lift rounded-2xl p-6 shadow-sm flex flex-col">
              <h3 className="font-semibold text-lg mb-4">Recent Sales</h3>
              <div className="space-y-4 flex-1">
                {metrics.recentSales.length === 0 ? (
                  <p className="text-sm text-zinc-500">No recent sales found.</p>
                ) : (
                  metrics.recentSales.map((sale) => (
                    <div key={sale.id} className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800 last:border-0 last:pb-0">
                      <div className="flex items-center">
                        <div className="w-10 h-10 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mr-3">
                          <Users className="w-5 h-5 text-zinc-500" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{sale.customer?.name || "Walk-in Customer"}</p>
                          <p className="text-xs text-zinc-500">{sale.invoice_number}</p>
                        </div>
                      </div>
                      <div className="font-medium text-emerald-600 dark:text-emerald-400">
                        +₹{sale.total_amount.toFixed(2)}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp }) {
  return (
    <div className="glass-panel hover-lift rounded-2xl p-6 shadow-sm">
      <div className="flex justify-between items-start mb-4">
        <div>
          <p className="text-sm font-medium text-zinc-500 dark:text-zinc-400 mb-1">{title}</p>
          <h3 className="text-3xl font-bold tracking-tight">{value}</h3>
        </div>
        <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-xl text-zinc-500 dark:text-zinc-400">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className={`text-sm flex items-center mt-4 ${trendUp ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
        {trend}
      </div>
    </div>
  );
}
