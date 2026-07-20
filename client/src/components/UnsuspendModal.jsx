import { useState } from "react";
import axios from "axios";

export default function UnsuspendModal({ isOpen, onClose, student, auth, onSuccess }) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen || !student) return null;

  const now = new Date();
  const suspensionEnd = student.suspensionEndDate ? new Date(student.suspensionEndDate) : null;
  const unsuspendedEarly = suspensionEnd ? now < suspensionEnd : false;

  const handleSubmit = async () => {
    if (unsuspendedEarly && (!reason || reason.trim() === "")) {
      alert("Reason for Unsuspension is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `http://localhost:5000/api/admin/students/${student._id}/unsuspend`,
        { unsuspendReason: reason },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      // notify parent
      if (onSuccess) onSuccess(res.data);

      // dispatch global event so other pages refresh (e.g., complaints)
      try {
        window.dispatchEvent(new CustomEvent("studentUnsuspended", { detail: { studentId: student._id } }));
      } catch (e) {
        console.warn("Could not dispatch studentUnsuspended event", e);
      }

      alert("Student unsuspended successfully");
      onClose();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to unsuspend student");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-2">Unsuspend Student</h3>
        <p className="text-sm text-gray-600 mb-4">Student: <strong>{student.name}</strong> ({student.email})</p>

        {unsuspendedEarly ? (
          <>
            <label className="block font-medium">Reason for Unsuspension (required)</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border p-2 rounded mt-1" rows={4} />
          </>
        ) : (
          <p className="text-sm text-gray-700">This suspension has already expired or ended. Do you want to unsuspend the student?</p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
          <button onClick={handleSubmit} disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
            {submitting ? "Processing..." : "Confirm Unsuspend"}
          </button>
        </div>
      </div>
    </div>
  );
}
