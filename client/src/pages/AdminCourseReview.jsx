import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { useParams, useNavigate } from "react-router-dom";
import VideoPlayer from "../components/VideoPlayer";

export default function AdminCourseReview() {
  const auth = useAuth();
  const { id } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourse = async () => {
      try {
        setLoading(true);
        const res = await axios.get(`http://localhost:5000/api/admin/courses/approval/${id}`, {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setCourse(res.data);
      } catch (err) {
        console.error("Error fetching course:", err);
        setError(err.response?.data?.message || "Failed to fetch course");
      } finally {
        setLoading(false);
      }
    };

    if (auth?.token && id) fetchCourse();
  }, [auth, id]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;
  if (!course) return <div className="p-8">Course not found</div>;

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

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/admin/manage-courses")}
        className="mb-6 px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition"
      >
        ← Back to Courses
      </button>

      <div className="bg-white rounded shadow-md p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{course.title}</h1>
            <p className="text-gray-600 text-lg">{course.subtitle}</p>
          </div>
          <div className={`px-4 py-2 rounded-full font-semibold text-lg ${getStatusColor(course.status)}`}>
            {course.status.toUpperCase()}
          </div>
        </div>

        {/* Thumbnail */}
        {course.thumbnail && (
          <div className="mb-6 rounded overflow-hidden bg-gray-100">
            <img src={course.thumbnail} alt={course.title} className="w-full h-96 object-cover" />
          </div>
        )}

        {/* Course Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Left Column */}
          <div className="space-y-4">
            <div>
              <label className="font-semibold text-gray-700">Category</label>
              <p className="text-gray-600">{course.category || "N/A"}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Level</label>
              <p className="text-gray-600">{course.level || "N/A"}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Language</label>
              <p className="text-gray-600">{course.language || "N/A"}</p>
            </div>
            <div>
              <label className="font-semibold text-gray-700">Price</label>
              <p className="text-gray-600">${course.price || "0"}</p>
            </div>
          </div>

          {/* Right Column - Instructor */}
          <div>
            <label className="font-semibold text-gray-700 block mb-2">Instructor</label>
            <div className="bg-gray-50 p-4 rounded">
              <p className="font-semibold text-gray-800">{course.instructor?.name || "Unknown"}</p>
              <p className="text-gray-600 text-sm">{course.instructor?.email || "N/A"}</p>
            </div>
          </div>
        </div>

        {/* Description */}
        <div className="mb-6">
          <label className="font-semibold text-gray-700 block mb-2">Description</label>
          <div className="bg-gray-50 p-4 rounded whitespace-pre-wrap text-gray-700">
            {course.description || "No description available"}
          </div>
        </div>

        {/* Lectures Section */}
        <div className="mb-6">
          <h3 className="text-2xl font-bold text-gray-900 mb-4">🎬 Lectures ({course.lectures?.length || 0})</h3>
          {course.lectures && course.lectures.length > 0 ? (
            <div className="space-y-3">
              {course.lectures.map((lecture, idx) => (
                <div key={idx} className="border rounded p-4 bg-gray-50">
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-semibold text-gray-800">Lecture {idx + 1}: {lecture.title}</h4>
                    {lecture.freePreview && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">FREE PREVIEW</span>
                    )}
                  </div>
                  {lecture.videoUrl && (
                    <div className="mb-2">
                      <VideoPlayer
                        videoUrl={lecture.videoUrl}
                        hasAccess={true}
                        lectureTitle={lecture.title}
                        courseId={course._id}
                        lectureIndex={idx}
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-gray-600">No lectures added yet</p>
          )}
        </div>

        {/* Quiz Section */}
        {course.quiz && (
          <div className="mb-6">
            <h3 className="text-2xl font-bold text-gray-900 mb-4">📋 Quiz</h3>
            <div className="border rounded p-4 bg-gray-50 space-y-3">
              <div>
                <label className="font-semibold text-gray-700">Title</label>
                <p className="text-gray-600">{course.quiz.title || "N/A"}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Description</label>
                <p className="text-gray-600">{course.quiz.description || "N/A"}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Time Limit (minutes)</label>
                <p className="text-gray-600">{course.quiz.timeLimit || "No limit"}</p>
              </div>
              <div>
                <label className="font-semibold text-gray-700">Questions: {course.quiz.questions?.length || 0}</label>
                {course.quiz.questions && course.quiz.questions.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {course.quiz.questions.map((q, idx) => (
                      <div key={idx} className="text-sm bg-white p-2 rounded border">
                        <p className="font-semibold text-gray-800">Q{idx + 1}: {q.questionText}</p>
                        <p className="text-gray-600 text-xs">Type: {q.questionType} | Points: {q.points}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Rejection Reason (if rejected) */}
        {course.status === "rejected" && course.rejectionReason && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-800 mb-2">❌ Rejection Reason</h3>
            <p className="text-red-700">{course.rejectionReason}</p>
          </div>
        )}

        {/* Admin Info */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm text-gray-600 border-t pt-4">
          {course.approvedAt && (
            <div>
              <p className="font-semibold">Approved On</p>
              <p>{new Date(course.approvedAt).toLocaleString()}</p>
            </div>
          )}
          {course.rejectedAt && (
            <div>
              <p className="font-semibold">Rejected On</p>
              <p>{new Date(course.rejectedAt).toLocaleString()}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
