import { useState, useEffect } from "react";
import { Link, useNavigate, useLocation, Outlet } from "react-router-dom";
import axios from "axios";
import { 
  LayoutDashboard, 
  Package, 
  Users, 
  FileText, 
  Settings, 
  LogOut,
  Bell,
  Moon,
  Sun,
  ClipboardList,
  Tags,
  ShieldAlert,
  Activity,
  UploadCloud,
  Truck,
  ShoppingCart,
  RefreshCcw,
  CheckSquare,
  Store,
  Building
} from "lucide-react";

export default function Layout() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [branches, setBranches] = useState([]);

  const user = JSON.parse(localStorage.getItem("user")) || { name: "Admin User", role: "ADMIN" };

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
           (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 60000);
    
    if (user?.role === "ADMIN" || user?.role === "MANAGER") {
      fetchBranches();
    }
    
    return () => clearInterval(interval);
  }, []);

  const fetchBranches = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/branches`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBranches(res.data);
    } catch (error) {
      console.error("Failed to fetch branches", error);
    }
  };

  const handleBranchChange = (e) => {
    const newBranchId = e.target.value;
    const updatedUser = { ...user, branch_id: newBranchId === "all" ? null : newBranchId };
    localStorage.setItem("user", JSON.stringify(updatedUser));
    window.location.reload();
  };

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(res.data);
    } catch (error) {
      console.error("Failed to fetch notifications:", error);
    }
  };

  const markAllAsRead = async (e) => {
    e.stopPropagation();
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/notifications/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
    }
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);


  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const menuItems = [
    { name: "Dashboard", icon: LayoutDashboard, path: "/dashboard", allowedRoles: ["ADMIN", "MANAGER"] },
    { name: "Products", icon: Package, path: "/products", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Categories", icon: Tags, path: "/categories", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Inventory Logs", icon: ClipboardList, path: "/inventory", allowedRoles: ["ADMIN", "MANAGER"] },
    { name: "Customers", icon: Users, path: "/customers", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "POS Terminal", icon: ShoppingCart, path: "/pos", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Invoices", icon: FileText, path: "/invoices", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Returns", icon: RefreshCcw, path: "/returns", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Suppliers", icon: Truck, path: "/suppliers", allowedRoles: ["ADMIN", "MANAGER"] },
    { name: "Tasks", icon: CheckSquare, path: "/tasks", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Imports", icon: UploadCloud, path: "/imports", allowedRoles: ["ADMIN", "MANAGER"] },
    { name: "Public Storefront", icon: Store, path: "/store", allowedRoles: ["ADMIN", "MANAGER", "CASHIER"] },
    { name: "Branches", icon: Building, path: "/branches", allowedRoles: ["ADMIN"] },
    { name: "Reports", icon: Activity, path: "/reports", allowedRoles: ["ADMIN", "MANAGER"] },
    { name: "Audit Logs", icon: ShieldAlert, path: "/audit-logs", allowedRoles: ["ADMIN"] },
    { name: "Settings", icon: Settings, path: "/settings", allowedRoles: ["ADMIN"] },
  ];

  const visibleMenuItems = menuItems.filter(item => item.allowedRoles.includes(user.role));

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen flex text-zinc-900 dark:text-zinc-100">
      {/* Sidebar */}
      <aside className={`glass-panel border-r transition-all duration-300 ${isSidebarOpen ? 'w-64' : 'w-20'} flex flex-col z-50`}>
        <div className="h-16 flex items-center justify-center border-b border-zinc-200 dark:border-zinc-800 shrink-0">
          <h1 className={`font-bold text-xl text-blue-600 dark:text-blue-500 ${!isSidebarOpen && 'hidden'}`}>ShopFlow</h1>
          {!isSidebarOpen && <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">S</div>}
        </div>
        
        <nav className="flex-1 overflow-y-auto py-4">
          <ul className="space-y-1 px-3">
            {visibleMenuItems.map((item) => {
              const active = location.pathname.startsWith(item.path);
              return (
                <li key={item.name}>
                  <Link
                    to={item.path}
                    className={`flex items-center px-3 py-2.5 rounded-xl transition-colors ${
                      active 
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 font-medium' 
                        : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100'
                    }`}
                  >
                    <item.icon className={`h-5 w-5 ${active ? 'text-blue-600 dark:text-blue-500' : ''} ${!isSidebarOpen ? 'mx-auto' : 'mr-3'}`} />
                    {isSidebarOpen && <span>{item.name}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 shrink-0">
          <button 
            onClick={handleLogout}
            className={`flex items-center px-3 py-2.5 w-full rounded-xl text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors ${!isSidebarOpen && 'justify-center'}`}
          >
            <LogOut className={`h-5 w-5 ${!isSidebarOpen ? 'mx-0' : 'mr-3'}`} />
            {isSidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col h-screen overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 glass-panel border-b flex items-center justify-between px-6 shrink-0 relative z-40 sticky top-0">
          <button 
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-2 -ml-2 rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 focus:outline-none"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>

          <div className="flex items-center space-x-4 relative">
            {(user?.role === "ADMIN" || user?.role === "MANAGER") && (
              <div className="hidden md:flex items-center mr-2">
                <Building className="w-4 h-4 text-zinc-400 mr-2" />
                <select 
                  className="bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 p-1.5"
                  value={user?.branch_id || "all"}
                  onChange={handleBranchChange}
                >
                  <option value="all">All Branches (Global)</option>
                  {branches.map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
            )}
            
            <button 
              onClick={toggleTheme}
              className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors"
              title="Toggle Dark Mode"
            >
              {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifications(!showNotifications);
                  if (!showNotifications) fetchNotifications();
                }}
                className="p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full relative"
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full"></span>}
              </button>

              {showNotifications && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl shadow-lg overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center">
                      <h3 className="font-semibold text-zinc-900 dark:text-white">Notifications</h3>
                      {unreadCount > 0 && (
                        <button className="text-xs text-blue-600 dark:text-blue-500 hover:underline" onClick={markAllAsRead}>Mark all as read</button>
                      )}
                    </div>
                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="p-8 text-center text-zinc-500 text-sm">No new notifications</div>
                      ) : (
                        notifications.map(notif => (
                          <div key={notif.id} className={`p-4 border-b border-zinc-100 dark:border-zinc-800/50 transition-colors ${!notif.is_read ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50'}`}>
                            <h4 className={`text-sm font-medium ${!notif.is_read ? 'text-zinc-900 dark:text-white' : 'text-zinc-700 dark:text-zinc-300'}`}>{notif.title}</h4>
                            <p className="text-xs text-zinc-500 mt-1">{notif.message}</p>
                            <p className={`text-xs mt-2 ${!notif.is_read ? 'text-blue-600 dark:text-blue-400 font-medium' : 'text-zinc-400'}`}>
                              {new Date(notif.created_at).toLocaleString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="p-3 text-center border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer" onClick={() => setShowNotifications(false)}>
                      <span className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">Close</span>
                    </div>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center space-x-3 pl-4 border-l border-zinc-200 dark:border-zinc-800">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium">{user.name}</p>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">{user.role}</p>
              </div>
              <div className="w-9 h-9 rounded-full bg-blue-100 dark:bg-blue-900/50 flex items-center justify-center text-blue-700 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-800 overflow-hidden">
                {user.profile_image ? (
                  <img src={user.profile_image} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                  user.name?.charAt(0) || "U"
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Page Content */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
