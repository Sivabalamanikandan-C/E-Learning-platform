import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import VideoPlayer from "../components/VideoPlayer";
import PaymentModal from "../components/PaymentModal";
import StudentAskQuestions from "../components/StudentAskQuestions";
import "../styles/StudentCourse.css";

export default function StudentCourse() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const auth = useAuth();

  // State Management
  const [course, setCourse] = useState(null);
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [completedLectures, setCompletedLectures] = useState([]);
  const [courseProgress, setCourseProgress] = useState(0);
  const [quizCompleted, setQuizCompleted] = useState(false);
  const [quizAutoSubmitted, setQuizAutoSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState("curriculum");
  const [notes, setNotes] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [instructorProfile, setInstructorProfile] = useState(null);
  const [loadingInstructor, setLoadingInstructor] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    if (!auth.isAuthenticated) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      const courseData = await fetchCourseDetails();
      if (courseData) {
        await checkAccess(courseData);
      }
      setLoading(false);
    };

    loadData();
  }, [courseId, auth.isAuthenticated]);

  // Set initial lecture from state or first lecture
  useEffect(() => {
    if (course && course.lectures && course.lectures.length > 0) {
      const initialLectureIndex = location.state?.lectureIndex || 0;
      setSelectedLecture(course.lectures[initialLectureIndex]);
    }
  }, [course]);

  // Derived display progress: prefer server/computed `courseProgress`, but if course status is Completed show 100
  const displayProgress = course?.status === "Completed" ? 100 : courseProgress;

  // Fetch course details
  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}`
      );
      setCourse(response.data.course);

      // Fetch instructor profile if instructor ID exists
      if (response.data.course.instructor?._id) {
        fetchInstructorProfile(response.data.course.instructor._id);
      }

      return response.data.course;
    } catch (err) {
      console.error("Error fetching course details:", err);
      setError(err.response?.data?.message || "Failed to load course");
      return null;
    }
  };

  // Fetch instructor profile
  const fetchInstructorProfile = async (instructorId) => {
    try {
      setLoadingInstructor(true);
      const response = await axios.get(
        `http://localhost:5000/api/instructor/${instructorId}/profile`
      );
      setInstructorProfile(response.data);
    } catch (err) {
      console.error("Error fetching instructor profile:", err);
      setInstructorProfile(null);
    } finally {
      setLoadingInstructor(false);
    }
  };

  // Fetch course progress from backend to ensure consistency
  const fetchProgress = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/student/enrollments/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.data && response.data.course) {
        setCourseProgress(response.data.course.progress || 0);
      }
    } catch (err) {
      console.error("Error fetching progress:", err);
    }
  };

  // Check course access and fetch progress
  const checkAccess = async (courseData) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        setHasAccess(false);
        return;
      }

      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}/access`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setHasAccess(response.data.hasAccess);

      if (response.data.hasAccess) {
        await Promise.all([
          fetchCompletedLectures(courseData),
          fetchQuizCompletion(),
          fetchNotes(),
          fetchAssignments(),
          fetchProgress(),
        ]);
      }
    } catch (err) {
      console.error("Error checking access:", err);
      setHasAccess(false);
    }
  };

  // Fetch completed lectures
  const fetchCompletedLectures = async (courseData = null) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}/completed-lectures`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const completedIndices = response.data.completedLectures.map(
        (lecture) => lecture.lectureIndex
      );
      setCompletedLectures(completedIndices);

      // progress recalculation handled by effect that includes quiz
    } catch (err) {
      console.error("Error fetching completed lectures:", err);
    }
  };

  // Fetch whether student completed the quiz for this course
  const fetchQuizCompletion = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/quiz/${courseId}/my-submissions`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const submissions = response.data || [];
      if (submissions.length > 0) {
        // API returns submissions sorted by date descending, so the first one is the latest.
        const latestSubmission = submissions[0];
        setQuizCompleted(true);
        setQuizAutoSubmitted(latestSubmission.autoSubmitted === true);
      } else {
        setQuizCompleted(false);
        setQuizAutoSubmitted(false);
      }
    } catch (err) {
      console.error("Error fetching quiz submissions:", err);
      setQuizCompleted(false);
      setQuizAutoSubmitted(false);
    }
  };

  // Fetch notes for current lecture
  const fetchNotes = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}/notes`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setNotes(response.data.notes || []);
    } catch (err) {
      console.error("Error fetching notes:", err);
    }
  };

  // Fetch assignments for this course (student view)
  const fetchAssignments = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/student/course/${courseId}/assignments`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setAssignmentsList(response.data.assignments || []);
    } catch (err) {
      console.error("Error fetching assignments:", err);
      setAssignmentsList([]);
    }
  };

  // Handle enrollment - Open payment modal
  const handleEnroll = () => {
    if (!auth.isAuthenticated) {
      navigate("/login");
      return;
    }
    setShowPaymentModal(true);
  };

  // Handle successful payment
  const handlePaymentSuccess = async (enrollment) => {
    setHasAccess(true);
    setError(null);

    // Refresh course access and data
    await Promise.all([
      fetchCompletedLectures(),
      fetchQuizCompletion(),
      fetchNotes(),
      fetchProgress(),
    ]);

    // Show success message
    const successMessage = "Payment successful! You are now enrolled in this course.";
    alert(successMessage);
  };

  // Handle payment error
  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
  };

  // Save note
  const handleSaveNote = async () => {
    if (!newNote.trim() || !selectedLecture) return;

    setIsSavingNote(true);
    try {
      const token = localStorage.getItem("token");
      const currentIndex = course.lectures.indexOf(selectedLecture);

      await axios.post(
        `http://localhost:5000/api/student/courses/${courseId}/notes`,
        {
          lectureIndex: currentIndex,
          lectureTitle: selectedLecture.title,
          content: newNote,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setNewNote("");
      await fetchNotes();
    } catch (err) {
      console.error("Error saving note:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  // Delete note
  const handleDeleteNote = async (noteId) => {
    try {
      const token = localStorage.getItem("token");
      await axios.delete(
        `http://localhost:5000/api/student/courses/${courseId}/notes/${noteId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchNotes();
    } catch (err) {
      console.error("Error deleting note:", err);
    }
  };

  // Handle lecture selection
  const handleSelectLecture = (lecture, index) => {
    // Allow viewing first lecture (free preview) or if enrolled
    if (hasAccess || index === 0) {
      setSelectedLecture(lecture);
    }
  };

  // Handle video ended
  const handleVideoEnded = async () => {
    if (!hasAccess) return;

    const currentIndex = course.lectures.indexOf(selectedLecture);
    if (currentIndex >= 0 && !completedLectures.includes(currentIndex)) {
      try {
        const token = localStorage.getItem("token");
        await axios.post(
          `http://localhost:5000/api/student/courses/${courseId}/lectures/${currentIndex}/complete`,
          {},
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        const newCompleted = [...completedLectures, currentIndex];

        setCompletedLectures(newCompleted);

        // Update progress from backend
        fetchProgress();

        // Auto-play next lecture
        if (currentIndex + 1 < course.lectures.length) {
          setSelectedLecture(course.lectures[currentIndex + 1]);
        }
      } catch (err) {
        console.error("Error marking lecture as completed:", err);
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="student-course-loading">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading course...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (error || !course) {
    return (
      <div className="student-course-error">
        <div className="error-container">
          <h2>⚠️ Error Loading Course</h2>
          <p>{error || "Course not found"}</p>
          <button
            onClick={() => navigate("/student")}
            className="error-back-btn"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  // Get current lecture index
  const currentLectureIndex = selectedLecture
    ? course.lectures.indexOf(selectedLecture)
    : 0;
  const currentLectureNotes = notes.filter(
    (note) => note.lectureIndex === currentLectureIndex
  );

  // Progress display including quiz as one item
  const quizCount = course.quiz ? 1 : 0;
  const completedCountDisplay = (completedLectures?.length || 0) + (quizCompleted ? 1 : 0);
  const totalItems = (course.lectures?.length || 0) + quizCount;
  // Check if all lectures are completed
  const totalLectures = course.lectures?.length || 0;
  const allLecturesCompleted = totalLectures > 0 && completedLectures.length === totalLectures;

  return (
    <div className="student-course">
      {/* Header */}
      <header className="student-course-header">
        <div className="course-header-content">
          <button
            onClick={() => navigate("/student")}
            className="back-button"
          >
            ← Back to Dashboard
          </button>
          <div className="course-header-title">
            <h1>{course.title}</h1>
            <span className="course-status">
              {displayProgress === 100 ? "✓ Completed" : `${displayProgress}% Complete`}
            </span>
          </div>
          <button
            className="sidebar-toggle"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
        </div>

        {/* Progress Bar */}
        <div className="course-progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${displayProgress}%` }}
          ></div>
        </div>
      </header>

      {/* Main Content */}
      <div className="student-course-container">
        {/* Main Video Section */}
        <main className="student-course-main">
          {/* Video Player */}
          <div className="video-section">
            {selectedLecture && selectedLecture.videoUrl ? (
              <VideoPlayer
                videoUrl={selectedLecture.videoUrl}
                hasAccess={hasAccess}
                lectureTitle={selectedLecture.title}
                courseId={courseId}
                lectureIndex={currentLectureIndex}
                onVideoEnded={handleVideoEnded}
              />
            ) : (
              <div className="video-unavailable">
                <p>📹 No video available</p>
              </div>
            )}
          </div>

          {/* Lecture Info */}
          <div className="lecture-info">
            <h2>Lecture {currentLectureIndex + 1}: {selectedLecture?.title}</h2>
            {selectedLecture?.freePreview && (
              <span className="free-badge">🎓 Free Preview</span>
            )}
          </div>

          {/* Tabs */}
          <div className="tabs-container">
            <div className="tabs-header">
              <button
                className={`tab-button ${activeTab === "curriculum" ? "active" : ""}`}
                onClick={() => setActiveTab("curriculum")}
              >
                📚 Curriculum
              </button>
              <button
                className={`tab-button ${activeTab === "questions" ? "active" : ""}`}
                onClick={() => setActiveTab("questions")}
              >
                💬 Ask Questions
              </button>
              <button
                className={`tab-button ${activeTab === "details" ? "active" : ""}`}
                onClick={() => setActiveTab("details")}
              >
                ℹ️ Contact and Details
              </button>
            </div>

            {/* Curriculum Tab */}
            {activeTab === "curriculum" && (
              <div className="tab-content curriculum-tab">
                <div className="curriculum-list">
                  {course.lectures && course.lectures.length > 0 ? (
                    course.lectures.map((lecture, index) => {
                      const isCompleted = completedLectures.includes(index);
                      const isCurrent =
                        selectedLecture?._id === lecture._id ||
                        (selectedLecture === null && index === 0);

                      return (
                        <div
                          key={index}
                          className={`lecture-item ${isCurrent ? "active" : ""} ${isCompleted ? "completed" : ""
                            }`}
                          onClick={() => handleSelectLecture(lecture)}
                          data-lecture-index={index}
                        >
                          <div className="lecture-item-left">
                            {isCompleted ? (
                              <span className="lecture-icon completed">✓</span>
                            ) : isCurrent ? (
                              <span className="lecture-icon current">▶</span>
                            ) : (
                              <span className="lecture-icon">📹</span>
                            )}
                            <div className="lecture-details">
                              <p className="lecture-number">
                                Lecture {index + 1}
                              </p>
                              <p className="lecture-title">{lecture.title}</p>
                              {lecture.freePreview && (
                                <span className="free-badge-small">
                                  Free Preview
                                </span>
                              )}
                            </div>
                          </div>
                          {isCompleted && (
                            <span className="completed-check">✓</span>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-content">No lectures available</p>
                  )}
                </div>

                {/* Quiz Section */}
                {course.quiz && (
                  <div className="quiz-section">
                    <h3>📝 Course Quiz</h3>
                    <div style={{ lineHeight: "210%" }}>
                      <p>
                        <strong>Title:</strong> {course.quiz.title}
                      </p>
                      {course.quiz.description && (
                        <p>
                          <strong>Description:</strong> {course.quiz.description}
                        </p>
                      )}
                      {course.quiz.timeLimit && (
                        <p>
                          <strong>Time Limit:</strong> {course.quiz.timeLimit}{" "}
                          minutes
                        </p>
                      )}
                      {course.quiz.questions && (
                        <p>
                          <strong>Questions:</strong>{" "}
                          {course.quiz.questions.length}
                        </p>
                      )}
                    </div>
                    {hasAccess && (
                      <>
                        <button
                          onClick={() => {
                            if (quizCompleted) {
                              navigate(`/student/course/${courseId}/quiz-results`);
                            } else {
                              navigate(`/student/course/${courseId}/quiz`);
                            }
                          }}
                          className="quiz-button"
                          disabled={!quizCompleted && !allLecturesCompleted}
                        >
                          {quizCompleted ? "View Result" : "Start Quiz"}
                        </button>
                        {quizCompleted && (
                          <p style={{ marginTop: "10px", color: "#666", fontSize: "14px" }}>
                            📌 You have already completed this quiz. Each student can submit only once.
                          </p>
                        )}
                        {!allLecturesCompleted && !quizCompleted && (
                          <p style={{ marginTop: "10px", color: "#ff6b6b", fontSize: "14px" }}>
                            🔒 Complete all lectures to unlock the quiz
                          </p>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Ask Questions Tab */}
            {activeTab === "questions" && (
              <div className="tab-content questions-tab">
                <StudentAskQuestions
                  courseId={courseId}
                  lectureIndex={currentLectureIndex}
                  lectureTitle={selectedLecture?.title}
                  hasAccess={hasAccess}
                />
              </div>
            )}

            {/* Details Tab */}
            {activeTab === "details" && (
              <div className="tab-content details-tab">
                <div className="course-details-grid">
                  <div className="detail-item">
                    <span className="detail-label">Instructor</span>
                    <span className="detail-value">
                      {instructorProfile.name || "Unknown"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Total Lectures</span>
                    <span className="detail-value">
                      {course.lectures?.length || 0}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Level</span>
                    <span className="detail-value">
                      {course.level || "Not specified"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Category</span>
                    <span className="detail-value">
                      {course.category || "Not specified"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Language</span>
                    <span className="detail-value">
                      {course.language || "Not specified"}
                    </span>
                  </div>
                  <div className="detail-item">
                    <span className="detail-label">Your Progress</span>
                    <span className="detail-value">
                      {completedCountDisplay}/{totalItems}
                    </span>
                  </div>
                </div>

                {/* Instructor Profile Section */}
                {instructorProfile && (
                  <div className="instructor-profile-section">
                    <h3>About the Instructor</h3>
                    <div className="instructor-profile-card">
                      {/* Profile Picture */}
                      <div className="instructor-picture-wrapper">
                        {instructorProfile.profilePicture ? (
                          <img
                            src={instructorProfile.profilePicture}
                            alt={instructorProfile.name}
                            className="instructor-picture"
                          />
                        ) : (
                          <div className="instructor-picture-placeholder">
                            👨‍🏫
                          </div>
                        )}
                      </div>

                      {/* Instructor Info */}
                      <div className="instructor-info">
                        <h4>{instructorProfile.name}</h4>
                        <p className="instructor-bio">
                          {instructorProfile.bio || "No bio available"}
                        </p>

                        {/* Experience */}
                        {instructorProfile.experience > 0 && (
                          <div className="instructor-detail">
                            <span className="label">Experience:</span>
                            <span className="value">
                              {instructorProfile.experience} year{instructorProfile.experience !== 1 ? 's' : ''}
                            </span>
                          </div>
                        )}

                        {/* Skills */}
                        {instructorProfile.skills && instructorProfile.skills.length > 0 && (
                          <div className="instructor-detail">
                            <span className="label">Skills:</span>
                            <div className="instructor-tags">
                              {instructorProfile.skills.map((skill, idx) => (
                                <span key={idx} className="tag skill-tag">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Teaching Categories */}
                        {instructorProfile.categories && instructorProfile.categories.length > 0 && (
                          <div className="instructor-detail">
                            <span className="label">Teaches:</span>
                            <div className="instructor-tags">
                              {instructorProfile.categories.map((category, idx) => (
                                <span key={idx} className="tag category-tag">
                                  {category}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Social Links */}
                        {instructorProfile.socialLinks && (
                          <div className="instructor-social-links">
                            {instructorProfile.socialLinks.linkedin && (
                              <a
                                href={instructorProfile.socialLinks.linkedin}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link linkedin"
                                title="LinkedIn"
                              >
                                🔗 LinkedIn
                              </a>
                            )}
                            {instructorProfile.socialLinks.github && (
                              <a
                                href={instructorProfile.socialLinks.github}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link github"
                                title="GitHub"
                              >
                                💻 GitHub
                              </a>
                            )}
                            {instructorProfile.socialLinks.portfolio && (
                              <a
                                href={instructorProfile.socialLinks.portfolio}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="social-link portfolio"
                                title="Portfolio"
                              >
                                🌐 Portfolio
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Description */}
                <div className="course-description-section">
                  <h3>About This Course</h3>
                  <p>{course.description || "No description available"}</p>
                </div>

                {/* Enrollment Status */}
                {/* {!hasAccess && (
                  <div className="enrollment-section">
                    <h3>Interested in this course?</h3>
                    <p>Price: {course.price === 0 ? "Free" : `₹${course.price}`}</p>
                    <button
                      onClick={handleEnroll}
                      className="enroll-btn"
                    >
                      Enroll Now
                    </button>
                  </div>
                )} */}

                {/* Payment Modal */}
                <PaymentModal
                  course={course}
                  student={auth.user}
                  isOpen={showPaymentModal}
                  onClose={() => setShowPaymentModal(false)}
                  onPaymentSuccess={handlePaymentSuccess}
                  onPaymentError={handlePaymentError}
                />
              </div>
            )}
          </div>
        </main>

        {/* Sidebar */}
        <aside className={`student-course-sidebar ${sidebarOpen ? "open" : ""}`}>
          <div className="sidebar-header">
            <h3>Course Curriculum</h3>
            <button
              className="sidebar-close"
              onClick={() => setSidebarOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="sidebar-content">
            {/* Progress Summary */}
            <div className="progress-summary">
              <div className="progress-stat">
                <p className="stat-label">Completed</p>
                <p className="stat-value">
                  {completedCountDisplay}/{totalItems}
                </p>
              </div>
              <div className="progress-stat">
                <p className="stat-label">Progress</p>
                <p className="stat-value">{displayProgress}%</p>
              </div>
            </div>

            {/* Lectures List */}
            <div className="sidebar-lectures">
              {course.lectures && course.lectures.length > 0 ? (
                course.lectures.map((lecture, index) => {
                  const isCompleted = completedLectures.includes(index);
                  const isCurrent =
                    selectedLecture?._id === lecture._id ||
                    (selectedLecture === null && index === 0);
                  const isLocked = !hasAccess && index !== 0; // Lock all except first lecture

                  return (
                    <div
                      key={index}
                      className={`sidebar-lecture ${isCurrent ? "active" : ""} ${isCompleted ? "completed" : ""
                        } ${isLocked ? "locked" : ""}`}
                      onClick={() => {
                        handleSelectLecture(lecture, index);
                        setSidebarOpen(false);
                      }}
                    >
                      <div className="sidebar-lecture-icon">
                        {isCompleted ? "✓" : index + 1}
                      </div>
                      <p className="sidebar-lecture-title">{lecture.title}</p>
                    </div>
                  );
                })
              ) : (
                <p className="no-lectures">No lectures available</p>
              )}
            </div>

            {/* Quiz Item */}
            {course.quiz && (
              <div className="sidebar-quiz">
                <div
                  className={`sidebar-quiz-item ${quizCompleted ? "completed" : ""} ${!allLecturesCompleted ? "disabled" : ""}`}
                  onClick={() => {
                    if (hasAccess && allLecturesCompleted) {
                      navigate(`/student/course/${courseId}/quiz`);
                      setSidebarOpen(false);
                    }
                  }}
                  style={{ cursor: hasAccess && allLecturesCompleted ? "pointer" : "not-allowed", opacity: hasAccess && allLecturesCompleted ? 1 : 0.6 }}
                  title={!allLecturesCompleted ? `Complete all ${totalLectures} lectures to unlock quiz` : ""}
                >
                  <div className="sidebar-quiz-icon">
                    {quizCompleted ? "✓" : !allLecturesCompleted ? "🔒" : "📋"}
                  </div>
                  <div className="sidebar-quiz-content">
                    <p className="sidebar-quiz-title">Quiz <br />{course.quiz.title || "Final Quiz"}</p>
                    {!allLecturesCompleted && (
                      <p className="sidebar-quiz-info" style={{ color: "#ff6b6b" }}>Complete {totalLectures - completedLectures.length} more lectures</p>
                    )}
                    {allLecturesCompleted && course.quiz.questions && (
                      <p className="sidebar-quiz-info">{course.quiz.questions.length} questions</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Assignments Item(s) - shown after quiz */}
            {/* {assignmentsList && assignmentsList.length > 0 && (
              <div className="sidebar-assignments">
                <h4 style={{ marginTop: 12, marginBottom: 8 }}>📝 Assignments</h4>
                {assignmentsList.map((assignment) => {
                  const submitted = assignment.submission && (assignment.submission.status === "submitted" || assignment.submission.status === "graded");
                  return (
                    <div
                      key={assignment._id}
                      className={`sidebar-assignment-item ${submitted ? "completed" : ""}`}
                      onClick={() => {
                        if (hasAccess) {
                          navigate(`/student/course/${courseId}/assignments`);
                          setSidebarOpen(false);
                        }
                      }}
                      style={{ cursor: hasAccess ? "pointer" : "not-allowed", opacity: hasAccess ? 1 : 0.6 }}
                    >
                      <div className="sidebar-assignment-icon">
                        {submitted ? "✓" : "📝"}
                      </div>
                      <div className="sidebar-assignment-content">
                        <p className="sidebar-assignment-title">{assignment.title || "Untitled Assignment"}</p>
                        <p className="sidebar-assignment-info">Max Marks: {assignment.maxMarks || "N/A"}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )} */}

            {/* Assignments Item(s) - shown after quiz */}
            {assignmentsList && assignmentsList.length > 0 && (
              <div className="sidebar-assignments">
                <h4 style={{ marginTop: 12, marginBottom: 8 }}>📝 Assignments</h4>

                {assignmentsList.map((assignment) => {
                  const submitted =
                    assignment.submission &&
                    (assignment.submission.status === "submitted" ||
                      assignment.submission.status === "graded");

                  return (
                    <div
                      key={assignment._id}
                      className={`sidebar-assignment-item ${submitted ? "completed" : ""}`}
                      style={{
                        pointerEvents: "none",   // completely disables clicking
                        cursor: "default",
                        opacity: 0.85
                      }}
                    >
                      <div className="sidebar-assignment-icon">
                        {submitted ? "✓" : "📝"}
                      </div>

                      <div className="sidebar-assignment-content">
                        <p className="sidebar-assignment-title">
                          {assignment.title || "Untitled Assignment"}
                        </p>

                        <p className="sidebar-assignment-info">
                          Max Marks: {assignment.maxMarks || "N/A"}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
