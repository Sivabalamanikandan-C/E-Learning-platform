import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import PaymentModal from "../components/PaymentModal";

export default function CoursesList() {
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [enrollmentMessage, setEnrollmentMessage] = useState({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      console.log("Fetching courses with token:", token ? "YES" : "NO");

      const response = await axios.get(
        "http://localhost:5000/api/student/courses",
        { headers }
      );

      console.log("Courses received:", response.data.courses);

      setCourses(response.data.courses || []);
      setLoading(false);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError(err.response?.data?.message || "Failed to load courses");
      setLoading(false);
    }
  };

  const handleViewCourse = (courseId) => {
    // Navigate to course details page
    navigate(`/student/course/${courseId}`);
  };

  const handleEnroll = (courseData, e) => {
    e.stopPropagation();
    const token = localStorage.getItem("token");
    if (!token) {
      navigate("/login");
      return;
    }

    // Validate course data has required fields
    if (!courseData || !courseData._id) {
      setEnrollmentMessage((prev) => ({
        ...prev,
        [courseData?._id]: { 
          type: "error", 
          message: "Invalid course data. Please refresh and try again." 
        },
      }));
      return;
    }

    console.log("Opening payment modal for course:", courseData._id);

    // Set the selected course and open payment modal
    setSelectedCourse(courseData);
    setShowPaymentModal(true);
  };

  const handlePaymentSuccess = async (enrollment) => {
    // Close modal and show success message
    setShowPaymentModal(false);
    setEnrollmentMessage((prev) => ({
      ...prev,
      [selectedCourse._id]: { type: "success", message: "Successfully Enrolled!" },
    }));

    // Navigate to course after a short delay
    setTimeout(() => {
      navigate(`/student/course/${selectedCourse._id}`);
    }, 1500);
  };

  const handlePaymentError = (errorMessage) => {
    // Show error in enrollment message
    setEnrollmentMessage((prev) => ({
      ...prev,
      [selectedCourse?._id]: { type: "error", message: errorMessage },
    }));

    // Clear error after 5 seconds
    setTimeout(() => {
      if (selectedCourse) {
        setEnrollmentMessage((prev) => ({
          ...prev,
          [selectedCourse._id]: null,
        }));
      }
    }, 5000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading courses...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={fetchCourses}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <h1 className="text-3xl font-bold text-gray-900">All Courses</h1>
          <p className="text-gray-600 mt-2">
            Browse and enroll in our available courses
          </p>
        </div>
      </div>

      {/* Courses Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {courses.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-600 text-lg">
              No courses available at the moment.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <div
                key={course._id}
                className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition duration-300"
              >
                {/* Course Thumbnail */}
                <div className="relative h-48 bg-gray-200 overflow-hidden">
                  {course.thumbnail && !course.thumbnail.includes('localhost') ? (
                    <img
                      src={course.thumbnail}
                      alt={course.title}
                      className="w-full h-full object-cover hover:scale-105 transition duration-300"
                      onError={(e) => {
                        console.warn(`Failed to load course thumbnail: ${course.title}`, course.thumbnail);
                        e.target.style.display = 'none';
                        e.target.parentElement.innerHTML = '<div class="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-400 to-blue-600"><span class="text-white text-4xl">📚</span></div>';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-linear-to-br from-blue-400 to-blue-600">
                      <span className="text-white text-4xl">📚</span>
                    </div>
                  )}
                </div>

                {/* Course Content */}
                <div className="p-5">
                  {/* Title */}
                  <h3 className="text-lg font-bold text-gray-900 mb-2 line-clamp-2">
                    {course.title}
                  </h3>

                  {/* Description */}
                  <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                    {course.description}
                  </p>

                  {/* Instructor Name */}
                  <p className="text-sm text-gray-500 mb-3">
                    <span className="font-semibold">Instructor:</span>{" "}
                    {course.instructorName}
                  </p>

                  {/* Price */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="text-xl font-bold text-gray-900">
                      {course.price === 0 ? (
                        <span className="text-green-600">Free</span>
                      ) : (
                        <span>₹{course.price}</span>
                      )}
                    </div>
                  </div>

                  {/* Enrollment Message */}
                  {enrollmentMessage[course._id] && (
                    <div
                      className={`mb-3 p-3 rounded-lg text-sm font-semibold ${
                        enrollmentMessage[course._id].type === "success"
                          ? "bg-green-50 text-green-700 border border-green-200"
                          : "bg-red-50 text-red-700 border border-red-200"
                      }`}
                    >
                      {enrollmentMessage[course._id].message}
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="flex gap-2">
                    {course.isEnrolled ? (
                      <>
                        {/* Already Enrolled Badge */}
                        <div className="flex-1 bg-green-100 text-green-700 py-2 px-4 rounded-lg font-semibold text-center flex items-center justify-center">
                          ✓ Already Enrolled
                        </div>

                        {/* View Course Button */}
                        <button
                          onClick={() => handleViewCourse(course._id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition duration-200"
                        >
                          View Course
                        </button>
                      </>
                    ) : (
                      <>
                        {/* Enroll Now Button */}
                        <button
                          onClick={(e) => handleEnroll(course, e)}
                          disabled={selectedCourse?._id === course._id && showPaymentModal}
                          className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white py-2 px-4 rounded-lg font-semibold transition duration-200 disabled:cursor-not-allowed"
                        >
                          {selectedCourse?._id === course._id && showPaymentModal ? "Processing..." : "Enroll Now"}
                        </button>

                        {/* View Course Button */}
                        <button
                          onClick={() => handleViewCourse(course._id)}
                          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded-lg font-semibold transition duration-200"
                        >
                          View Course
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Payment Modal */}
      <PaymentModal
        course={selectedCourse}
        student={null}
        isOpen={showPaymentModal}
        onClose={() => setShowPaymentModal(false)}
        onPaymentSuccess={handlePaymentSuccess}
        onPaymentError={handlePaymentError}
      />
    </div>
  );
}
