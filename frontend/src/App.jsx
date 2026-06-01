import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import axios from "axios";
import Login from "./pages/Auth/Login";
import Register from "./pages/Auth/Register";
import Dashboard from "./pages/Dashboard/Dashboard";
import Products from "./pages/Products/Products";
import Categories from "./pages/Categories/Categories";
import Customers from "./pages/Customers/Customers";
import Invoices from "./pages/Invoices/Invoices";
import Suppliers from "./pages/Suppliers/Suppliers";
import AuditLogs from "./pages/AuditLogs/AuditLogs";
import Inventory from "./pages/Inventory/Inventory";
import Settings from "./pages/Settings/Settings";
import Reports from "./pages/Reports/Reports";
import ImportModule from "./pages/Imports/ImportModule";
import ImportPreview from "./pages/Imports/ImportPreview";
import ImportHistory from "./pages/Imports/ImportHistory";
import POS from "./pages/POS/POS";
import Returns from "./pages/Returns/Returns";
import TasksBoard from "./pages/Tasks/TasksBoard";
import Storefront from "./pages/Storefront/Storefront";
import Branches from "./pages/Branches/Branches";
import Layout from "./components/layout/Layout";

// Global axios interceptor for handling expired/invalid tokens
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && (error.response.status === 401 || (error.response.status === 400 && error.response.data?.error === "Invalid token."))) {
      // Clear token and redirect to login
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/store" element={<Storefront />} />
        
        {/* Authenticated Routes with Sidebar/Header Layout */}
        <Route element={<Layout />}>
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/products" element={<Products />} />
          <Route path="/categories" element={<Categories />} />
          <Route path="customers" element={<Customers />} />
          
          <Route path="suppliers" element={<Suppliers />} />

          <Route path="/invoices" element={<Invoices />} />
          <Route path="/returns" element={<Returns />} />
          <Route path="/tasks" element={<TasksBoard />} />
          <Route path="/pos" element={<POS />} />
          <Route path="/inventory" element={<Inventory />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/audit-logs" element={<AuditLogs />} />
          <Route path="/branches" element={<Branches />} />
          <Route path="/reports" element={<Reports />} />
          <Route path="/imports" element={<ImportModule />} />
          <Route path="/imports/preview" element={<ImportPreview />} />
          <Route path="/imports/history" element={<ImportHistory />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
