import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import VideoPlayer from "../components/VideoPlayer";

export default function CourseDetails() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [enrolling, setEnrolling] = useState(false);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [completedLectures, setCompletedLectures] = useState([]);
  const [enrollmentError, setEnrollmentError] = useState(null);
  const [enrollmentSuccess, setEnrollmentSuccess] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(!!localStorage.getItem("token"));

  useEffect(() => {
    fetchCourseDetails();
    checkAccess();
  }, [courseId]);

  const fetchCompletedLectures = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setCompletedLectures([]);
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}/completed-lectures`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const completedIndices = response.data.completedLectures.map(
        (lecture) => lecture.lectureIndex
      );
      setCompletedLectures(completedIndices);
    } catch (err) {
      console.error("Error fetching completed lectures:", err);
      setCompletedLectures([]);
    }
  };

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}`
      );
      setCourse(response.data.course);
      if (response.data.course.lectures.length > 0) {
        setSelectedLecture(response.data.course.lectures[0]);
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching course details:", err);
      setError(err.response?.data?.message || "Failed to load course");
      setLoading(false);
    }
  };

  const checkAccess = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setHasAccess(false);
        setCompletedLectures([]);
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}/access`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setHasAccess(response.data.hasAccess);

      // Fetch completed lectures if user has access
      if (response.data.hasAccess) {
        fetchCompletedLectures();
      }
    } catch (err) {
      console.error("Error checking access:", err);
      setHasAccess(false);
      setCompletedLectures([]);
    }
  };

  const handleEnroll = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      setEnrolling(true);
      setEnrollmentError(null);
      
      const response = await axios.post(
        `http://localhost:5000/api/student/courses/${courseId}/enroll`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      // Enrollment successful
      setEnrollmentSuccess(true);
      setHasAccess(true);
      setEnrolling(false);
      
      // Fetch completed lectures after enrolling
      fetchCompletedLectures();
      
      // Clear success message after 3 seconds
      setTimeout(() => setEnrollmentSuccess(false), 3000);
      
      // Auto-scroll to video player
      setTimeout(() => {
        const videoContainer = document.querySelector('[class*="aspect-video"]');
        if (videoContainer) {
          videoContainer.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      }, 500);
    } catch (err) {
      console.error("Error enrolling in course:", err);
      setEnrolling(false);
      
      const errorMessage = err.response?.data?.message || 
        (err.response?.status === 400 ? "You are already enrolled in this course" : 
        "Failed to enroll in course. Please try again.");
      
      setEnrollmentError(errorMessage);
      
      // Clear error after 5 seconds
      setTimeout(() => setEnrollmentError(null), 5000);
    }
  };

  const handleLectureComplete = (lectureIndex) => {
    // Add lecture index to completed list
    if (!completedLectures.includes(lectureIndex)) {
      setCompletedLectures([...completedLectures, lectureIndex]);
    }
  };

  const handleVideoEnded = async () => {
    if (!hasAccess) return;

    // Get current lecture index
    const currentIndex = course.lectures.indexOf(selectedLecture);

    // Auto-mark current lecture as completed
    if (currentIndex >= 0 && !completedLectures.includes(currentIndex)) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `http://localhost:5000/api/student/courses/${courseId}/lectures/${currentIndex}/complete`,
          {},
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );

        // Update completed lectures list
        setCompletedLectures([...completedLectures, currentIndex]);
      } catch (err) {
        console.error("Error marking lecture as completed:", err);
      }
    }

    // Auto-play next lecture
    const nextIndex = currentIndex + 1;
    if (nextIndex < course.lectures.length) {
      setSelectedLecture(course.lectures[nextIndex]);
      // Auto-scroll to the selected lecture in the curriculum
      setTimeout(() => {
        const lectureElement = document.querySelector(
          `[data-lecture-index="${nextIndex}"]`
        );
        if (lectureElement) {
          lectureElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }, 100);
    } else {
      // All lectures completed
      console.log("Course completed! All lectures finished.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading course details...</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Course not found"}</p>
          <button
            onClick={() => navigate("/student/courses")}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Courses
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Course Header */}
      <div className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <button
            onClick={() => navigate("/student/courses")}
            className="text-blue-600 hover:text-blue-700 mb-4 flex items-center gap-2"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 19l-7-7 7-7"
              />
            </svg>
            Back to Courses
          </button>

          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            {course.title}
          </h1>
          {course.subtitle && (
            <p className="text-gray-600 text-lg mb-4">{course.subtitle}</p>
          )}

          {/* Course Meta Info */}
          <div className="flex flex-wrap gap-6 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-gray-600">👤 Instructor:</span>
              <span className="font-semibold text-gray-900">
                {course.instructor.name}
              </span>
            </div>
            {course.language && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">🌐 Language:</span>
                <span className="font-semibold text-gray-900">
                  {course.language}
                </span>
              </div>
            )}
            {course.level && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📊 Level:</span>
                <span className="font-semibold text-gray-900">
                  {course.level}
                </span>
              </div>
            )}
            {course.createdAt && (
              <div className="flex items-center gap-2">
                <span className="text-gray-600">📅 Created:</span>
                <span className="font-semibold text-gray-900">
                  {new Date(course.createdAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Section - Course Info */}
          <div className="lg:col-span-2">
            {/* Video Player */}
            <div className="mb-8">
              {selectedLecture && selectedLecture.videoUrl ? (
                <VideoPlayer
                  videoUrl={selectedLecture.videoUrl}
                  hasAccess={hasAccess}
                  lectureTitle={selectedLecture.title}
                  courseId={courseId}
                  lectureIndex={course.lectures.indexOf(selectedLecture)}
                  onLectureComplete={handleLectureComplete}
                  onVideoEnded={handleVideoEnded}
                />
              ) : (
                <div className="w-full bg-gray-200 rounded-lg aspect-video flex items-center justify-center">
                  <p className="text-gray-600">No video available</p>
                </div>
              )}
            </div>

            {/* Course Description */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                About This Course
              </h2>
              <p className="text-gray-700 leading-relaxed">
                {course.description}
              </p>
            </div>

            {/* What You'll Learn */}
            <div className="bg-white rounded-lg shadow-sm p-6 mb-8">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                What You'll Learn
              </h2>
              <ul className="space-y-3">
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold mt-1">✓</span>
                  <span className="text-gray-700">
                    Master core concepts and fundamentals
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold mt-1">✓</span>
                  <span className="text-gray-700">
                    Gain practical hands-on experience
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold mt-1">✓</span>
                  <span className="text-gray-700">
                    Learn from industry experts
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="text-green-500 font-bold mt-1">✓</span>
                  <span className="text-gray-700">
                    Complete interactive exercises and projects
                  </span>
                </li>
              </ul>
            </div>

            {/* Course Curriculum */}
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">
                Course Curriculum
              </h2>
              
              {/* Preview Message for Non-Enrolled Users */}
              {!hasAccess && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <p className="text-sm text-blue-900">
                    <span className="font-semibold">📚 Free Preview:</span> You can watch the first lecture as a free preview. Enroll in this course to unlock all {course.lectures?.length || 0} lectures and access the full curriculum.
                  </p>
                </div>
              )}
              
              {course.lectures && course.lectures.length > 0 ? (
                <div className="space-y-2">
                  {course.lectures.map((lecture, index) => {
                    const isLectureCompleted = completedLectures.includes(index);
                    return (
                      <div
                        key={index}
                        data-lecture-index={index}
                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                          selectedLecture?._id === lecture._id ||
                          (selectedLecture === null && index === 0)
                            ? "border-blue-500 bg-blue-50"
                            : isLectureCompleted
                            ? "border-green-300 bg-green-50 hover:border-green-400"
                            : "border-gray-200 hover:border-gray-300 bg-gray-50"
                        }`}
                        onClick={() => {
                          if (hasAccess || index === 0) {
                            setSelectedLecture(lecture);
                          }
                        }}
                      >
                        <div className="flex items-start gap-3">
                          {!hasAccess && index > 0 ? (
                            <svg
                              className="w-5 h-5 text-red-500 mt-1 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : isLectureCompleted ? (
                            <svg
                              className="w-5 h-5 text-green-600 mt-1 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path
                                fillRule="evenodd"
                                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                clipRule="evenodd"
                              />
                            </svg>
                          ) : (
                            <svg
                              className="w-5 h-5 text-blue-500 mt-1 shrink-0"
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M2 6a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V6zm13 2v4h2V8h-2z" />
                            </svg>
                          )}
                          <div className="flex-1">
                            <p
                              className={`font-semibold ${
                                isLectureCompleted
                                  ? "text-green-700"
                                  : "text-gray-900"
                              }`}
                            >
                              Lecture {index + 1}: {lecture.title}
                            </p>
                            {!hasAccess && index > 0 && (
                              <p className="text-xs text-red-600 mt-1 font-medium">
                                🔒 Enroll to unlock this lecture
                              </p>
                            )}
                            {hasAccess && index === 0 && !isLectureCompleted && (
                              <p className="text-xs text-blue-600 mt-1">
                                Free preview available
                              </p>
                            )}
                            {isLectureCompleted && (
                              <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                                Completed
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-gray-600">No lectures available</p>
              )}
            </div>

            {/* Quiz Section */}
            {course.quiz && (
              <div className="bg-white rounded-lg shadow-sm p-6 mt-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  Course Quiz
                </h2>
                <div className="space-y-4">
                  {/* Quiz Title */}
                  <div>
                    <p className="text-sm text-gray-600 font-semibold">
                      Quiz Title
                    </p>
                    <p className="text-lg font-semibold text-gray-900">
                      {course.quiz.title}
                    </p>
                  </div>

                  {/* Quiz Description */}
                  {course.quiz.description && (
                    <div>
                      <p className="text-sm text-gray-600 font-semibold">
                        Description
                      </p>
                      <p className="text-gray-700">{course.quiz.description}</p>
                    </div>
                  )}

                  {/* Quiz Details */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Time Limit */}
                    {course.quiz.timeLimit && (
                      <div>
                        <p className="text-sm text-gray-600 font-semibold">
                          Time Limit
                        </p>
                        <p className="text-gray-900">
                          {course.quiz.timeLimit} minutes
                        </p>
                      </div>
                    )}

                    {/* Number of Questions */}
                    {course.quiz.questions && (
                      <div>
                        <p className="text-sm text-gray-600 font-semibold">
                          Questions
                        </p>
                        <p className="text-gray-900">
                          {course.quiz.questions.length} questions
                        </p>
                      </div>
                    )}

                    {/* Available From */}
                    {course.quiz.availableFrom && (
                      <div>
                        <p className="text-sm text-gray-600 font-semibold">
                          Available From
                        </p>
                        <p className="text-gray-900">
                          {new Date(
                            course.quiz.availableFrom
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}

                    {/* Available Until */}
                    {course.quiz.availableUntil && (
                      <div>
                        <p className="text-sm text-gray-600 font-semibold">
                          Available Until
                        </p>
                        <p className="text-gray-900">
                          {new Date(
                            course.quiz.availableUntil
                          ).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Start Quiz Button */}
                  {hasAccess ? (
                    <button
                      onClick={() => navigate(`/student/course/${courseId}/quiz`)}
                      className="w-full bg-purple-600 text-white py-3 px-4 rounded-lg font-semibold hover:bg-purple-700 transition mt-4"
                    >
                      Start Quiz
                    </button>
                  ) : (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                      <p className="text-sm text-yellow-800">
                        🔒 Purchase the course to access the quiz
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Right Section - Course Card & Purchase */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6 sticky top-24">
              {/* Course Thumbnail */}
              <img
                src={course.thumbnail}
                alt={course.title}
                className="w-full h-48 object-cover rounded-lg mb-6"
              />

              {/* Price */}
              <div className="mb-6">
                <p className="text-gray-600 text-sm mb-2">Course Price</p>
                <p className="text-4xl font-bold text-gray-900">
                  {course.price === 0 ? (
                    <span className="text-green-600">Free</span>
                  ) : (
                    `₹${course.price}`
                  )}
                </p>
              </div>

              {/* Enrollment Success Message */}
              {enrollmentSuccess && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-green-800">✓ Successfully Enrolled!</p>
                  <p className="text-xs text-green-700 mt-1">You now have access to all lectures and course content.</p>
                </div>
              )}
              
              {/* Enrollment Error Message */}
              {enrollmentError && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                  <p className="text-sm font-semibold text-red-800">✗ Enrollment Failed</p>
                  <p className="text-xs text-red-700 mt-1">{enrollmentError}</p>
                </div>
              )}

              {/* Enroll/Purchase Button */}
              {!hasAccess ? (
                <button
                  onClick={handleEnroll}
                  disabled={enrolling}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-lg transition duration-200 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {enrolling ? "Enrolling..." : (course.price === 0 ? "Enroll Now" : `Buy Now - ₹${course.price}`)}
                </button>
              ) : (
                <div className="w-full bg-green-600 text-white font-semibold py-3 px-4 rounded-lg text-center">
                  ✓ Already Enrolled
                </div>
              )}

              {/* Course Stats */}
              <div className="space-y-3 border-t border-gray-200 pt-6">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Total Lectures</span>
                  <span className="font-semibold text-gray-900">
                    {course.lectures?.length || 0}
                  </span>
                </div>
                {course.level && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Level</span>
                    <span className="font-semibold text-gray-900">
                      {course.level}
                    </span>
                  </div>
                )}
                {course.category && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Category</span>
                    <span className="font-semibold text-gray-900">
                      {course.category}
                    </span>
                  </div>
                )}
              </div>

              {/* Features */}
              <div className="space-y-2 border-t border-gray-200 pt-6 mt-6">
                <p className="text-sm font-semibold text-gray-900 mb-3">
                  This course includes:
                </p>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Lifetime access</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Downloadable resources</span>
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <svg
                    className="w-4 h-4 text-green-600"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  <span>Certificate of completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
