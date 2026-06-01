import React, { useState, useCallback } from "react";
import { UploadCloud, FileText, CheckCircle, XCircle, Loader2 } from "lucide-react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const ImportModule = () => {
  const [file, setFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', null
  const [errorMessage, setErrorMessage] = useState("");
  const [suppliers, setSuppliers] = useState([]);
  const [selectedSupplierId, setSelectedSupplierId] = useState("");
  const navigate = useNavigate();

  React.useEffect(() => {
    fetchSuppliers();
  }, []);

  const fetchSuppliers = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/suppliers`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSuppliers(res.data);
    } catch (error) {
      console.error("Failed to fetch suppliers:", error);
    }
  };

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragging(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && (droppedFile.type === "application/pdf" || droppedFile.type.startsWith("image/"))) {
      setFile(droppedFile);
      setUploadStatus(null);
    } else {
      setErrorMessage("Please upload a valid PDF or Image file.");
      setUploadStatus("error");
    }
  }, []);

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile && (selectedFile.type === "application/pdf" || selectedFile.type.startsWith("image/"))) {
      setFile(selectedFile);
      setUploadStatus(null);
    } else {
      setErrorMessage("Please upload a valid PDF or Image file.");
      setUploadStatus("error");
    }
  };

  const handleUpload = async () => {
    if (!file) return;

    setIsUploading(true);
    setUploadStatus(null);
    const formData = new FormData();
    formData.append("pdf", file);

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/imports/upload`, formData, {
        headers: { 
          "Content-Type": "multipart/form-data",
          Authorization: `Bearer ${token}`
        },
      });
      
      setUploadStatus("success");
      setIsUploading(false);
      
      // Pass data to preview screen
      navigate("/imports/preview", { state: { parsedData: response.data, supplierId: selectedSupplierId } });

    } catch (error) {
      console.error("Upload error:", error);
      setErrorMessage(error.response?.data?.error || "Failed to process PDF.");
      setUploadStatus("error");
      setIsUploading(false);
    }
  };

  const handleClearFile = () => {
    setFile(null);
    setUploadStatus(null);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import Products</h1>
        <button 
          onClick={() => navigate("/imports/history")}
          className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
        >
          View Import History
        </button>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 border border-gray-100 dark:border-gray-700">
        <div className="mb-6">
          <h2 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">Upload PDF or Image</h2>
          <p className="text-gray-500 dark:text-gray-400 text-sm mb-4">
            Upload supplier product lists, invoices, or stock sheets to convert them into inventory records.
          </p>
          
          <div className="max-w-md">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Select Supplier (Optional)
            </label>
            <select
              value={selectedSupplierId}
              onChange={(e) => setSelectedSupplierId(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">No Supplier (Uncategorized)</option>
              {suppliers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        </div>

        {!file ? (
          <div
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center justify-center transition-colors ${
              isDragging 
                ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" 
                : "border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700"
            }`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mb-4">
              <UploadCloud size={32} />
            </div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">Drag & Drop your file here</h3>
            <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">or click to browse from your device</p>
            
            <label className="cursor-pointer">
              <span className="bg-blue-600 text-white px-6 py-2.5 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                Browse Files
              </span>
              <input
                type="file"
                className="hidden"
                accept=".pdf,image/jpeg,image/png,image/webp"
                onChange={handleFileChange}
              />
            </label>
          </div>
        ) : (
          <div className="border border-gray-200 dark:border-gray-700 rounded-xl p-6 bg-gray-50 dark:bg-gray-700/30">
            <div className="flex items-start justify-between">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-lg flex items-center justify-center">
                  <FileText size={24} />
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 dark:text-white truncate max-w-md">{file.name}</h4>
                  <div className="flex items-center text-sm text-gray-500 dark:text-gray-400 mt-1 space-x-3">
                    <span>{(file.size / (1024 * 1024)).toFixed(2)} MB</span>
                    <span>•</span>
                    <span>{new Date().toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <div className="flex space-x-2">
                <button 
                  onClick={handleClearFile}
                  disabled={isUploading}
                  className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors disabled:opacity-50"
                >
                  Replace
                </button>
              </div>
            </div>

            {uploadStatus === "error" && (
              <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg flex items-center">
                <XCircle size={16} className="mr-2" />
                {errorMessage}
              </div>
            )}

            <div className="mt-6 flex justify-end space-x-3">
              <button
                onClick={handleClearFile}
                disabled={isUploading}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={isUploading}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isUploading ? (
                  <>
                    <Loader2 size={18} className="animate-spin mr-2" />
                    Processing...
                  </>
                ) : (
                  'Extract Data'
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportModule;
