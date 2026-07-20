import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function AdminInstructors() {
  const auth = useAuth();
  const [instructors, setInstructors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showSuspendModal, setShowSuspendModal] = useState(false);
  const [suspendReason, setSuspendReason] = useState("");
  const [suspendDays, setSuspendDays] = useState(1);
  const [selectedInstructor, setSelectedInstructor] = useState(null);

  useEffect(() => {
    const fetchInstructors = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/instructors", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setInstructors(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching instructors:", err);
        setError(err.response?.data?.message || "Failed to fetch instructors");
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchInstructors();
    }
  }, [auth]);

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this instructor?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/admin/instructors/${id}`, {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setInstructors(instructors.filter((i) => i._id !== id));
      alert("Instructor deleted successfully");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete instructor");
    }
  };

  const openSuspendModal = (instructor) => {
    setSelectedInstructor(instructor);
    setSuspendReason("");
    setSuspendDays(1);
    setShowSuspendModal(true);
  };

  const closeSuspendModal = () => {
    setShowSuspendModal(false);
    setSelectedInstructor(null);
  };

  const handleConfirmSuspend = async () => {
    if (!suspendReason || suspendReason.trim() === "") {
      alert("Suspension reason is required");
      return;
    }
    if (!suspendDays || suspendDays < 1 || suspendDays > 10) {
      alert("Suspension days must be between 1 and 10");
      return;
    }

    try {
      const res = await axios.post(
        `http://localhost:5000/api/admin/instructors/${selectedInstructor._id}/suspend`,
        { reason: suspendReason, duration: suspendDays },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );
      // update list locally
      setInstructors((prev) => prev.map((i) => (i._id === selectedInstructor._id ? res.data.instructor : i)));
      alert("Instructor suspended successfully");
      closeSuspendModal();
    } catch (err) {
      alert(err.response?.data?.message || "Failed to suspend instructor");
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="admin-instructors p-8">
      <h2 className="text-3xl font-bold mb-8">Manage Instructors</h2>

      {instructors.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No instructors found</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full border-collapse">
            <thead className="bg-linear-to-r from-orange-500 via-red-500 to-pink-500 text-white">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Created At</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {instructors.map((instructor) => (
                <tr key={instructor._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{instructor.name}</td>
                  <td className="p-4">{instructor.email}</td>
                  <td className="p-4 text-sm text-gray-500">{instructor._id}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(instructor.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    {instructor.isSuspended ? (
                      <span className="px-3 py-1 bg-yellow-200 text-yellow-800 rounded">Suspended</span>
                    ) : (
                      <button
                        onClick={() => openSuspendModal(instructor)}
                        className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700"
                      >
                        Suspend
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showSuspendModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg shadow-lg w-11/12 max-w-md p-6">
            <h3 className="text-xl font-semibold mb-4">Suspend Instructor</h3>
            <p className="text-sm text-gray-600 mb-3">Instructor: {selectedInstructor?.name}</p>
            <div className="mb-3">
              <label className="block text-sm font-medium">Suspension Reason</label>
              <textarea
                value={suspendReason}
                onChange={(e) => setSuspendReason(e.target.value)}
                rows={4}
                className="w-full border p-2 rounded"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium">Suspension Duration (days, max 10)</label>
              <input
                type="number"
                value={suspendDays}
                onChange={(e) => setSuspendDays(parseInt(e.target.value || 0))}
                min={1}
                max={10}
                className="w-24 border p-2 rounded"
                required
              />
            </div>
            <div className="flex justify-end space-x-3">
              <button onClick={closeSuspendModal} className="px-4 py-2 bg-gray-200 rounded">Cancel</button>
              <button onClick={handleConfirmSuspend} className="px-4 py-2 bg-red-600 text-white rounded">Confirm Suspend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
