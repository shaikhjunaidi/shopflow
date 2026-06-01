import { useState, useEffect, useRef } from "react";
import { Search, Plus, Minus, Trash2, CreditCard, ShoppingCart, Printer, X, Download, ScanLine } from "lucide-react";
import axios from "axios";
import html2pdf from "html2pdf.js";
import ReceiptTemplate from "../Invoices/ReceiptTemplate";

export default function POS() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [customers, setCustomers] = useState([]);
  
  const [loading, setLoading] = useState(true);
  
  // Filtering
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  
  // Cart & Checkout
  const [cart, setCart] = useState([]);
  const [customerId, setCustomerId] = useState("");
  const [discountAmount, setDiscountAmount] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  
  // Modals
  const [checkoutInvoice, setCheckoutInvoice] = useState(null);
  const receiptRef = useRef(null);

  // Barcode Scanner Listener
  const [barcodeBuffer, setBarcodeBuffer] = useState("");
  let barcodeTimeout = null;

  useEffect(() => {
    fetchData();
    
    // Global barcode scanner listener
    const handleKeyDown = (e) => {
      // Ignore if typing in an input field
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
      
      // Barcode scanners act as keyboards, typing very fast and ending with Enter
      if (e.key === "Enter") {
        if (barcodeBuffer.length > 2) {
          processBarcode(barcodeBuffer);
        }
        setBarcodeBuffer("");
      } else if (e.key.length === 1) {
        setBarcodeBuffer(prev => prev + e.key);
        // Reset buffer if typing is too slow (human typing vs scanner)
        clearTimeout(barcodeTimeout);
        barcodeTimeout = setTimeout(() => {
          setBarcodeBuffer("");
        }, 100);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      clearTimeout(barcodeTimeout);
    };
  }, [barcodeBuffer]);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };
      
      const [productsRes, catRes, customersRes] = await Promise.all([
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/products`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/categories`, { headers }),
        axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/customers`, { headers })
      ]);
      
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;
      const userBranchId = user?.branch_id;
      
      // Process products to calculate stock based on branch
      const processedProducts = productsRes.data.map(p => {
        let branchStock = p.stock; // Default to global
        if (userBranchId && p.branch_stocks) {
          const bs = p.branch_stocks.find(b => b.branch_id === userBranchId);
          branchStock = bs ? bs.quantity : 0;
        }
        return { ...p, stock: branchStock };
      });

      setProducts(processedProducts.filter(p => p.stock > 0)); // Only sell what's in stock
      setCategories([{ id: "ALL", name: "All Categories" }, ...catRes.data]);
      setCustomers(customersRes.data);
    } catch (error) {
      console.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const processBarcode = (scannedCode) => {
    const product = products.find(p => p.barcode === scannedCode || p.sku === scannedCode);
    if (product) {
      addToCart(product);
    }
  };

  const addToCart = (product) => {
    setCart(prevCart => {
      const existing = prevCart.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) {
          alert(`Cannot add more. Stock limit reached (${product.stock}).`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.product_id === product.id 
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      } else {
        return [...prevCart, { 
          product_id: product.id, 
          product: product, // Store full product object for UI
          quantity: 1, 
          unit_price: product.selling_price 
        }];
      }
    });
  };

  const updateCartQuantity = (productId, newQty) => {
    if (newQty <= 0) {
      removeFromCart(productId);
      return;
    }
    
    const product = products.find(p => p.id === productId);
    if (newQty > product.stock) {
      newQty = product.stock;
    }

    setCart(prev => prev.map(item => 
      item.product_id === productId ? { ...item, quantity: newQty } : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(prev => prev.filter(item => item.product_id !== productId));
  };

  const clearCart = () => {
    if(confirm("Are you sure you want to clear the cart?")) {
      setCart([]);
      setCustomerId("");
      setDiscountAmount(0);
    }
  };

  // Calculations
  const subtotal = cart.reduce((acc, item) => acc + (item.quantity * item.unit_price), 0);
  const tax = subtotal * 0.18; // 18% GST
  const total = subtotal + tax - discountAmount;

  const handleCheckout = async () => {
    if (cart.length === 0) return alert("Cart is empty.");
    if (!customerId) return alert("Please select a customer or add a Walk-in Customer.");
    
    setSubmitting(true);
    
    try {
      const token = localStorage.getItem("token");
      const userStr = localStorage.getItem("user");
      const user = userStr ? JSON.parse(userStr) : null;

      const payload = {
        customer_id: customerId,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        })),
        discount_amount: parseFloat(discountAmount) || 0,
        branch_id: user?.branch_id || null
      };
      
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const newInvoiceId = res.data.invoice?.id || res.data.id || res.data.data?.id; 
      
      if (newInvoiceId) {
        const invRes = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices/${newInvoiceId}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCheckoutInvoice(invRes.data);
      }
      
      // Reset POS state
      setCart([]);
      setCustomerId("");
      setDiscountAmount(0);
      fetchData(); // Refresh stock
      
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Checkout failed: " + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  const handlePrintReceipt = () => {
    if (!receiptRef.current) return;
    const printContent = receiptRef.current.innerHTML;
    const originalContent = document.body.innerHTML;
    
    document.body.innerHTML = printContent;
    window.print();
    document.body.innerHTML = originalContent;
    window.location.reload();
  };

  const handleDownloadReceipt = () => {
    if (!receiptRef.current) return;
    const opt = {
      margin:       0,
      filename:     `Receipt-${checkoutInvoice.invoice_number}.pdf`,
      image:        { type: 'jpeg', quality: 1 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    html2pdf().set(opt).from(receiptRef.current).save();
  };

  // Filtered products for UI
  const filteredProducts = products.filter(p => {
    if (activeCategory !== "ALL" && p.category_id !== activeCategory) return false;
    if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) && !p.sku.toLowerCase().includes(searchQuery.toLowerCase())) return false;
    return true;
  });

  return (
    <div className="flex h-[calc(100vh-4rem)] overflow-hidden bg-zinc-100 dark:bg-zinc-950">
      
      {/* LEFT PANE: Products Grid */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 overflow-hidden">
        
        {/* Header & Search */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold flex items-center"><ShoppingCart className="mr-2" /> Point of Sale</h2>
            <div className="flex items-center text-xs text-zinc-500 bg-zinc-100 dark:bg-zinc-900 px-3 py-1.5 rounded-full">
              <ScanLine className="w-3 h-3 mr-1.5" /> Barcode Scanner Active
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search products by name or SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-9 pr-3 py-2.5 text-sm border border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Categories Horizontal Scroll */}
          <div className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setActiveCategory(cat.id)}
                className={`px-4 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  activeCategory === cat.id 
                    ? "bg-blue-600 text-white shadow-md shadow-blue-500/20" 
                    : "bg-zinc-100 text-zinc-600 hover:bg-zinc-200 dark:bg-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-800"
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
              {[1,2,3,4,5,6,7,8].map(i => <div key={i} className="h-48 bg-zinc-100 dark:bg-zinc-900 animate-pulse rounded-2xl"></div>)}
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400">
              <ShoppingCart className="w-12 h-12 mb-3 opacity-20" />
              <p>No products found.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
              {filteredProducts.map(product => {
                const inCartItem = cart.find(i => i.product_id === product.id);
                const isMaxedOut = inCartItem && inCartItem.quantity >= product.stock;
                
                return (
                  <button
                    key={product.id}
                    disabled={isMaxedOut}
                    onClick={() => addToCart(product)}
                    className={`relative flex flex-col text-left glass-panel rounded-2xl overflow-hidden hover:shadow-lg hover-lift transition-all border ${
                      isMaxedOut 
                        ? 'opacity-50 cursor-not-allowed border-zinc-200 dark:border-zinc-800' 
                        : 'border-zinc-200 dark:border-zinc-800 hover:border-blue-300 dark:hover:border-blue-700/50'
                    }`}
                  >
                    <div className="aspect-square bg-zinc-100 dark:bg-zinc-900 w-full overflow-hidden">
                      <img src={product.image_url || 'https://placehold.co/200x200/e4e4e7/71717a?text=Item'} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                    <div className="p-3">
                      <h4 className="font-semibold text-sm truncate">{product.name}</h4>
                      <p className="text-xs text-zinc-500 mb-1 truncate">{product.sku}</p>
                      <div className="flex justify-between items-center mt-2">
                        <span className="font-bold text-blue-600 dark:text-blue-400">₹{product.selling_price.toFixed(2)}</span>
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-zinc-100 dark:bg-zinc-800 text-zinc-500">
                          {product.stock} left
                        </span>
                      </div>
                    </div>
                    
                    {/* Badge if in cart */}
                    {inCartItem && (
                      <div className="absolute top-2 right-2 bg-blue-600 text-white w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shadow-sm">
                        {inCartItem.quantity}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* RIGHT PANE: Cart & Checkout */}
      <div className="w-full md:w-96 flex flex-col bg-zinc-50 dark:bg-zinc-900/50 border-l border-zinc-200 dark:border-zinc-800">
        
        {/* Cart Header */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-white dark:bg-zinc-950">
          <h3 className="font-bold text-lg">Current Order</h3>
          {cart.length > 0 && (
            <button onClick={clearCart} className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-md transition-colors">
              Clear All
            </button>
          )}
        </div>

        {/* Customer Select */}
        <div className="p-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <select 
            value={customerId} 
            onChange={e => setCustomerId(e.target.value)} 
            className="w-full px-3 py-2.5 text-sm font-medium border border-zinc-300 dark:border-zinc-700 rounded-xl bg-zinc-50 dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none cursor-pointer"
          >
            <option value="">-- Assign Customer --</option>
            {customers.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-zinc-400 space-y-4">
              <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center">
                <ShoppingCart className="w-10 h-10 opacity-50" />
              </div>
              <p className="text-sm font-medium">Cart is empty</p>
              <p className="text-xs text-center px-6">Scan a barcode or click a product on the left to add it.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cart.map(item => (
                <div key={item.product_id} className="flex gap-3 bg-white dark:bg-zinc-950 p-3 rounded-xl border border-zinc-200 dark:border-zinc-800 shadow-sm">
                  <img src={item.product.image_url || 'https://placehold.co/100x100/e4e4e7/71717a?text=Item'} className="w-12 h-12 rounded-lg object-cover border border-zinc-100 dark:border-zinc-800" />
                  
                  <div className="flex-1 min-w-0 flex flex-col justify-between">
                    <div className="flex justify-between items-start mb-1">
                      <h5 className="text-sm font-semibold truncate pr-2">{item.product.name}</h5>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm">₹{(item.unit_price * item.quantity).toFixed(2)}</span>
                        <button 
                          onClick={() => removeFromCart(item.product_id)} 
                          className="text-zinc-400 hover:text-red-500 transition-colors p-1"
                          title="Remove item"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500">₹{item.unit_price.toFixed(2)} each</span>
                      
                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2 bg-zinc-100 dark:bg-zinc-900 rounded-lg p-0.5">
                        <button 
                          onClick={() => updateCartQuantity(item.product_id, item.quantity - 1)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-zinc-800 shadow-sm text-zinc-600 hover:text-red-500 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                        <button 
                          onClick={() => updateCartQuantity(item.product_id, item.quantity + 1)}
                          disabled={item.quantity >= item.product.stock}
                          className="w-6 h-6 flex items-center justify-center rounded bg-white dark:bg-zinc-800 shadow-sm text-zinc-600 hover:text-blue-500 transition-colors disabled:opacity-50 disabled:hover:text-zinc-600"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Totals & Checkout Panel */}
        <div className="bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 p-4 shrink-0 shadow-[0_-4px_6px_-1px_rgb(0,0,0,0.05)] z-10">
          <div className="space-y-2.5 mb-4 text-sm">
            <div className="flex justify-between text-zinc-500">
              <span>Subtotal</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between items-center text-zinc-500">
              <span>Discount</span>
              <div className="flex items-center">
                <span className="mr-1">₹</span>
                <input 
                  type="number"
                  min="0"
                  max={subtotal}
                  value={discountAmount || ""}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-16 px-1 py-0.5 text-right text-sm border-b border-dashed border-zinc-400 bg-transparent focus:outline-none focus:border-blue-500 text-zinc-900 dark:text-zinc-100"
                />
              </div>
            </div>
            <div className="flex justify-between text-zinc-500">
              <span>Tax (18% GST)</span>
              <span className="font-medium text-zinc-900 dark:text-zinc-100">₹{tax.toFixed(2)}</span>
            </div>
            
            <div className="pt-2 border-t border-zinc-200 dark:border-zinc-800 flex justify-between items-end">
              <span className="font-semibold">Total</span>
              <span className="text-3xl font-black text-blue-600 dark:text-blue-400">₹{total.toFixed(2)}</span>
            </div>
          </div>
          
          <button 
            onClick={handleCheckout}
            disabled={cart.length === 0 || submitting}
            className="w-full btn-gradient py-4 rounded-xl font-bold text-lg shadow-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
          >
            <CreditCard className="w-5 h-5" />
            {submitting ? "Processing..." : "Complete Sale"}
          </button>
        </div>
      </div>

      {/* Success / Print Receipt Modal */}
      {checkoutInvoice && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-zinc-100 dark:bg-zinc-950 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[95vh] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            
            <div className="bg-green-500 text-white p-6 text-center shrink-0">
              <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold mb-1">Sale Complete!</h2>
              <p className="text-green-100 font-medium">Invoice #{checkoutInvoice.invoice_number}</p>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1">
              {/* Hidden receipt container just for html2pdf/printing, or show a preview */}
              <div className="scale-90 origin-top bg-white shadow-sm border border-zinc-200 p-2 rounded-lg">
                <ReceiptTemplate invoice={checkoutInvoice} printRef={receiptRef} />
              </div>
            </div>
            
            <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-between gap-3 shrink-0">
              <button 
                onClick={() => setCheckoutInvoice(null)} 
                className="flex-1 py-3 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 font-bold rounded-xl transition-colors"
              >
                New Sale
              </button>
              <button 
                onClick={handlePrintReceipt} 
                className="flex-1 py-3 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-700 dark:text-blue-400 font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <Printer className="w-5 h-5" /> Print
              </button>
              <button 
                onClick={handleDownloadReceipt} 
                className="flex-1 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2"
              >
                <Download className="w-5 h-5" /> Save PDF
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
