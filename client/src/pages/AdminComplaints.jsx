import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function AdminComplaints() {
  const auth = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [zoomedImage, setZoomedImage] = useState(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [approveDays, setApproveDays] = useState(3);
  const [approveReason, setApproveReason] = useState("");
  const [approveSubmitting, setApproveSubmitting] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectSubmitting, setRejectSubmitting] = useState(false);

  const fetch = async () => {
    try {
      const res = await axios.get("http://localhost:5000/api/complaints/admin/all", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setComplaints(res.data);
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to load complaints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token) fetch();
    const onUnsuspend = (e) => {
      // refresh complaints when a student is unsuspended elsewhere
      fetch();
    };
    window.addEventListener("studentUnsuspended", onUnsuspend);
    return () => window.removeEventListener("studentUnsuspended", onUnsuspend);
  }, [auth]);

  useEffect(() => {
    const handleEscKey = (e) => {
      if (e.key === "Escape") {
        setZoomedImage(null);
        setSelected(null);
      }
    };
    if (selected || zoomedImage) {
      window.addEventListener("keydown", handleEscKey);
      return () => window.removeEventListener("keydown", handleEscKey);
    }
  }, [selected, zoomedImage]);

  const openApproveModal = (c) => {
    setSelected(c);
    setApproveDays(3);
    setApproveReason(c?.description || "");
    setApproveModalOpen(true);
  };

  const confirmApprove = async () => {
    if (!approveDays || isNaN(approveDays)) {
      alert("Please provide suspension duration (1-10 days)");
      return;
    }
    const days = parseInt(approveDays, 10);
    if (days < 1 || days > 10) {
      alert("Suspension duration must be between 1 and 10 days");
      return;
    }

    try {
      setApproveSubmitting(true);
      await axios.post(
        `http://localhost:5000/api/complaints/admin/${selected._id}/approve`,
        { suspensionDays: days, suspensionReason: approveReason },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setApproveModalOpen(false);
      setSelected(null);
      fetch();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to approve and suspend");
    } finally {
      setApproveSubmitting(false);
    }
  };

  const openRejectModal = (c) => {
    setSelected(c);
    setRejectionReason("");
    setRejectModalOpen(true);
  };

  const confirmReject = async () => {
    if (!rejectionReason || rejectionReason.trim() === "") {
      alert("Rejection reason is required");
      return;
    }
    try {
      setRejectSubmitting(true);
      await axios.post(
        `http://localhost:5000/api/complaints/admin/${selected._id}/reject`,
        { rejectionReason },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      setRejectModalOpen(false);
      setSelected(null);
      setRejectionReason("");
      fetch();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to reject");
    } finally {
      setRejectSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;

  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold mb-4">Complaints</h2>
      {complaints.length === 0 ? (
        <div>No complaints</div>
      ) : (
        <div className="space-y-4">
          {complaints.map((c) => (
            <div key={c._id} className="border rounded p-4 bg-white shadow hover:shadow-lg transition">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                {/* Image Thumbnail */}
                {c.image && (
                  <div
                    className="cursor-pointer overflow-hidden rounded bg-gray-100 flex items-center justify-center h-32 md:h-40"
                    onClick={() => setZoomedImage(c.image)}
                  >
                    <img
                      src={`http://localhost:5000${c.image}`}
                      alt="evidence"
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                )}
                
                {/* Complaint Details */}
                <div className={c.image ? "md:col-span-3" : ""}>
                  <div className="font-semibold text-lg">{c.title}</div>
                  <div className="text-sm text-gray-600 mt-1">
                    By: <strong>{c.instructor?.name}</strong> — Against: <strong>{c.student?.name}</strong>
                  </div>
                  <div className="mt-2 text-sm text-gray-700 line-clamp-2">{c.description}</div>
                  <div className="mt-3 flex items-center gap-4">
                    <div>
                      Status: <span className={`font-semibold px-2 py-1 rounded text-white text-xs ${
                        c.status === "approved" ? "bg-green-600" :
                        c.status === "rejected" ? "bg-red-600" :
                        "bg-yellow-600"
                      }`}>{c.status}</span>
                    </div>
                    {c.rejectionReason && (
                      <div className="text-xs text-red-700">Reason: {c.rejectionReason}</div>
                    )}
                    {c.unsuspendReason && (
                      <div className="text-xs text-gray-700">Unsuspend Reason: {c.unsuspendReason}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="mt-4 flex gap-2 flex-wrap">
                <button
                  onClick={() => setSelected(c)}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition text-sm"
                >
                  View Details
                </button>
                {/* <button
                    onClick={() => openApproveModal(c)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm"
                >
                  Approve
                </button> */}
                {/* <button
                    onClick={() => openRejectModal(c)}
                  className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm"
                >
                  Reject
                </button> */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve & Suspend Modal */}
      {approveModalOpen && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setApproveModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-xl font-semibold mb-2">Approve Complaint & Suspend Student</h3>
            <p className="text-sm text-gray-600 mb-4">Student: <strong>{selected.student?.name}</strong> ({selected.student?.email})</p>

            <label className="block font-medium">Suspension Duration (days)</label>
            <input
              type="number"
              min={1}
              max={10}
              value={approveDays}
              onChange={(e) => setApproveDays(e.target.value)}
              className="w-32 border p-2 rounded mt-1"
            />

            <div className="mt-4">
              <label className="block font-medium">Reason (editable)</label>
              <textarea value={approveReason} onChange={(e) => setApproveReason(e.target.value)} className="w-full border p-2 rounded mt-1" rows={4} />
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button onClick={() => setApproveModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={confirmApprove} disabled={approveSubmitting} className="px-4 py-2 bg-green-600 text-white rounded">
                {approveSubmitting ? 'Processing...' : 'Confirm & Suspend'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setRejectModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-2">Reject Complaint</h3>
            <p className="text-sm text-gray-600 mb-3">Provide a reason for rejecting this complaint.</p>
            <textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} className="w-full border p-2 rounded" rows={4} />
            <div className="mt-4 flex justify-end gap-2">
              <button onClick={() => setRejectModalOpen(false)} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={confirmReject} disabled={rejectSubmitting} className="px-4 py-2 bg-red-600 text-white rounded">
                {rejectSubmitting ? 'Processing...' : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-40 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="sticky top-0 bg-white border-b p-4 md:p-6 flex justify-between items-start">
              <div>
                <h3 className="text-xl md:text-2xl font-bold">{selected.title}</h3>
                <p className="text-sm text-gray-600 mt-1">
                  By: <strong>{selected.instructor?.name}</strong> ({selected.instructor?.email})
                </p>
              </div>
              <button
                onClick={() => setSelected(null)}
                className="text-gray-400 hover:text-gray-700 text-2xl font-bold"
              >
                ✕
              </button>
            </div>

            {/* Body */}
            <div className="p-4 md:p-6 space-y-4">
              {/* Against */}
              <div>
                <p className="text-sm font-semibold text-gray-600">AGAINST STUDENT</p>
                <p className="text-lg font-semibold mt-1">{selected.student?.name} ({selected.student?.email})</p>
              </div>

              {/* Image */}
              {selected.image && (
                <div>
                  <p className="text-sm font-semibold text-gray-600 mb-2">EVIDENCE IMAGE</p>
                  <div
                    className="cursor-pointer overflow-hidden rounded border border-gray-300 bg-gray-100 max-h-64 flex items-center justify-center"
                    onClick={() => setZoomedImage(selected.image)}
                  >
                    <img
                      src={`http://localhost:5000${selected.image}`}
                      alt="evidence"
                      className="w-full h-full object-contain hover:scale-105 transition-transform duration-300"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Click to zoom</p>
                </div>
              )}

              {/* Description */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-2">COMPLAINT DESCRIPTION</p>
                <p className="whitespace-pre-wrap text-gray-700">{selected.description}</p>
              </div>

              {/* Status */}
              <div>
                <p className="text-sm font-semibold text-gray-600 mb-1">STATUS</p>
                <span className={`inline-block px-3 py-1 rounded text-white font-semibold ${
                  selected.status === "approved" ? "bg-green-600" :
                  selected.status === "rejected" ? "bg-red-600" :
                  "bg-yellow-600"
                }`}>{selected.status}</span>
              </div>

              {/* Rejection Reason */}
              {selected.status === "rejected" && selected.rejectionReason && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-sm font-semibold text-red-800">Rejection Reason:</p>
                  <p className="text-sm text-red-700 mt-1">{selected.rejectionReason}</p>
                </div>
              )}

              {/* Unsuspend Reason */}
              {selected.unsuspendReason && (
                <div className="bg-yellow-50 border border-yellow-200 rounded p-3">
                  <p className="text-sm font-semibold text-yellow-800">Unsuspend Reason:</p>
                  <p className="text-sm text-yellow-700 mt-1">{selected.unsuspendReason}</p>
                </div>
              )}

              {/* Rejection Reason Input (if not resolved) */}
              {selected.status === "pending" && (
                <div>
                  <label className="block font-semibold text-gray-700 mb-2">Rejection Reason (if rejecting)</label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full border border-gray-300 p-3 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={4}
                    placeholder="Explain why the complaint is being rejected..."
                  />
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="sticky bottom-0 bg-white border-t p-4 md:p-6 flex justify-end gap-2 flex-wrap">
              <button
                onClick={() => setSelected(null)}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400 transition text-sm font-semibold"
              >
                Close
              </button>
              {selected.status === "pending" && (
                <>
                  <button
                    onClick={() => openApproveModal(selected)}
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition text-sm font-semibold"
                  >
                    ✓ Approve
                  </button>
                  <button
                    onClick={() => openRejectModal(selected)}
                    className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition text-sm font-semibold"
                  >
                    ✕ Reject
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Zoom Modal */}
      {zoomedImage && (
        <div
          className="fixed inset-0 bg-black bg-opacity-95 flex items-center justify-center z-50 p-4 animate-fade-in"
          onClick={() => setZoomedImage(null)}
        >
          {/* Close Button */}
          <button
            onClick={() => setZoomedImage(null)}
            className="absolute top-4 right-4 text-white hover:text-gray-300 transition text-3xl font-bold z-10"
          >
            ✕
          </button>

          {/* Zoomed Image */}
          <div
            className="relative max-w-5xl max-h-[90vh] flex items-center justify-center animate-zoom-in"
            onClick={(e) => e.stopPropagation()}
          >
            <img
              src={`http://localhost:5000${zoomedImage}`}
              alt="zoomed evidence"
              className="w-full h-full object-contain"
            />
          </div>

          {/* Exit Hint */}
          <p className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-sm opacity-75">
            Press ESC or click outside to close
          </p>
        </div>
      )}

      {/* Styles for animations */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
        @keyframes zoomIn {
          from {
            transform: scale(0.8);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
        .animate-fade-in {
          animation: fadeIn 0.3s ease-in-out;
        }
        .animate-zoom-in {
          animation: zoomIn 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}
