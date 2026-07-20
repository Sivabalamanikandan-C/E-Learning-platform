import axios from "axios";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function MyCourses() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState([]);
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [activeTab, setActiveTab] = useState("instructor");

  const auth = useAuth();
  const token = auth?.token;
  const role = auth?.role;

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      setLoading(true);
      // Fetch instructor courses
      const res = await axios.get(
        "http://localhost:5000/api/instructor/courses/list",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setCourses(res.data);

      // Fetch enrolled courses for the instructor (as a student)
      if (role !== "instructor") {
        try {
          const enrolledRes = await axios.get(
            "http://localhost:5000/api/student/courses/enrolled",
            {
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          );
          setEnrolledCourses(enrolledRes.data.courses || enrolledRes.data.enrolledCourses || enrolledRes.data.enrolled || []);
        } catch (err) {
          // Ignore 403 Forbidden errors as instructors might not have access to student routes
          if (err.response?.status !== 403) {
            console.warn("Could not fetch enrolled courses:", err);
          }
          setEnrolledCourses([]);
        }
      }

      setError(null);
    } catch (err) {
      console.error("Error fetching courses:", err);
      if (err.response?.status === 401 || err.response?.status === 403) {
        auth.logout();
        navigate("/login", { replace: true });
      }
      setError("Failed to load courses. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAvailability = async (courseId, currentStatus) => {
    try {
      setUpdatingId(courseId);
      const res = await axios.put(
        `http://localhost:5000/api/instructor/courses/${courseId}/availability`,
        { isAvailable: !currentStatus },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Update local state
      setCourses(
        courses.map((course) =>
          course._id === courseId
            ? { ...course, isAvailable: !currentStatus }
            : course
        )
      );
    } catch (err) {
      console.error("Error updating course:", err);
      alert("Failed to update course status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleDeleteCourse = async (courseId) => {
    if (!window.confirm("Are you sure you want to delete this course?")) {
      return;
    }

    try {
      setUpdatingId(courseId);
      await axios.delete(
        `http://localhost:5000/api/instructor/courses/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Remove from local state
      setCourses(courses.filter((course) => course._id !== courseId));
    } catch (err) {
      console.error("Error deleting course:", err);
      alert("Failed to delete course");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleEditCourse = (courseId) => {
    navigate(`/instructor/edit-course/${courseId}`);
  };

  const handleContinueLearning = (courseId) => {
    navigate(`/student/course/${courseId}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-lg font-semibold">Loading courses...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">My Courses</h1>
              <p className="text-gray-600 mt-2">
                Manage your courses and student enrollments
              </p>
            </div>

          </div>

          {/* Tabs */}
          {enrolledCourses.length > 0 && (
            <div className="flex gap-4 mt-6 border-b border-gray-200">
              <button
                onClick={() => setActiveTab("instructor")}
                className={`py-3 px-4 font-semibold transition ${activeTab === "instructor"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                My Courses ({courses.length})
              </button>
              <button
                onClick={() => setActiveTab("enrolled")}
                className={`py-3 px-4 font-semibold transition ${activeTab === "enrolled"
                  ? "border-b-2 border-blue-600 text-blue-600"
                  : "text-gray-600 hover:text-gray-900"
                  }`}
              >
                Learning ({enrolledCourses.length})
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {error && (
          <div className="mb-6 p-4 bg-red-100 border border-red-400 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Instructor Courses Tab */}
        {activeTab === "instructor" && (
          <>
            {courses.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747m0-13c5.5 0 10 4.745 10 10.747M12 6.253v13"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No courses yet
                </h3>
                <p className="text-gray-600 mb-6">
                  Get started by creating your first course
                </p>
                <button
                  onClick={() => navigate("/instructor/create-course")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Create Your First Course
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {courses.map((course) => (
                  <div
                    key={course._id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Course Thumbnail */}
                    <div className="relative h-48 bg-gray-300 overflow-hidden">
                      {course.thumbnail && !course.thumbnail.includes('localhost') ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            console.warn(`Failed to load course thumbnail: ${course.title}`, course.thumbnail);
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-400 to-blue-600"><svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.5S6.5 26.747 12 26.747s10-4.5 10-10.247S17.5 6.253 12 6.253z" /></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-400 to-blue-600">
                          <svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747m0-13c5.5 0 10 4.745 10 10.747M12 6.253v13"
                            />
                          </svg>
                        </div>
                      )}
                      {/* Status Badge (pending / approved / rejected) */}
                      <div className="absolute top-3 right-3">
                        {(() => {
                          const status = course.status || "pending";
                          let classes = "px-3 py-1 rounded-full text-xs font-semibold ";
                          let label = status.charAt(0).toUpperCase() + status.slice(1);

                          if (status === "pending") {
                            classes += "bg-yellow-100 text-yellow-800";
                          } else if (status === "approved") {
                            classes += "bg-green-500 text-white";
                          } else if (status === "rejected") {
                            classes += "bg-red-500 text-white";
                          } else {
                            classes += "bg-gray-200 text-gray-800";
                          }

                          return (
                            <span className={classes} title={`Status: ${label}`}>
                              {status === "pending" ? "Pending" : label}
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {course.description}
                      </p>

                      <div className="flex justify-between items-center mb-4">
                        <span className="text-2xl font-bold text-blue-600">
                          ₹ {course.price}
                        </span>
                        <span className="text-xs text-gray-500">
                          {new Date(course.createdAt).toLocaleDateString()}
                        </span>
                      </div>

                      {/* Action Buttons */}
                      <div className="space-y-2">
                        {/* Toggle Availability Button (only enabled for approved courses) */}
                        <button
                          onClick={() =>
                            handleToggleAvailability(
                              course._id,
                              course.isAvailable
                            )
                          }
                          disabled={updatingId === course._id || course.status !== "approved"}
                          title={course.status !== "approved" ? "Only approved courses can be made available to students" : undefined}
                          className={`w-full py-2 px-3 rounded-lg font-semibold text-white transition ${course.isAvailable
                            ? "bg-orange-500 hover:bg-orange-600"
                            : "bg-green-500 hover:bg-green-600"
                            } ${updatingId === course._id || course.status !== "approved" ? "opacity-50 cursor-not-allowed" : ""}`}
                        >
                          {updatingId === course._id ? "Updating..." : course.isAvailable ? "Make Unavailable" : "Make Available"}
                        </button>

                        {/* Edit and Delete Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditCourse(course._id)}
                            disabled={updatingId === course._id}
                            className="flex-1 bg-blue-500 hover:bg-blue-600 text-white py-2 px-3 rounded-lg font-semibold transition disabled:opacity-50"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteCourse(course._id)}
                            disabled={updatingId === course._id}
                            className="flex-1 bg-red-500 hover:bg-red-600 text-white py-2 px-3 rounded-lg font-semibold transition disabled:opacity-50"
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Enrolled Courses Tab */}
        {activeTab === "enrolled" && (
          <>
            {enrolledCourses.length === 0 ? (
              <div className="text-center py-12">
                <div className="mb-4">
                  <svg
                    className="mx-auto h-12 w-12 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747m0-13c5.5 0 10 4.745 10 10.747M12 6.253v13"
                    />
                  </svg>
                </div>
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Not enrolled in any courses
                </h3>
                <p className="text-gray-600 mb-6">
                  Explore and enroll in courses to continue learning
                </p>
                <button
                  onClick={() => navigate("/student/courses")}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition"
                >
                  Explore Courses
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {enrolledCourses.map((course) => (
                  <div
                    key={course._id}
                    className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
                  >
                    {/* Course Thumbnail */}
                    <div className="relative h-48 bg-gray-300 overflow-hidden">
                      {course.thumbnail && !course.thumbnail.includes('localhost') ? (
                        <img
                          src={course.thumbnail}
                          alt={course.title}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-linear-to-br from-green-400 to-green-600"><svg class="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6.253v13m0-13C6.5 6.253 2 10.753 2 16.5S6.5 26.747 12 26.747s10-4.5 10-10.247S17.5 6.253 12 6.253z" /></svg></div>';
                          }}
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-green-400 to-green-600">
                          <svg
                            className="w-12 h-12 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M12 6.253v13m0-13C6.5 6.253 2 10.998 2 17s4.5 10.747 10 10.747m0-13c5.5 0 10 4.745 10 10.747M12 6.253v13"
                            />
                          </svg>
                        </div>
                      )}
                      {/* Status Badge */}
                      <div className="absolute top-3 right-3">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-semibold text-white ${course.status === "Completed"
                            ? "bg-green-500"
                            : "bg-blue-500"
                            }`}
                        >
                          {course.status}
                        </span>
                      </div>
                    </div>

                    {/* Course Details */}
                    <div className="p-4">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2 line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-gray-600 text-sm mb-2">
                        by {course.instructorName}
                      </p>

                      <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                        {course.description}
                      </p>

                      {/* Progress Section */}
                      {(() => {
                        const calculatedProgress =
                          course.status === "Completed"
                            ? 100
                            : course.totalLectures > 0
                              ? Math.round(
                                ((course.completedLectures || 0) / course.totalLectures) * 100
                              )
                              : 0;

                        return (
                          <>
                            <div className="progress-section">
                              <div className="progress-header">
                                <span className="progress-label">Progress</span>
                                <span className="progress-percent">
                                  {calculatedProgress}%
                                </span>
                              </div>

                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${calculatedProgress}%` }}
                                ></div>
                              </div>

                              <p className="lectures-info">
                                {course.completedLectures || 0} of {course.totalLectures} lectures completed
                              </p>
                            </div>

                            {/* Continue Learning Button */}
                            <button
                              onClick={() => handleContinueLearning(course._id)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                            >
                              {calculatedProgress === 100
                                ? "Review Course"
                                : "Continue Learning"}
                            </button>
                          </>
                        );
                      })()}




                      {/* Course Meta */}
                      <div className="flex gap-2 mb-4">
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {course.category}
                        </span>
                        <span className="text-xs px-2 py-1 bg-gray-100 text-gray-700 rounded">
                          {course.level}
                        </span>
                      </div>

                      {/* Continue Learning Button */}
                      <button
                        onClick={() => handleContinueLearning(course._id)}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg transition"
                      >
                        {course.progress >= 100 ? "Review Course" : "Continue Learning"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
