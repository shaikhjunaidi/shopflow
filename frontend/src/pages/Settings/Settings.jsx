import { useState, useEffect } from "react";
import { Settings as SettingsIcon, User, Lock, Bell, Store } from "lucide-react";
import axios from "axios";

export default function Settings() {
  const [activeTab, setActiveTab] = useState("profile");
  const [submitting, setSubmitting] = useState(false);
  
  const [profileForm, setProfileForm] = useState({
    name: "",
    email: "",
    profile_image: "",
    imageFile: null
  });

  const [storeForm, setStoreForm] = useState({
    name: "ShopFlow Headquarters",
    address: "123 Business Avenue, Suite 100, Tech City",
    email: "contact@shopflow.app",
    phone: "+91 98765 43210",
    gstin: "27AABCU9603R1ZX",
    currency: "INR (₹)"
  });

  const [securityForm, setSecurityForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [notificationForm, setNotificationForm] = useState({
    lowStock: true,
    dailySummary: true,
    newInvoice: false,
    marketing: false
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("user")) || {};
    setProfileForm({
      name: user.name || "",
      email: user.email || "",
      profile_image: user.profile_image || "",
      imageFile: null
    });

    const savedStore = JSON.parse(localStorage.getItem("shopflow_store_settings"));
    if (savedStore) setStoreForm(savedStore);

    const savedNotif = JSON.parse(localStorage.getItem("shopflow_notification_settings"));
    if (savedNotif) setNotificationForm(savedNotif);
  }, []);

  const handleSaveProfile = async () => {
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      let finalImageUrl = profileForm.profile_image;
      
      if (profileForm.imageFile) {
        const uploadData = new FormData();
        uploadData.append("image", profileForm.imageFile);
        const uploadRes = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/upload`, uploadData, {
          headers: { ...headers, "Content-Type": "multipart/form-data" }
        });
        finalImageUrl = uploadRes.data.url;
      }

      const res = await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/profile`, {
        name: profileForm.name,
        email: profileForm.email,
        profile_image: finalImageUrl
      }, { headers });

      localStorage.setItem("user", JSON.stringify(res.data));
      setProfileForm(prev => ({ ...prev, profile_image: finalImageUrl, imageFile: null }));
      
      alert("Profile updated successfully!");
      window.location.reload();
    } catch (error) {
      console.error("Failed to update profile:", error);
      alert("Error updating profile");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveStore = () => {
    localStorage.setItem("shopflow_store_settings", JSON.stringify(storeForm));
    alert("Store details saved successfully!");
  };

  const handleSaveSecurity = async () => {
    if (securityForm.newPassword !== securityForm.confirmPassword) {
      return alert("New passwords do not match!");
    }
    setSubmitting(true);
    try {
      const token = localStorage.getItem("token");
      await axios.put(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/auth/password`, {
        currentPassword: securityForm.currentPassword,
        newPassword: securityForm.newPassword
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      alert("Password updated successfully!");
      setSecurityForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (error) {
      alert(error.response?.data?.error || "Failed to update password");
    } finally {
      setSubmitting(false);
    }
  };

  const handleSaveNotifications = () => {
    localStorage.setItem("shopflow_notification_settings", JSON.stringify(notificationForm));
    alert("Notification preferences saved successfully!");
  };

  return (
    <div className="p-6 relative">
      <div className="mb-8">
        <h2 className="text-2xl font-bold flex items-center"><SettingsIcon className="mr-2" /> Settings</h2>
        <p className="text-zinc-500 dark:text-zinc-400 mt-1">Manage your account settings and preferences.</p>
      </div>

      <div className="flex flex-col md:flex-row gap-8">
        <aside className="w-full md:w-64 shrink-0">
          <nav className="flex flex-col space-y-1">
            <TabButton icon={User} label="Profile" isActive={activeTab === "profile"} onClick={() => setActiveTab("profile")} />
            <TabButton icon={Store} label="Store Details" isActive={activeTab === "store"} onClick={() => setActiveTab("store")} />
            <TabButton icon={Lock} label="Security" isActive={activeTab === "security"} onClick={() => setActiveTab("security")} />
            <TabButton icon={Bell} label="Notifications" isActive={activeTab === "notifications"} onClick={() => setActiveTab("notifications")} />
          </nav>
        </aside>

        <div className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-sm p-6">
          {activeTab === "profile" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-semibold">Profile Settings</h3>
              
              <div className="flex items-center space-x-6 mb-6">
                <div className="w-24 h-24 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center text-zinc-400">
                  {profileForm.imageFile ? (
                    <img src={URL.createObjectURL(profileForm.imageFile)} className="w-full h-full object-cover" />
                  ) : profileForm.profile_image ? (
                    <img src={profileForm.profile_image} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10" />
                  )}
                </div>
                <div>
                  <h4 className="text-sm font-medium mb-1">Profile Picture</h4>
                  <input type="file" accept="image/*" onChange={e => setProfileForm({...profileForm, imageFile: e.target.files[0]})} className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 dark:file:bg-blue-900/30 dark:file:text-blue-400" />
                  <p className="text-xs text-zinc-500 mt-2">Recommended: Square image, max 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Full Name</label>
                  <input type="text" value={profileForm.name} onChange={e => setProfileForm({...profileForm, name: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Email Address</label>
                  <input type="email" value={profileForm.email} onChange={e => setProfileForm({...profileForm, email: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={handleSaveProfile} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50">
                {submitting ? "Saving..." : "Save Changes"}
              </button>
            </div>
          )}

          {activeTab === "store" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-semibold">Store Details</h3>
              <p className="text-sm text-zinc-500 mb-6">This information will be displayed on your invoices and receipts.</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Store Name</label>
                  <input type="text" value={storeForm.name} onChange={e => setStoreForm({...storeForm, name: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Business Address</label>
                  <textarea rows="2" value={storeForm.address} onChange={e => setStoreForm({...storeForm, address: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500"></textarea>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Contact Email</label>
                  <input type="email" value={storeForm.email} onChange={e => setStoreForm({...storeForm, email: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Phone Number</label>
                  <input type="text" value={storeForm.phone} onChange={e => setStoreForm({...storeForm, phone: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">GSTIN / Tax ID</label>
                  <input type="text" value={storeForm.gstin} onChange={e => setStoreForm({...storeForm, gstin: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Currency Preference</label>
                  <select value={storeForm.currency} onChange={e => setStoreForm({...storeForm, currency: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option>INR (₹)</option>
                    <option>USD ($)</option>
                    <option>EUR (€)</option>
                    <option>GBP (£)</option>
                  </select>
                </div>
              </div>
              <button onClick={handleSaveStore} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-4">
                Save Store Details
              </button>
            </div>
          )}

          {activeTab === "security" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-semibold">Security Settings</h3>
              <p className="text-sm text-zinc-500 mb-6">Ensure your account is using a long, random password to stay secure.</p>
              
              <div className="max-w-md space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Current Password</label>
                  <input type="password" value={securityForm.currentPassword} onChange={e => setSecurityForm({...securityForm, currentPassword: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">New Password</label>
                  <input type="password" value={securityForm.newPassword} onChange={e => setSecurityForm({...securityForm, newPassword: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1.5 text-zinc-700 dark:text-zinc-300">Confirm New Password</label>
                  <input type="password" value={securityForm.confirmPassword} onChange={e => setSecurityForm({...securityForm, confirmPassword: e.target.value})} className="w-full px-3 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-950 focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <button onClick={handleSaveSecurity} disabled={submitting} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 mt-4">
                {submitting ? "Updating..." : "Update Password"}
              </button>
            </div>
          )}

          {activeTab === "notifications" && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <h3 className="text-lg font-semibold">Notification Preferences</h3>
              <p className="text-sm text-zinc-500 mb-6">Choose what notifications you want to receive.</p>
              
              <div className="space-y-4">
                <ToggleRow 
                  title="Low Stock Alerts" 
                  description="Get notified when a product's stock falls below the minimum threshold."
                  checked={notificationForm.lowStock}
                  onChange={(checked) => setNotificationForm({...notificationForm, lowStock: checked})}
                />
                <ToggleRow 
                  title="Daily Sales Summary" 
                  description="Receive a daily email with a summary of your sales and revenue."
                  checked={notificationForm.dailySummary}
                  onChange={(checked) => setNotificationForm({...notificationForm, dailySummary: checked})}
                />
                <ToggleRow 
                  title="New Invoice Notifications" 
                  description="Get pinged whenever a new invoice is generated by a cashier."
                  checked={notificationForm.newInvoice}
                  onChange={(checked) => setNotificationForm({...notificationForm, newInvoice: checked})}
                />
                <ToggleRow 
                  title="Marketing Emails" 
                  description="Receive updates about new ShopFlow features and promotions."
                  checked={notificationForm.marketing}
                  onChange={(checked) => setNotificationForm({...notificationForm, marketing: checked})}
                />
              </div>

              <button onClick={handleSaveNotifications} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors mt-6">
                Save Preferences
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TabButton({ icon: Icon, label, isActive, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center px-4 py-2.5 rounded-lg text-sm font-medium transition-colors w-full ${
        isActive 
          ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400" 
          : "text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800/50 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      <Icon className="w-4 h-4 mr-3" />
      {label}
    </button>
  );
}

function ToggleRow({ title, description, checked, onChange }) {
  return (
    <div className="flex items-start justify-between py-3 border-b border-zinc-100 dark:border-zinc-800/50 last:border-0">
      <div>
        <h4 className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{title}</h4>
        <p className="text-xs text-zinc-500 mt-1">{description}</p>
      </div>
      <button 
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full transition-colors focus:outline-none ${checked ? 'bg-blue-600' : 'bg-zinc-200 dark:bg-zinc-700'}`}
      >
        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${checked ? 'translate-x-2' : '-translate-x-2'}`} />
      </button>
    </div>
  );
}
