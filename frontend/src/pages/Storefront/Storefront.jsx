import { useState, useEffect } from "react";
import { ShoppingBag, Search, X, Plus, Minus, ArrowRight, CheckCircle2, ShoppingCart, Sparkles, ChevronRight, MapPin } from "lucide-react";
import axios from "axios";

export default function Storefront() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  
  const [cart, setCart] = useState([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/storefront/products`);
      setProducts(res.data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product_id === product.id);
      if (existing) {
        if (existing.quantity >= product.stock) return prev;
        return prev.map(item => item.product_id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product_id: product.id, product, quantity: 1, unit_price: product.selling_price }];
    });
    setIsCartOpen(true);
  };

  const updateQuantity = (productId, delta) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product_id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          if (newQty > item.product.stock) return item;
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const taxAmount = cartTotal * 0.18; // 18% GST
  const finalTotal = cartTotal + taxAmount;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cart.length === 0) return;
    if (!name.trim() || !phone.trim()) return alert("Please enter your name and phone number");

    setSubmitting(true);
    try {
      const res = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/storefront/orders`, {
        name,
        phone,
        items: cart.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          unit_price: item.unit_price
        }))
      });
      
      setOrderSuccess(res.data.invoice_number);
      setCart([]);
      setName("");
      setPhone("");
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Failed to place order. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const categories = ["All", ...new Set(products.map(p => p.category?.name || "Uncategorized"))];
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === "All" || (p.category?.name || "Uncategorized") === category;
    return matchesSearch && matchesCategory;
  });

  if (orderSuccess) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center p-6 relative overflow-hidden">
        {/* Animated Background Gradients */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/30 rounded-full blur-[120px] animate-pulse"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] bg-blue-600/30 rounded-full blur-[120px] animate-pulse delay-1000"></div>
        
        <div className="relative z-10 bg-white/10 backdrop-blur-3xl max-w-md w-full p-10 rounded-[2.5rem] shadow-2xl border border-white/20 text-center animate-in zoom-in duration-500">
          <div className="w-24 h-24 bg-gradient-to-tr from-emerald-400 to-emerald-600 text-white rounded-full flex items-center justify-center mx-auto mb-8 shadow-[0_0_40px_rgba(52,211,153,0.5)]">
            <CheckCircle2 className="w-12 h-12" />
          </div>
          <h2 className="text-4xl font-black mb-3 bg-clip-text text-transparent bg-gradient-to-r from-white to-zinc-400">Order Confirmed!</h2>
          <p className="text-zinc-300 mb-8 text-lg">Your items are being reserved. Show this code when you arrive.</p>
          
          <div className="bg-black/40 backdrop-blur-xl p-6 rounded-3xl mb-10 border border-white/10 shadow-inner">
            <p className="text-xs text-emerald-400 uppercase tracking-[0.2em] font-bold mb-2 flex items-center justify-center"><MapPin className="w-3 h-3 mr-1"/> Pickup Code</p>
            <p className="text-3xl font-mono font-black text-white tracking-wider">{orderSuccess}</p>
          </div>
          
          <button 
            onClick={() => setOrderSuccess(null)}
            className="w-full bg-white text-black py-4 rounded-2xl text-lg font-bold hover:scale-105 active:scale-95 transition-all shadow-[0_0_30px_rgba(255,255,255,0.3)] hover:shadow-[0_0_50px_rgba(255,255,255,0.5)]"
          >
            Return to Store
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-blue-500/30 overflow-x-hidden">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] bg-blue-600/10 rounded-full blur-[120px]"></div>
        <div className="absolute bottom-[-10%] right-[-10%] w-[30vw] h-[30vw] bg-purple-600/10 rounded-full blur-[120px]"></div>
      </div>

      {/* Modern Glass Navbar */}
      <nav className="fixed top-0 inset-x-0 z-40 px-4 py-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex justify-between items-center bg-white/5 backdrop-blur-2xl border border-white/10 rounded-3xl px-6 py-4 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/20">
              <ShoppingBag className="w-6 h-6 text-white" />
            </div>
            <span className="text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ShopFlow
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-bold tracking-widest uppercase border border-white/10">
                Store
              </span>
            </span>
          </div>

          <button 
            onClick={() => setIsCartOpen(true)}
            className="relative group p-3 bg-white/5 hover:bg-white/10 rounded-full border border-white/10 transition-all duration-300 hover:scale-105"
          >
            <ShoppingCart className="w-6 h-6 text-zinc-300 group-hover:text-white" />
            {cart.length > 0 && (
              <span className="absolute -top-1 -right-1 w-6 h-6 bg-gradient-to-tr from-blue-500 to-blue-600 text-white text-[11px] font-bold flex items-center justify-center rounded-full shadow-[0_0_15px_rgba(59,130,246,0.5)] border-2 border-[#121212] animate-bounce-short">
                {cart.reduce((sum, item) => sum + item.quantity, 0)}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Premium Hero Section */}
      <div className="relative z-10 pt-48 pb-20 px-6 max-w-7xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-zinc-300 mb-8 backdrop-blur-md">
          <Sparkles className="w-4 h-4 text-blue-400" />
          <span>Lightning fast pickup available now</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-black mb-6 leading-tight tracking-tighter">
          Skip the line. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400">
            Order ahead.
          </span>
        </h1>
        <p className="text-zinc-400 text-lg md:text-xl max-w-2xl mx-auto font-medium">
          Browse our live inventory, reserve your items instantly, and pick them up in-store without the wait.
        </p>
      </div>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Futuristic Search & Filter */}
        <div className="flex flex-col md:flex-row gap-6 mb-16 items-center justify-between bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-xl">
          <div className="relative w-full md:w-[400px]">
            <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none">
              <Search className="h-5 w-5 text-zinc-400" />
            </div>
            <input
              type="text"
              placeholder="Search our catalog..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-13 pr-5 py-4 bg-black/40 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-inner text-white placeholder-zinc-500 transition-all"
            />
          </div>

          <div className="flex gap-3 overflow-x-auto pb-2 w-full md:w-auto custom-scrollbar px-2">
            {categories.map(c => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`px-6 py-3 rounded-2xl text-sm font-bold whitespace-nowrap transition-all duration-300 ${
                  category === c 
                    ? "bg-white text-black shadow-[0_0_20px_rgba(255,255,255,0.3)] scale-105" 
                    : "bg-black/40 text-zinc-400 border border-white/10 hover:bg-white/10 hover:text-white"
                }`}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Premium Product Grid */}
        {loading ? (
          <div className="flex justify-center py-32">
            <div className="w-16 h-16 relative">
              <div className="absolute inset-0 border-4 border-white/10 rounded-full"></div>
              <div className="absolute inset-0 border-4 border-blue-500 rounded-full border-t-transparent animate-spin"></div>
            </div>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="text-center py-32 bg-white/5 rounded-3xl border border-white/10 backdrop-blur-md">
            <Search className="w-16 h-16 mx-auto mb-6 text-zinc-600" />
            <h3 className="text-2xl font-black mb-2 text-white">Nothing found</h3>
            <p className="text-zinc-500">We couldn't find any products matching your search.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {filteredProducts.map(product => (
              <div key={product.id} className="bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 overflow-hidden group hover:-translate-y-2 hover:shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-all duration-500 flex flex-col relative">
                {/* Glowing aura effect on hover */}
                <div className="absolute inset-0 bg-gradient-to-b from-blue-500/0 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>
                <div className="aspect-[4/3] bg-black/40 p-8 flex items-center justify-center relative overflow-hidden">
                  {product.image_url ? (
                    <img src={product.image_url} alt={product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-700 ease-out drop-shadow-2xl" />
                  ) : (
                    <ShoppingBag className="w-24 h-24 text-zinc-800 group-hover:scale-110 transition-transform duration-700 ease-out" />
                  )}
                  {product.stock <= 5 && (
                    <div className="absolute top-4 right-4 bg-red-500/20 backdrop-blur-md border border-red-500/30 text-red-400 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center shadow-[0_0_15px_rgba(239,68,68,0.3)]">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-500 mr-2 animate-ping"></div>
                      Only {product.stock} left
                    </div>
                  )}
                </div>
                <div className="p-6 flex flex-col flex-1 relative z-10">
                  <div className="mb-2 text-[10px] font-black tracking-[0.2em] text-blue-400 uppercase">
                    {product.category?.name || 'Uncategorized'}
                  </div>
                  <h3 className="font-bold text-xl mb-4 text-white line-clamp-2 leading-tight">{product.name}</h3>
                  <div className="mt-auto flex items-end justify-between">
                    <div>
                      <span className="text-sm font-medium text-zinc-500 block mb-0.5">Price</span>
                      <span className="text-3xl font-black text-white">₹{product.selling_price.toFixed(2)}</span>
                    </div>
                    <button 
                      onClick={() => addToCart(product)}
                      className="w-14 h-14 rounded-2xl bg-white text-black flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:shadow-[0_0_30px_rgba(255,255,255,0.4)] relative overflow-hidden group/btn"
                    >
                      <div className="absolute inset-0 bg-gradient-to-tr from-zinc-200 to-white opacity-0 group-hover/btn:opacity-100 transition-opacity"></div>
                      <Plus className="w-6 h-6 relative z-10" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Ultra-Premium Glass Cart Slide-out */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          {/* Backdrop blur */}
          <div className="absolute inset-0 bg-black/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setIsCartOpen(false)}></div>
          
          <div className="relative w-full max-w-[450px] bg-[#0a0a0a]/90 backdrop-blur-3xl h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-500 ease-out border-l border-white/10">
            <div className="p-8 flex items-center justify-between border-b border-white/10 bg-white/5">
              <h2 className="text-3xl font-black text-white flex items-center">
                Your Cart
                <span className="ml-4 bg-blue-500/20 border border-blue-500/30 text-blue-400 text-sm py-1 px-4 rounded-full font-bold">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </span>
              </h2>
              <button onClick={() => setIsCartOpen(false)} className="p-3 bg-white/5 rounded-full hover:bg-white/10 hover:text-white text-zinc-400 transition-all hover:rotate-90">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
              {cart.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-zinc-500 space-y-6">
                  <div className="w-32 h-32 bg-white/5 rounded-full flex items-center justify-center mb-4">
                    <ShoppingCart className="w-12 h-12 opacity-50" />
                  </div>
                  <p className="text-xl font-medium text-white">Your cart is empty</p>
                  <button onClick={() => setIsCartOpen(false)} className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white rounded-full font-bold transition-colors">
                    Start Browsing
                  </button>
                </div>
              ) : (
                <div className="space-y-6">
                  {cart.map(item => (
                    <div key={item.product_id} className="flex gap-5 bg-white/5 p-4 rounded-3xl border border-white/5 group hover:border-white/10 transition-colors">
                      <div className="w-24 h-24 bg-black/50 rounded-2xl flex items-center justify-center p-3 shrink-0 shadow-inner overflow-hidden">
                        {item.product.image_url ? (
                          <img src={item.product.image_url} alt={item.product.name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                        ) : (
                          <ShoppingBag className="w-10 h-10 text-zinc-700" />
                        )}
                      </div>
                      <div className="flex-1 flex flex-col justify-between py-1">
                        <div>
                          <h4 className="font-bold text-base leading-tight mb-2 text-white">{item.product.name}</h4>
                          <p className="text-blue-400 font-black text-lg">₹{item.unit_price.toFixed(2)}</p>
                        </div>
                        <div className="flex items-center gap-4 mt-4">
                          <div className="flex items-center bg-black/50 rounded-xl p-1 border border-white/10">
                            <button onClick={() => updateQuantity(item.product_id, -1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-zinc-300 rounded-lg transition-colors">
                              <Minus className="w-4 h-4" />
                            </button>
                            <span className="w-10 text-center text-sm font-black text-white">{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.product_id, 1)} className="w-8 h-8 flex items-center justify-center hover:bg-white/10 text-zinc-300 rounded-lg transition-colors">
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {cart.length > 0 && (
              <div className="border-t border-white/10 bg-[#050505] p-8 shrink-0 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500"></div>
                
                <div className="space-y-4 mb-8 relative z-10">
                  <div className="flex justify-between text-zinc-400 font-medium">
                    <span>Subtotal</span>
                    <span className="text-white">₹{cartTotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-zinc-400 font-medium">
                    <span>GST (18%)</span>
                    <span className="text-white">₹{taxAmount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-2xl font-black pt-4 border-t border-white/10 text-white mt-2">
                    <span>Total Amount</span>
                    <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400">₹{finalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <form onSubmit={handleCheckout} className="space-y-4 relative z-10">
                  <div className="relative">
                    <input
                      type="text"
                      required
                      placeholder="Your Full Name"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white placeholder-zinc-500 transition-all font-medium"
                    />
                  </div>
                  <div className="relative">
                    <input
                      type="tel"
                      required
                      placeholder="Phone Number for Pickup"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      className="w-full px-5 py-4 bg-white/5 border border-white/10 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white/10 text-white placeholder-zinc-500 transition-all font-medium"
                    />
                  </div>
                  <button 
                    type="submit" 
                    disabled={submitting}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 py-4.5 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] text-lg font-black flex justify-center items-center gap-3 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:hover:scale-100 transition-all text-white mt-4 border border-white/20"
                  >
                    {submitting ? "Processing..." : "Place Pickup Order"}
                    {!submitting && <ChevronRight className="w-6 h-6" />}
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
