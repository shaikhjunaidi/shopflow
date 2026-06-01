import { useState, useEffect } from "react";
import { RefreshCcw, Search, Plus, X, Package, CheckCircle2, FileText, IndianRupee } from "lucide-react";
import axios from "axios";

export default function Returns() {
  const [returns, setReturns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);

  // Modal state
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [searching, setSearching] = useState(false);
  const [invoiceData, setInvoiceData] = useState(null);
  const [searchError, setSearchError] = useState("");
  
  // Return form state
  const [returnItems, setReturnItems] = useState({}); // { [productId]: { quantity, restock } }
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchReturns();
  }, []);

  const fetchReturns = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/returns`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setReturns(res.data);
    } catch (error) {
      console.error("Failed to fetch returns:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchInvoice = async (e) => {
    e.preventDefault();
    if (!invoiceNumber.trim()) return;
    
    setSearching(true);
    setSearchError("");
    setInvoiceData(null);
    setReturnItems({});
    
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/invoices/number/${invoiceNumber.trim()}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setInvoiceData(res.data);
      
      // Initialize returnItems with 0 quantity and restock=true
      const initialItems = {};
      res.data.items.forEach(item => {
        initialItems[item.product_id] = { 
          quantity: 0, 
          maxQuantity: item.quantity,
          unitPrice: item.unit_price,
          restock: true 
        };
      });
      setReturnItems(initialItems);
      
    } catch (error) {
      setSearchError(error.response?.data?.error || "Invoice not found");
    } finally {
      setSearching(false);
    }
  };

  const handleItemChange = (productId, field, value) => {
    setReturnItems(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [field]: value
      }
    }));
  };

  const calculateTotalRefund = () => {
    let total = 0;
    Object.values(returnItems).forEach(item => {
      // Basic refund calculation. Ideally involves tax prorating, but we'll do raw line total equivalent.
      // (item qty * unit price) + 18% tax (since our invoices assume 18% tax)
      const baseRefund = item.quantity * item.unitPrice;
      const taxRefund = baseRefund * 0.18;
      total += baseRefund + taxRefund;
    });
    
    // Pro-rate discount if applicable? For simplicity, we won't deduct original discount unless it exceeds remaining amount
    return total;
  };

  const totalRefundAmount = calculateTotalRefund();
  const hasItemsToReturn = Object.values(returnItems).some(item => item.quantity > 0);

  const handleSubmitReturn = async () => {
    if (!hasItemsToReturn) return alert("Please select at least one item to return.");
    
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      
      const itemsPayload = Object.entries(returnItems)
        .filter(([_, data]) => data.quantity > 0)
        .map(([productId, data]) => ({
          product_id: productId,
          quantity: data.quantity,
          refund_amount: (data.quantity * data.unitPrice) * 1.18, // Incl 18% tax
          restock: data.restock
        }));

      await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/returns`, {
        invoice_id: invoiceData.id,
        reason,
        items: itemsPayload
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setShowModal(false);
      setInvoiceNumber("");
      setInvoiceData(null);
      setReason("");
      fetchReturns();
      alert("Return processed successfully!");
    } catch (error) {
      console.error("Failed to process return:", error);
      alert("Failed to process return. " + (error.response?.data?.error || error.message));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
        <div>
          <h2 className="text-2xl font-bold flex items-center"><RefreshCcw className="mr-2 text-blue-500" /> Returns & Refunds</h2>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage customer returns and inventory restocking.</p>
        </div>
        
        <button 
          onClick={() => {
            setShowModal(true);
            setInvoiceData(null);
            setInvoiceNumber("");
          }}
          className="btn-primary flex items-center shadow-lg shadow-blue-500/20 hover-lift"
        >
          <Plus className="w-5 h-5 mr-2" /> Process Return
        </button>
      </div>

      {/* Dashboard Table */}
      <div className="glass-panel rounded-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-zinc-50 dark:bg-zinc-900/50 border-b border-zinc-200 dark:border-zinc-800">
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300">Date</th>
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300">Return #</th>
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300">Invoice #</th>
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300">Customer</th>
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300">Items Returned</th>
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300 text-right">Refund Amount</th>
                <th className="p-4 font-semibold text-zinc-600 dark:text-zinc-300 text-center">Status</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="p-8 text-center text-zinc-500">Loading returns...</td>
                </tr>
              ) : returns.length === 0 ? (
                <tr>
                  <td colSpan="7" className="p-12 text-center text-zinc-500">
                    <RefreshCcw className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p>No returns processed yet.</p>
                  </td>
                </tr>
              ) : (
                returns.map(ret => {
                  const totalItems = ret.items?.reduce((acc, item) => acc + item.quantity, 0) || 0;
                  return (
                    <tr key={ret.id} className="border-b border-zinc-100 dark:border-zinc-800/50 hover:bg-zinc-50 dark:hover:bg-zinc-900/50 transition-colors">
                      <td className="p-4 text-sm whitespace-nowrap">{new Date(ret.created_at).toLocaleDateString()}</td>
                      <td className="p-4 font-medium text-blue-600 dark:text-blue-400">{ret.return_number}</td>
                      <td className="p-4 text-sm">{ret.invoice?.invoice_number || 'Unknown'}</td>
                      <td className="p-4 text-sm">{ret.invoice?.customer?.name || 'Walk-in'}</td>
                      <td className="p-4 text-sm">{totalItems} items</td>
                      <td className="p-4 text-sm text-right font-bold text-red-600 dark:text-red-400">₹{ret.total_refunded.toFixed(2)}</td>
                      <td className="p-4 text-center">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200 dark:border-green-800">
                          {ret.status}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Return Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white dark:bg-zinc-950 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] border border-zinc-200 dark:border-zinc-800 overflow-hidden">
            
            <div className="p-5 border-b border-zinc-200 dark:border-zinc-800 flex justify-between items-center bg-zinc-50 dark:bg-zinc-900/50 shrink-0">
              <h3 className="font-bold text-xl flex items-center"><RefreshCcw className="w-5 h-5 mr-2" /> Process New Return</h3>
              <button onClick={() => setShowModal(false)} className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 p-2 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto custom-scrollbar flex-1 space-y-6">
              
              {/* Step 1: Search Invoice */}
              <div className="bg-zinc-50 dark:bg-zinc-900 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800">
                <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Search Original Invoice</label>
                <form onSubmit={handleSearchInvoice} className="flex gap-3">
                  <div className="relative flex-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-zinc-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. INV-17182928374"
                      value={invoiceNumber}
                      onChange={(e) => setInvoiceNumber(e.target.value)}
                      className="block w-full pl-10 pr-3 py-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={searching || !invoiceNumber}
                    className="px-6 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200 rounded-xl font-medium transition-colors disabled:opacity-50"
                  >
                    {searching ? "Searching..." : "Find Invoice"}
                  </button>
                </form>
                {searchError && <p className="text-red-500 text-sm mt-2">{searchError}</p>}
              </div>

              {/* Step 2: Select Items */}
              {invoiceData && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
                  <div className="flex justify-between items-end border-b border-zinc-200 dark:border-zinc-800 pb-2">
                    <div>
                      <h4 className="font-bold text-lg">Select Items to Return</h4>
                      <p className="text-sm text-zinc-500">Invoice {invoiceData.invoice_number} • {new Date(invoiceData.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {invoiceData.items.map(item => {
                      const returnState = returnItems[item.product_id];
                      if (!returnState) return null;
                      
                      const isReturning = returnState.quantity > 0;
                      
                      return (
                        <div key={item.id} className={`p-4 rounded-xl border transition-colors ${isReturning ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/10' : 'border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950'}`}>
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex items-center flex-1">
                              <div className="w-10 h-10 rounded-lg bg-zinc-100 dark:bg-zinc-900 flex items-center justify-center mr-3 shrink-0">
                                <Package className="w-5 h-5 text-zinc-500" />
                              </div>
                              <div>
                                <p className="font-semibold text-sm">{item.product?.name || 'Unknown'}</p>
                                <p className="text-xs text-zinc-500">Purchased: {item.quantity} • ₹{item.unit_price.toFixed(2)} /ea</p>
                              </div>
                            </div>
                            
                            <div className="flex items-center gap-6">
                              {/* Restock Toggle (only show if they are returning it) */}
                              <div className={`flex flex-col gap-1 transition-opacity ${isReturning ? 'opacity-100' : 'opacity-30 pointer-events-none'}`}>
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Condition</label>
                                <div className="flex items-center gap-1 bg-zinc-100 dark:bg-zinc-900 p-1 rounded-lg">
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(item.product_id, 'restock', true)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${returnState.restock ? 'bg-white dark:bg-zinc-800 shadow-sm text-zinc-900 dark:text-white' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                  >
                                    Restock
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleItemChange(item.product_id, 'restock', false)}
                                    className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${!returnState.restock ? 'bg-white dark:bg-zinc-800 shadow-sm text-red-600 dark:text-red-400' : 'text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300'}`}
                                  >
                                    Damaged
                                  </button>
                                </div>
                              </div>
                              
                              {/* Return Quantity */}
                              <div className="flex flex-col gap-1">
                                <label className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Return Qty</label>
                                <input
                                  type="number"
                                  min="0"
                                  max={item.quantity}
                                  value={returnState.quantity === 0 ? "" : returnState.quantity}
                                  onChange={(e) => {
                                    let val = parseInt(e.target.value) || 0;
                                    if (val > item.quantity) val = item.quantity;
                                    handleItemChange(item.product_id, 'quantity', val);
                                  }}
                                  placeholder="0"
                                  className="w-20 px-3 py-1.5 border border-zinc-300 dark:border-zinc-700 rounded-lg text-center font-medium bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  
                  {/* Return Reason */}
                  <div className="pt-2">
                    <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">Reason for Return (Optional)</label>
                    <textarea 
                      rows="2"
                      value={reason}
                      onChange={e => setReason(e.target.value)}
                      placeholder="e.g. Customer changed their mind, defective product..."
                      className="w-full p-3 border border-zinc-300 dark:border-zinc-700 rounded-xl bg-white dark:bg-zinc-900 focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    ></textarea>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            {invoiceData && (
              <div className="p-5 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex justify-between items-center shrink-0">
                <div>
                  <p className="text-sm text-zinc-500 font-medium">Estimated Refund</p>
                  <p className="text-2xl font-black text-blue-600 dark:text-blue-400">₹{totalRefundAmount.toFixed(2)}</p>
                  <p className="text-xs text-zinc-400">Includes 18% GST refund</p>
                </div>
                
                <button
                  onClick={handleSubmitReturn}
                  disabled={submitting || !hasItemsToReturn}
                  className="btn-primary flex items-center px-8 py-3 text-lg font-bold shadow-lg shadow-blue-500/30 disabled:opacity-50 disabled:cursor-not-allowed hover-lift"
                >
                  {submitting ? "Processing..." : "Issue Refund"}
                </button>
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
}
