import { useState } from "react";
import axios from "axios";

export default function SuspensionModal({
  isOpen,
  studentId,
  studentEmail,
  studentName,
  onClose,
  onSuccess,
  auth,
}) {
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(10);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);

    if (!reason.trim()) {
      setError("Suspension reason is required");
      return;
    }

    if (duration <= 0) {
      setError("Duration must be greater than 0 days");
      return;
    }

    setLoading(true);
    try {
      await axios.post(
        `http://localhost:5000/api/admin/students/${studentId}/suspend`,
        {
          reason: reason.trim(),
          duration: parseInt(duration),
        },
        {
          headers: { Authorization: `Bearer ${auth.token}` },
        }
      );

      setReason("");
      setDuration(10);
      onSuccess();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || "Failed to suspend student");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        {/* Header */}
        <div className="bg-red-600 text-white p-6 rounded-t-lg">
          <h2 className="text-xl font-bold">Suspend Student</h2>
          <p className="text-red-100 text-sm mt-1">{studentName} ({studentEmail})</p>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Suspension Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
              rows="3"
              placeholder="Enter the reason for suspension (e.g., violating terms of service, harassment, etc.)"
            />
          </div>

          {/* Duration */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">
              Suspension Duration (Days) *
            </label>
            <input
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="1"
              className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-200"
              placeholder="Default: 10 days"
            />
            <p className="text-xs text-gray-500 mt-1">
              Default suspension duration is 10 days
            </p>
          </div>

          {/* Info Box */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <p className="text-sm text-gray-700">
              <strong>This action will:</strong>
            </p>
            <ul className="text-xs text-gray-700 mt-2 space-y-1 list-disc list-inside">
              <li>Prevent student from logging in</li>
              <li>Block access to all courses</li>
              <li>Send email notification to student</li>
              <li>Auto-lift after {duration} days</li>
            </ul>
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 font-semibold"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold disabled:opacity-50"
              disabled={loading}
            >
              {loading ? "Suspending..." : "Suspend Student"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
