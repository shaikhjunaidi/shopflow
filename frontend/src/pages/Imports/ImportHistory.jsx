import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Download, FileText, Calendar, User, Trash2, Eye } from "lucide-react";
import axios from "axios";
import { format } from "date-fns";

const ImportHistory = () => {
  const [history, setHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${import.meta.env.VITE_API_URL || "http://localhost:5000"}/api/imports/history`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(response.data);
    } catch (error) {
      console.error("Error fetching history:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = (filePath, fileName) => {
    // In a real app, this would hit an endpoint that streams the file
    // For now, we open a new tab to the static route if it's publicly served
    // Ensure backslashes are replaced if Windows path
    const normalizedPath = filePath.replace(/\\/g, '/');
    window.open(`${import.meta.env.VITE_API_URL}/${normalizedPath}`, '_blank');
  };

  const handleReviewDraft = (record) => {
    // Navigate to preview passing the draft data
    navigate("/imports/preview", {
      state: {
        parsedData: {
          fileName: record.file_name,
          filePath: record.file_path,
          extractedProducts: record.draft_data
        },
        supplierId: record.supplier_id,
        isReviewingDraft: true,
        draftId: record.id
      }
    });
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Import History</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          View records of all past PDF catalog and invoice imports.
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
        {isLoading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">File Name</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Products Imported</th>
                  <th className="p-4 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Imported By</th>
                  <th className="p-4 text-right text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {history.map((record) => (
                  <tr key={record.id} className="hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors">
                    <td className="p-4 text-sm text-gray-900 dark:text-white">
                      <div className="flex items-center">
                        <Calendar size={16} className="text-gray-400 mr-2" />
                        {format(new Date(record.created_at), "MMM d, yyyy HH:mm")}
                      </div>
                    </td>
                    <td className="p-4 text-sm text-gray-900 dark:text-white font-medium">
                      <div className="flex items-center">
                        <FileText size={16} className="text-blue-500 mr-2" />
                        {record.file_name}
                      </div>
                    </td>
                    <td className="p-4 text-sm">
                      <span className={`px-2 py-1 rounded-md text-xs font-medium ${record.status === 'DRAFT' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'}`}>
                        {record.status || 'APPROVED'}
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      <span className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded-md text-xs font-medium">
                        {record.total_products} items
                      </span>
                    </td>
                    <td className="p-4 text-sm text-gray-600 dark:text-gray-300">
                      <div className="flex items-center">
                        <User size={16} className="text-gray-400 mr-2" />
                        {record.user_name || "System"}
                      </div>
                    </td>
                    <td className="p-4 text-right">
                      {record.status === 'DRAFT' && (
                        <button 
                          onClick={() => handleReviewDraft(record)}
                          className="text-yellow-600 hover:text-yellow-800 dark:text-yellow-500 dark:hover:text-yellow-400 transition-colors mr-3"
                          title="Review Draft"
                        >
                          <Eye size={18} />
                        </button>
                      )}
                      <button 
                        onClick={() => handleDownload(record.file_path, record.file_name)}
                        className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 transition-colors mr-3"
                        title="Download Original PDF"
                      >
                        <Download size={18} />
                      </button>
                    </td>
                  </tr>
                ))}
                {history.length === 0 && (
                  <tr>
                    <td colSpan="5" className="p-8 text-center text-gray-500 dark:text-gray-400">
                      No imports found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default ImportHistory;
