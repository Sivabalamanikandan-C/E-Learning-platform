import { useState } from "react";
import axios from "axios";

export default function InquiryStatusModal({ isOpen, onClose, email }) {
  const [inquiries, setInquiries] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const fetchInquiries = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`http://localhost:5000/api/suspension-inquiries/user/${email}`);
      setInquiries(res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load inquiries");
    } finally {
      setLoading(false);
    }
  };

  // Auto-fetch on modal open
  if (inquiries.length === 0 && !loading && !error) {
    fetchInquiries();
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-96 overflow-y-auto">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-4">Your Suspension Inquiries</h3>

          {error && <div className="text-red-600 mb-4">{error}</div>}

          {loading ? (
            <div className="text-center py-4">No inquiries...</div>
          ) : inquiries.length === 0 ? (
            <div className="text-gray-500 py-4">No inquiries yet.</div>
          ) : (
            <div className="space-y-4">
              {inquiries.map((iq) => (
                <div key={iq._id} className="border rounded p-3 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <div className="font-semibold">Status: {iq.status === "pending" ? "Pending" : "Replied"}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(iq.createdAt).toLocaleDateString()}
                    </div>
                  </div>

                  {iq.message && (
                    <div className="mb-2 text-sm">
                      <strong>Your Message:</strong> {iq.message}
                    </div>
                  )}

                  {iq.adminReply && (
                    <div className="bg-green-50 border border-green-200 rounded p-2 mt-2">
                      <strong className="text-green-800">Admin Reply:</strong>
                      <p className="text-green-700 text-sm mt-1">{iq.adminReply}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
