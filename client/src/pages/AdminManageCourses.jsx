import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";

export default function AdminManageCourses() {
  const auth = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Modal states
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      const res = await axios.get("http://localhost:5000/api/admin/courses/approval/all", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setCourses(res.data);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err.response?.data?.message || "Failed to fetch courses");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth?.token) fetchCourses();
  }, [auth]);

  const getStatusColor = (status) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "approved":
        return "bg-green-100 text-green-800";
      case "rejected":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return "🟡";
      case "approved":
        return "🟢";
      case "rejected":
        return "🔴";
      default:
        return "⚪";
    }
  };

  const handleApprove = async () => {
    if (!selectedCourse) return;

    try {
      setSubmitting(true);
      const res = await axios.post(
        `http://localhost:5000/api/admin/courses/approval/${selectedCourse._id}/approve`,
        {},
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      // update course in list
      setCourses(courses.map(c => c._id === selectedCourse._id ? res.data.course : c));
      setApproveModalOpen(false);
      setSelectedCourse(null);
      alert("Course approved successfully");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to approve course");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCourse || !rejectionReason.trim()) {
      alert("Rejection reason is required");
      return;
    }

    try {
      setSubmitting(true);
      const res = await axios.post(
        `http://localhost:5000/api/admin/courses/approval/${selectedCourse._id}/reject`,
        { rejectionReason },
        { headers: { Authorization: `Bearer ${auth.token}` } }
      );

      // update course in list
      setCourses(courses.map(c => c._id === selectedCourse._id ? res.data.course : c));
      setRejectModalOpen(false);
      setSelectedCourse(null);
      setRejectionReason("");
      alert("Course rejected successfully");
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to reject course");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="p-8">
      <h2 className="text-3xl font-bold mb-8">Manage Courses</h2>

      {courses.length === 0 ? (
        <p className="text-gray-500">No courses found</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <div key={course._id} className="border rounded-lg shadow-md overflow-hidden hover:shadow-lg transition bg-white">
              {/* Thumbnail */}
              <div className="relative bg-gray-200 h-48 flex items-center justify-center">
                {course.thumbnail ? (
                  <img src={course.thumbnail} alt={course.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="text-gray-400 text-center">No thumbnail</div>
                )}
              </div>

              {/* Content */}
              <div className="p-4">
                {/* Status Badge */}
                <div className={`inline-block px-3 py-1 rounded-full text-sm font-bold mb-2 ${getStatusColor(course.status)}`}>
                  {getStatusIcon(course.status)} {course.status.toUpperCase()}
                </div>

                {/* Title */}
                <h3 className="text-lg font-semibold text-gray-800 mb-2 line-clamp-2">{course.title}</h3>

                {/* Instructor */}
                <p className="text-sm text-gray-600 mb-2">
                  <strong>Instructor:</strong> {course.instructor?.name || "Unknown"}
                </p>

                {/* Category & Price */}
                <div className="flex justify-between text-sm text-gray-600 mb-3">
                  <span><strong>Category:</strong> {course.category || "N/A"}</span>
                  <span><strong>Price:</strong> ₹ {course.price || "0"}</span>
                </div>

                {/* Created Date */}
                <p className="text-xs text-gray-500 mb-4">
                  Created: {new Date(course.createdAt).toLocaleDateString()}
                </p>

                {/* Action Buttons */}
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => navigate(`/admin/courses/review/${course._id}`)}
                    className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition"
                  >
                    👁 View
                  </button>

                  {course.status === "pending" && (
                    <>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setApproveModalOpen(true);
                        }}
                        className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition"
                      >
                        ✅ Approve
                      </button>
                      <button
                        onClick={() => {
                          setSelectedCourse(course);
                          setRejectModalOpen(true);
                          setRejectionReason("");
                        }}
                        className="flex-1 px-3 py-2 bg-red-600 text-white rounded text-sm hover:bg-red-700 transition"
                      >
                        ❌ Reject
                      </button>
                    </>
                  )}
                </div>

                {/* Rejection Reason Display */}
                {course.status === "rejected" && course.rejectionReason && (
                  <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded text-sm">
                    <p className="font-semibold text-red-800">Rejection Reason:</p>
                    <p className="text-red-700 text-xs mt-1">{course.rejectionReason}</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Approve Modal */}
      {approveModalOpen && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setApproveModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Approve Course</h3>
            <p className="text-gray-700 mb-4">Are you sure you want to approve this course?</p>
            <p className="font-semibold text-gray-800 mb-6">{selectedCourse.title}</p>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setApproveModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleApprove}
                disabled={submitting}
                className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
              >
                {submitting ? "Processing..." : "Confirm Approve"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && selectedCourse && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={() => setRejectModalOpen(false)}>
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Reject Course</h3>
            <p className="text-gray-700 mb-4">Course: <strong>{selectedCourse.title}</strong></p>

            <div className="mb-4">
              <label className="block font-medium text-gray-700 mb-2">Reason for Rejection *</label>
              <textarea
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full border rounded p-2 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
                placeholder="Explain why this course is being rejected (minimum 10 characters recommended)..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setRejectModalOpen(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                disabled={submitting}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
              >
                {submitting ? "Processing..." : "Confirm Reject"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
