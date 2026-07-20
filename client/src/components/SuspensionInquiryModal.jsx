import { useState } from "react";
import axios from "axios";

export default function SuspensionInquiryModal({ isOpen, onClose, email, onSuccess }) {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await axios.post("http://localhost:5000/api/suspension-inquiries", {
        email,
        message,
      });
      setLoading(false);
      setMessage("");
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to submit inquiry");
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4">
        <div className="p-6">
          <h3 className="text-xl font-semibold mb-2">Request Clarification</h3>
          <p className="text-sm text-gray-600 mb-4">We'll send your message to the admin. Provide details if you want a faster response.</p>

          {error && <div className="mb-3 text-red-700">{error}</div>}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700">Your Email *</label>
              <input type="email" value={email} readOnly className="w-full border p-2 rounded bg-gray-100" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Message *</label>
              <textarea value={message} onChange={(e) => setMessage(e.target.value)} className="w-full border p-2 rounded" rows={5} placeholder="Write details or ask for clarification..." />
            </div>

            <div className="flex gap-3 justify-end">
              <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button type="submit" disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded">{loading ? "Sending..." : "Send Request"}</button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
