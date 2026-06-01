import { useState, useEffect } from "react";
import { Plus, Search, FileText, Trash2, X, PlusCircle, Download, ScanLine } from "lucide-react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import { Skeleton } from "../../components/ui/Skeleton";
import ReceiptTemplate from "./ReceiptTemplate";
import { useRef } from "react";

export default function Invoices() {
  const [invoices, setInvoices] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const user = JSON.parse(localStorage.getItem("user")) || { name: "Admin User", role: "ADMIN" };
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  
  // View Invoice Modal State
  const [viewInvoice, setViewInvoice] = useState(null);
  const receiptRef = useRef(null);
  
  // Invoice Builder State
  const [customerId, setCustomerId] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [items, setItems] = useState([{ product_id: "", quantity: 1, unit_price: 0, stock: 0 }]);
  const [barcodeInput, setBarcodeInput] = useState("");
  const barcodeInputRef = useRef(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [invRes, custRes, prodRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/customers`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products`, { headers })
      ]);
      
      setInvoices(invRes.data);
      setCustomers(custRes.data);
      setProducts(prodRes.data.filter(p => p.stock > 0)); // Only show products with stock
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = () => {
    setCustomerId("");
    setDiscountAmount(0);
    setItems([{ product_id: "", quantity: 1, unit_price: 0, stock: 0 }]);
    setIsModalOpen(true);
  };

  const handleProductSelect = (index, productId) => {
    const product = products.find(p => p.id === productId);
    const newItems = [...items];
    newItems[index] = {
      ...newItems[index],
      product_id: productId,
      unit_price: product ? product.selling_price : 0,
      stock: product ? product.stock : 0,
      quantity: 1 // reset quantity when product changes
    };
    setItems(newItems);
  };

  const handleQuantityChange = (index, qty) => {
    const newItems = [...items];
    let parsedQty = parseInt(qty) || 0;
    // Don't allow more than stock
    if (parsedQty > newItems[index].stock) {
      parsedQty = newItems[index].stock;
    }
    newItems[index].quantity = parsedQty;
    setItems(newItems);
  };

  const addItem = () => {
    setItems([...items, { product_id: "", quantity: 1, unit_price: 0, stock: 0 }]);
  };

  const removeItem = (index) => {
    if (items.length > 1) {
      setItems(items.filter((_, i) => i !== index));
    }
  };

  const handleBarcodeScan = (e) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    const scannedCode = barcodeInput.trim();
    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);

    if (product) {
      // Check if item is already in list
      const existingItemIndex = items.findIndex(i => i.product_id === product.id);
      
      if (existingItemIndex >= 0) {
        // Increment quantity if under stock limit
        const currentQty = items[existingItemIndex].quantity;
        if (currentQty < product.stock) {
          handleQuantityChange(existingItemIndex, currentQty + 1);
        } else {
          alert(`Not enough stock. Maximum available: ${product.stock}`);
        }
      } else {
        // Add new item to cart. We should replace an empty item if it exists, or push a new one.
        const emptyItemIndex = items.findIndex(i => !i.product_id);
        
        if (emptyItemIndex >= 0) {
          handleProductSelect(emptyItemIndex, product.id);
        } else {
          setItems([...items, { product_id: product.id, quantity: 1, unit_price: product.selling_price, stock: product.stock }]);
        }
      }
    } else {
      alert("Product not found with that Barcode or SKU");
    }
    
    setBarcodeInput("");
    // Keep focus
    setTimeout(() => {
      barcodeInputRef.current?.focus();
    }, 10);
  };

  // Calculations
  const subtotal = items.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const tax = subtotal * 0.18; // 18% GST matches backend
  const total = subtotal + tax - discountAmount;

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validations
    if (!customerId) return alert("Please select a customer.");
    const validItems = items.filter(i => i.product_id && i.quantity > 0);
    if (validItems.length === 0) return alert("Please add at least one valid product.");
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const payload = {
        customer_id: customerId,
        items: validItems,
        discount_amount: parseFloat(discountAmount) || 0
      };
      
      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setIsModalOpen(false);
      fetchData(); // Refresh all data to get new invoice and updated stock
    } catch (error) {
      console.error("Failed to create invoice:", error);
      alert("Failed to create invoice: " + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownloadInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const invoice = res.data;
      
      const htmlContent = `
        <div style="font-family: 'Inter', system-ui, sans-serif; padding: 0; color: #334155; line-height: 1.5; max-width: 800px; margin: 0 auto; background: white;">
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
            * { box-sizing: border-box; }
            .invoice-container { border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; margin: 20px; }
            .header { background: #0f172a; color: white; padding: 24px; display: flex; justify-content: space-between; align-items: center; }
            .header-logo { display: flex; align-items: center; gap: 12px; }
            .header-logo img { width: 40px; height: 40px; border-radius: 8px; }
            .header-logo h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
            .header-info { text-align: right; }
            .header-info h2 { margin: 0; font-size: 24px; font-weight: 800; color: #38bdf8; letter-spacing: 1px; text-transform: uppercase; }
            .header-info p { margin: 4px 0 0; color: #94a3b8; font-size: 13px; font-weight: 500; }
            
            .meta-section { display: flex; justify-content: space-between; padding: 20px 24px; border-bottom: 1px solid #f1f5f9; background: #f8fafc; }
            .meta-block { display: flex; flex-direction: column; gap: 4px; }
            .meta-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
            .meta-value { font-size: 14px; font-weight: 600; color: #0f172a; }
            
            .billing-section { display: flex; gap: 40px; padding: 24px; border-bottom: 1px solid #e2e8f0; }
            .billing-block { flex: 1; }
            .billing-title { font-size: 12px; font-weight: 700; color: #0f172a; text-transform: uppercase; margin-bottom: 8px; border-bottom: 2px solid #38bdf8; padding-bottom: 6px; display: inline-block; }
            .billing-details { font-size: 13px; color: #475569; }
            .billing-details strong { color: #0f172a; font-size: 14px; display: block; margin-bottom: 4px; }
            
            .table-section { padding: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th { padding: 10px 12px; text-align: left; font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; border-bottom: 2px solid #e2e8f0; }
            td { padding: 12px; border-bottom: 1px solid #f1f5f9; font-size: 13px; }
            .item-name { font-weight: 600; color: #0f172a; display: block; }
            .item-sku { font-size: 11px; color: #94a3b8; }
            
            .totals-section { display: flex; justify-content: flex-end; padding: 0 24px 24px; }
            .totals-box { width: 280px; background: #f8fafc; border-radius: 6px; padding: 16px; border: 1px solid #e2e8f0; }
            .total-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; color: #475569; }
            .total-row.discount { color: #10b981; }
            .total-row.grand { margin-top: 8px; padding-top: 12px; border-top: 2px solid #e2e8f0; font-size: 18px; font-weight: 800; color: #0f172a; }
            
            .footer { text-align: center; padding: 20px; background: #0f172a; color: #94a3b8; font-size: 12px; border-bottom-left-radius: 8px; border-bottom-right-radius: 8px; }
            .footer strong { color: white; }
          </style>
          
          <div class="invoice-container">
            <div class="header">
              <div class="header-logo">
                <img src="https://ui-avatars.com/api/?name=ShopFlow&background=38bdf8&color=fff&size=128&bold=true" alt="Logo" />
                <h1>ShopFlow Inc.</h1>
              </div>
              <div class="header-info">
                <h2>INVOICE</h2>
                <p>#${invoice.invoice_number}</p>
              </div>
            </div>
            
            <div class="meta-section">
              <div class="meta-block">
                <span class="meta-label">Date Issued</span>
                <span class="meta-value">${new Date(invoice.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
              </div>
              <div class="meta-block">
                <span class="meta-label">Due Date</span>
                <span class="meta-value">Due on Receipt</span>
              </div>
              <div class="meta-block">
                <span class="meta-label">Amount Due</span>
                <span class="meta-value" style="color: #38bdf8;">₹${invoice.total_amount.toFixed(2)}</span>
              </div>
            </div>
            
            <div class="billing-section">
              <div class="billing-block">
                <div class="billing-title">Billed To</div>
                <div class="billing-details">
                  <strong>${invoice.customer?.name || "Cash Customer"}</strong>
                  ${invoice.customer?.address ? `<div>${invoice.customer.address}</div>` : ""}
                  ${invoice.customer?.email ? `<div>${invoice.customer.email}</div>` : ""}
                  ${invoice.customer?.phone ? `<div>${invoice.customer.phone}</div>` : ""}
                  ${invoice.customer?.gst_number ? `<div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #0f172a;">GSTIN: ${invoice.customer.gst_number}</div>` : ""}
                </div>
              </div>
              
              <div class="billing-block">
                <div class="billing-title">Pay To</div>
                <div class="billing-details">
                  <strong>ShopFlow Headquarters</strong>
                  <div>123 Business Avenue, Suite 100</div>
                  <div>Tech City, TC 400001</div>
                  <div>contact@shopflow.app</div>
                  <div style="margin-top: 8px; font-size: 12px; font-weight: 600; color: #0f172a;">GSTIN: 27AABCU9603R1ZX</div>
                </div>
              </div>
            </div>

            <div class="table-section">
              <table>
                <thead>
                  <tr>
                    <th style="width: 50%;">Description</th>
                    <th style="text-align: center;">Qty</th>
                    <th style="text-align: right;">Price</th>
                    <th style="text-align: right;">Total</th>
                  </tr>
                </thead>
                <tbody>
                  ${invoice.items.map(item => `
                    <tr>
                      <td>
                        <span class="item-name">${item.product?.name || "Unknown Product"}</span>
                        <span class="item-sku">SKU: ${item.product?.sku || "-"}</span>
                      </td>
                      <td style="text-align: center; font-weight: 500;">${item.quantity}</td>
                      <td style="text-align: right;">₹${item.unit_price.toFixed(2)}</td>
                      <td style="text-align: right; font-weight: 600; color: #0f172a;">₹${item.line_total.toFixed(2)}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
            </div>

            <div class="totals-section">
              <div class="totals-box">
                <div class="total-row">
                  <span>Subtotal</span>
                  <span style="font-weight: 600;">₹${invoice.subtotal.toFixed(2)}</span>
                </div>
                ${invoice.discount_amount > 0 ? `
                <div class="total-row discount">
                  <span>Discount</span>
                  <span style="font-weight: 600;">-₹${invoice.discount_amount.toFixed(2)}</span>
                </div>` : ''}
                <div class="total-row">
                  <span>Tax (18% GST)</span>
                  <span style="font-weight: 600;">₹${invoice.tax_amount.toFixed(2)}</span>
                </div>
                <div class="total-row grand">
                  <span>Total Amount</span>
                  <span>₹${invoice.total_amount.toFixed(2)}</span>
                </div>
              </div>
            </div>
            
            <div class="footer">
              <strong>Thank you for your business!</strong><br />
              If you have any questions about this invoice, please contact support@shopflow.app
            </div>
          </div>
        </div>
      `;
  
      const container = document.createElement('div');
      container.innerHTML = htmlContent;
      
      const opt = {
        margin:       0,
        filename:     `Invoice-${invoice.invoice_number}.pdf`,
        image:        { type: 'jpeg', quality: 1 },
        html2canvas:  { scale: 2, windowWidth: 800 },
        jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
      };

      html2pdf().set(opt).from(container).save();
      
    } catch (error) {
      console.error("Failed to download invoice:", error);
      alert("Failed to generate PDF invoice.");
    }
  };

  const handleViewInvoice = async (invoiceId) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setViewInvoice(res.data);
    } catch (error) {
      console.error("Failed to fetch invoice details:", error);
      alert("Failed to load invoice details.");
    }
  };

  const handleDownloadFromView = () => {
    if (!receiptRef.current) return;
    const opt = {
      margin:       0,
      filename:     `Invoice-${viewInvoice.invoice_number}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(receiptRef.current).save();
  };

  const handlePrintFromView = () => {
    if (!receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload(); // Reload to restore React state after printing
  };

  const handleDeleteInvoice = async (invoiceId) => {
    if(!confirm("Are you sure you want to delete this invoice? The stock for these items will be restored. This action cannot be undone.")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices/${invoiceId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchData();
    } catch (error) {
      console.error("Failed to delete invoice:", error);
      alert(error.response?.data?.error || "Error deleting invoice");
    }
  };

  return (
    <div className="p-6 relative">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><FileText className="mr-2" /> Invoices</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your billing and view past invoices.</p>
        </div>
        <button onClick={handleOpenModal} className="btn-gradient px-4 py-2 rounded-xl flex items-center text-sm font-medium">
          <Plus className="w-4 h-4 mr-2" />
          Create Invoice
        </button>
      </div>

      <div className="glass-panel rounded-2xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50/50 dark:bg-zinc-900/50">
          <div className="relative w-full max-w-sm">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search invoices..."
              className="block w-full pl-9 pr-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800 uppercase">
              <tr>
                <th className="px-6 py-4 font-medium">Invoice No</th>
                <th className="px-6 py-4 font-medium">Customer</th>
                <th className="px-6 py-4 font-medium">Date</th>
                <th className="px-6 py-4 font-medium">Total</th>
                <th className="px-6 py-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <tr key={i} className="border-b border-zinc-100 dark:border-zinc-800">
                    <td className="px-6 py-4"><Skeleton className="h-4 w-28" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-32" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-4 w-20" /></td>
                    <td className="px-6 py-4 text-right"><Skeleton className="h-4 w-12 ml-auto" /></td>
                  </tr>
                ))
              ) : invoices.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-12 text-center text-zinc-500 flex flex-col items-center">
                    <FileText className="w-12 h-12 mb-3 text-zinc-300 dark:text-zinc-700" />
                    No invoices found. Create your first invoice!
                  </td>
                </tr>
              ) : (
                invoices.map((invoice) => (
                  <tr key={invoice.id} className="border-b border-zinc-100 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-zinc-900 dark:text-zinc-100">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-zinc-500">{invoice.customer?.name || "Unknown"}</td>
                    <td className="px-6 py-4 text-zinc-500">{new Date(invoice.created_at).toLocaleDateString()}</td>
                    <td className="px-6 py-4 font-medium">₹{invoice.total_amount.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => handleViewInvoice(invoice.id)} className="text-zinc-600 hover:text-zinc-800 dark:hover:text-zinc-400 p-2 hover:bg-zinc-50 dark:hover:bg-zinc-900/20 rounded-lg transition-colors" title="View Document">
                          <FileText className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDownloadInvoice(invoice.id)} className="text-blue-600 hover:text-blue-800 dark:hover:text-blue-400 p-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Download PDF">
                          <Download className="w-4 h-4" />
                        </button>
                        {user.role === "ADMIN" && (
                          <button onClick={() => handleDeleteInvoice(invoice.id)} className="text-red-600 hover:text-red-800 dark:hover:text-red-400 p-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Delete Invoice">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Invoice Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h3 className="text-xl font-bold">Create New Invoice</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6">
              <div className="mb-6">
                <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Select Customer *</label>
                <select required value={customerId} onChange={e => setCustomerId(e.target.value)} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Choose a Customer --</option>
                  {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                </select>
                {customers.length === 0 && <p className="text-xs text-red-500 mt-1">Please add a customer first in the Customers page.</p>}
              </div>

              <div className="mb-6">
                <div className="flex items-center justify-between mb-3 border-b border-zinc-200 dark:border-zinc-800 pb-2">
                  <h4 className="font-semibold">Line Items</h4>
                  <form onSubmit={handleBarcodeScan} className="flex items-center">
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <ScanLine className="h-4 w-4 text-blue-500" />
                      </div>
                      <input
                        ref={barcodeInputRef}
                        type="text"
                        value={barcodeInput}
                        onChange={(e) => setBarcodeInput(e.target.value)}
                        placeholder="Scan barcode or SKU..."
                        className="block w-64 pl-9 pr-3 py-1.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                      />
                    </div>
                    <button type="submit" className="ml-2 bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors">
                      Scan
                    </button>
                  </form>
                </div>
                
                {items.map((item, index) => (
                  <div key={index} className="flex flex-wrap md:flex-nowrap gap-3 items-end mb-3">
                    <div className="w-full md:flex-1">
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Product</label>
                      <select 
                        value={item.product_id} 
                        onChange={(e) => handleProductSelect(index, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">-- Select Product --</option>
                        {products.map(p => (
                          <option key={p.id} value={p.id} disabled={p.stock === 0}>
                            {p.name} (Stock: {p.stock}) - ₹{p.selling_price}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <div className="w-24">
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Qty</label>
                      <input 
                        type="number" 
                        min="1" 
                        max={item.stock || 1}
                        value={item.quantity}
                        onChange={(e) => handleQuantityChange(index, e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="w-28">
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Price (₹)</label>
                      <input 
                        type="text" 
                        disabled
                        value={item.unit_price}
                        className="w-full px-3 py-2 text-sm border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-500 cursor-not-allowed"
                      />
                    </div>
                    
                    <div className="w-28">
                      <label className="block text-xs font-medium mb-1 text-zinc-500">Total (₹)</label>
                      <input 
                        type="text" 
                        disabled
                        value={(item.quantity * item.unit_price).toFixed(2)}
                        className="w-full px-3 py-2 text-sm font-semibold border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-100 dark:bg-zinc-900 text-zinc-700 dark:text-zinc-300 cursor-not-allowed"
                      />
                    </div>
                    
                    <button 
                      type="button" 
                      onClick={() => removeItem(index)}
                      className={`p-2 rounded-lg transition-colors ${items.length > 1 ? 'text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30' : 'text-zinc-300 cursor-not-allowed'}`}
                      disabled={items.length <= 1}
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                <button 
                  type="button" 
                  onClick={addItem}
                  className="text-blue-600 hover:text-blue-700 dark:text-blue-400 text-sm font-medium flex items-center mt-2"
                >
                  <PlusCircle className="w-4 h-4 mr-1" /> Add Another Item
                </button>
              </div>
              
              <div className="flex justify-end border-t border-zinc-200 dark:border-zinc-800 pt-6">
                <div className="w-full md:w-1/2 lg:w-1/3 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Subtotal</span>
                    <span className="font-medium">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm items-center">
                    <span className="text-zinc-500">Discount (₹)</span>
                    <input 
                      type="number"
                      min="0"
                      max={subtotal}
                      value={discountAmount}
                      onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                      className="w-24 px-2 py-1 text-right text-sm border border-zinc-300 dark:border-zinc-700 rounded-md bg-white dark:bg-zinc-950 focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-zinc-500">Tax (18% GST)</span>
                    <span className="font-medium">₹{tax.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold border-t border-zinc-200 dark:border-zinc-800 pt-3">
                    <span>Grand Total</span>
                    <span className="text-blue-600 dark:text-blue-400">₹{total.toFixed(2)}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 p-6 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-950 shrink-0">
              <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-sm font-medium rounded-lg text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 transition-colors">
                Cancel
              </button>
              <button onClick={handleSubmit} disabled={submitting || customers.length === 0} className="btn-gradient px-6 py-2 rounded-lg text-sm font-medium disabled:opacity-50 flex items-center">
                {submitting ? "Processing..." : "Generate Invoice"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* View Invoice Modal */}
      {viewInvoice && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="flex justify-between items-center p-6 border-b border-zinc-200 dark:border-zinc-800 shrink-0">
              <h3 className="text-xl font-bold">Invoice #{viewInvoice.invoice_number}</h3>
              <div className="flex items-center gap-2">
                <button onClick={handlePrintFromView} className="px-3 py-1.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-lg hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors">
                  Print
                </button>
                <button onClick={handleDownloadFromView} className="px-3 py-1.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center">
                  <Download className="w-4 h-4 mr-1" /> PDF
                </button>
                <button onClick={() => setViewInvoice(null)} className="ml-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            
            <div className="overflow-y-auto flex-1 p-6 bg-zinc-100 dark:bg-zinc-950">
              <div className="shadow-lg rounded-xl overflow-hidden">
                <ReceiptTemplate invoice={viewInvoice} printRef={receiptRef} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
