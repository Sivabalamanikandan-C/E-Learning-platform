import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { API_ENDPOINTS, TABS } from "./constants";
import { formatDate } from "./utils";
import "./CourseTrack.css";

export default function CourseTrack() {
  const { courseId } = useParams();
  const navigate = useNavigate();

  // State Management
  const [courseData, setCourseData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [lecturesList, setLecturesList] = useState([]);
  const [lecturesProgress, setLecturesProgress] = useState({});
  const [quizzesList, setQuizzesList] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.OVERVIEW);

  useEffect(() => {
    fetchCourseTrackData();
  }, [courseId]);

  const fetchCourseTrackData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch enrollment data which now includes unified progress and course details
      const enrollmentResponse = await axios.get(
        `http://localhost:5000/api/student/enrollments/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const course = enrollmentResponse.data.course;
      const raw = course.progressDetail || {};
      const overall = course.progress || 0;

      const p = {
        overallProgress: overall,
        displayProgress: overall,
        lectures: {
          completed: raw.lectures?.completed ?? 0,
          total: raw.lectures?.total ?? 0,
          percentage: raw.lectures?.percentage ?? 0,
        },
        assignments: {
          submitted: raw.assignments?.submitted ?? 0,
          total: raw.assignments?.total ?? 0,
          submissionPercentage: raw.assignments?.percentage ?? 0,
        },
        quiz: {
          hasQuiz: raw.quiz?.hasQuiz ?? !!course.quiz,
          completed: raw.quiz?.completed ?? false,
          autoSubmitted: raw.quiz?.autoSubmitted ?? false,
          percentage: raw.quiz?.percentage ?? 0,
          score: raw.quiz?.score ?? raw.quiz?.obtainedMarks ?? 0,
          totalPoints: raw.quiz?.totalPoints ?? raw.quiz?.totalMarks ?? 0,
          completionDate: raw.quiz?.completionDate ?? raw.quiz?.submittedAt ?? null,
        },
      };

      setCourseData(course);
      setProgressData(p);

      // Extract lectures from course
      if (course.lectures) {
        setLecturesList(course.lectures);
      }

      // Extract quizzes from course
      if (course.quiz) {
        setQuizzesList([course.quiz]);
      }

      // Fetch assignments for this course
      const assignmentsResponse = await axios.get(`http://localhost:5000/api/student/course/${courseId}/assignments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setAssignmentsList(assignmentsResponse.data.assignments || []);

      // Fetch detailed lecture progress
      const lectureProgressResponse = await axios.get(
        `http://localhost:5000/api/student/course/${courseId}/lectures-progress`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      setLecturesProgress(lectureProgressResponse.data.lecturesProgress || {});
      setError(null);
    } catch (err) {
      console.error("Error fetching course track data:", err);
      setError(err.response?.data?.message || "Failed to load course track data");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="course-track-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>Loading your course track...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-track-container">
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  if (!courseData || !progressData) {
    return (
      <div className="course-track-container">
        <div className="error-message">
          <p>Course data not found</p>
          <button onClick={() => navigate(-1)} className="back-btn">
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-track-container">
      {/* Header */}
      <div className="track-header">
        <button
          onClick={() => navigate(-1)}
          className="back-btn-header"
          title="Go back"
        >
          ← Back
        </button>
        <div className="header-content">
          <h1>{courseData.title}</h1>
          {/* <p className="instructor-info">
            👨‍🏫 By {courseData.instructor?.name || "Unknown Instructor"}
          </p> */}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button
          className={`tab-btn ${activeTab === TABS.OVERVIEW ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.OVERVIEW)}
        >
          📊 Overview
        </button>
        <button
          className={`tab-btn ${activeTab === TABS.LECTURES ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.LECTURES)}
        >
          🎬 Lectures
        </button>
        <button
          className={`tab-btn ${activeTab === TABS.QUIZZES ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.QUIZZES)}
        >
          📋 Quizzes
        </button>
        <button
          className={`tab-btn ${activeTab === TABS.ASSIGNMENTS ? "active" : ""}`}
          onClick={() => setActiveTab(TABS.ASSIGNMENTS)}
        >
          ✏️ Assignments
        </button>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {/* Overview Tab */}
        {activeTab === TABS.OVERVIEW && (
          <div className="overview-tab">
            {/* Course Summary Card */}
            <div className="summary-card">
              <h2>Course Overview</h2>

              <div className="summary-grid">
                {/* Overall Progress */}
                <div className="summary-item">
                  <h3>Overall Progress</h3>
                  <div className="large-progress">
                    <div className="progress-circle">
                      <svg viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="#e0e0e0"
                          strokeWidth="8"
                        />
                        <circle
                          cx="60"
                          cy="60"
                          r="54"
                          fill="none"
                          stroke="#667eea"
                          strokeWidth="8"
                          strokeDasharray={`${
                            (progressData.overallProgress / 100) * 339.29
                          } 339.29`}
                          strokeLinecap="round"
                          style={{
                            transform: "rotate(-90deg)",
                            transformOrigin: "60px 60px",
                            transition: "stroke-dasharray 0.5s ease",
                          }}
                        />
                        <text
                          x="60"
                          y="60"
                          textAnchor="middle"
                          dy=".3em"
                          fontSize="28"
                          fontWeight="700"
                          fill="#333"
                        >
                          {progressData.overallProgress}%
                        </text>
                      </svg>
                    </div>
                    <p className="progress-label">
                      {progressData.overallProgress >= 100
                        ? "Completed!"
                        : "In Progress"}
                    </p>
                  </div>
                </div>

                {/* Lecture Summary */}
                <div className="summary-item">
                  <h3>Lectures</h3>
                  <div className="summary-stat">
                    <div className="stat-number">
                      {progressData.lectures.completed}
                    </div>
                    <div className="stat-label">
                      of {progressData.lectures.total} completed
                    </div>
                    <div className="progress-bar-small">
                      <div
                        className="fill"
                        style={{
                          width: `${progressData.lectures.percentage}%`,
                        }}
                      ></div>
                    </div>
                    <p className="percentage">
                      {progressData.lectures.percentage}%
                    </p>
                  </div>
                </div>

                {/* Quiz Summary */}
                <div className="summary-item">
                  <h3>Quiz</h3>
                  <div className="summary-stat">
                    <div className="stat-status">
                      {progressData.quiz.autoSubmitted ? (
                        <span className="badge-warning">⚠ Auto Submitted due to inactivity</span>
                      ) : progressData.quiz.completed ? (
                        <span className="badge-success">✓ Completed</span>
                      ) : progressData.quiz.hasQuiz ? (
                        <span className="badge-warning">Not Attempted</span>
                      ) : (
                        <span className="badge-info">No Quiz</span>
                      )}
                    </div>
                    {progressData.quiz.completed && (
                      <div className="quiz-score">
                        <p>Score: {progressData.quiz.score || 0}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Assignment Summary */}
                <div className="summary-item">
                  <h3>Assignments</h3>
                  <div className="summary-stat">
                    <div className="stat-number">
                      {progressData.assignments.submitted}
                    </div>
                    <div className="stat-label">
                      of {progressData.assignments.total} submitted
                    </div>
                    <div className="progress-bar-small">
                      <div
                        className="fill"
                        style={{
                          width: `${progressData.assignments.submissionPercentage}%`,
                        }}
                      ></div>
                    </div>
                    <p className="percentage">
                      {progressData.assignments.submissionPercentage}%
                    </p>
                  </div>
                </div>
              </div>

              {/* Detailed Breakdown */}
              <div className="breakdown-section">
                <h3>Detailed Progress</h3>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span className="label">Lectures Completed:</span>
                    <span className="value">
                      {progressData.lectures.completed} /{" "}
                      {progressData.lectures.total}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Quiz Status:</span>
                    <span className="value">
                      {progressData.quiz.autoSubmitted
                        ? "Auto Submitted"
                        : progressData.quiz.completed
                        ? "Completed"
                        : progressData.quiz.hasQuiz
                        ? "Pending"
                        : "N/A"}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Assignments Submitted:</span>
                    <span className="value">
                      {progressData.assignments.submitted} /{" "}
                      {progressData.assignments.total}
                    </span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Overall Completion:</span>
                    <span className="value">
                      {progressData.overallProgress}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Lectures Tab */}
        {activeTab === TABS.LECTURES && (
          <div className="lectures-tab">
            <div className="tab-header">
              <h2>Lecture Progress</h2>
              <p className="stats">
                {progressData.lectures.completed} of{" "}
                {progressData.lectures.total} lectures completed
              </p>
            </div>

            {lecturesList.length === 0 ? (
              <div className="empty-state">
                <p>No lectures found</p>
              </div>
            ) : (
              <div className="lectures-list">
                {lecturesList.map((lecture, index) => {
                  const lectureProgressData = lecturesProgress[index];
                  const isCompleted = lectureProgressData?.isCompleted || false;
                  return (
                    <div
                      key={index}
                      className={`lecture-item ${
                        isCompleted ? "completed" : ""
                      }`}
                    >
                      <div className="lecture-number">
                        <span className="number">{index + 1}</span>
                      </div>
                      <div className="lecture-details">
                        <h4>{lecture.title || `Lecture ${index + 1}`}</h4>
                        <p className="status">
                          {isCompleted ? (
                            <span className="status-badge success">
                              ✓ Completed
                            </span>
                          ) : (
                            <span className="status-badge pending">
                              ⏳ Not Completed
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="lecture-action">
                        {lecture.freePreview && (
                          <span className="free-badge">FREE</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Quizzes Tab */}
        {activeTab === TABS.QUIZZES && (
          <div className="quizzes-tab">
            <div className="tab-header">
              <h2>Quiz Progress</h2>
              {progressData.quiz.hasQuiz ? (
                <p className="stats">
                  {progressData.quiz.autoSubmitted
                    ? "Quiz Auto Submitted"
                    : progressData.quiz.completed
                    ? "Quiz Completed"
                    : "Quiz Not Completed"}
                </p>
              ) : (
                <p className="stats">No quiz assigned</p>
              )}
            </div>

            {quizzesList.length === 0 ? (
              <div className="empty-state">
                <p>No quizzes found</p>
              </div>
            ) : (
              <div className="quizzes-list">
                {quizzesList.map((quiz, index) => (
                  <div
                    key={index}
                    className={`quiz-item ${
                      (progressData.quiz.completed || progressData.quiz.autoSubmitted) ? "completed" : ""
                    }`}
                  >
                    <div className="quiz-header-info">
                      <div className="quiz-title-section">
                        <h4>{quiz.title || "Course Quiz"}</h4>
                        <p className="quiz-description">
                          {quiz.description || "Test your knowledge"}
                        </p>
                      </div>
                      <div className="quiz-status">
                        {progressData.quiz.autoSubmitted ? (
                          <span className="status-badge warning">⚠ Auto Submitted</span>
                        ) : progressData.quiz.completed ? (
                          <span className="status-badge success">✓ Completed</span>
                        ) : (
                          <span className="status-badge pending">Not Completed</span>
                        )}
                      </div>
                    </div>

                    <div className="quiz-details">
                      <div className="detail-item">
                        <span className="label">Questions:</span>
                        <span className="value">
                          {quiz.questions?.length || 0}
                        </span>
                      </div>
                      <div className="detail-item">
                        <span className="label">Time Limit:</span>
                        <span className="value">
                          {quiz.timeLimit || "No Limit"} mins
                        </span>
                      </div>
                      {(progressData.quiz.completed || progressData.quiz.autoSubmitted) && (
                        <>
                          <div className="detail-item highlight">
                            <span className="label">Score:</span>
                            <span className="value">
                              {progressData.quiz.score || "0"} /{" "}
                              {progressData.quiz.totalPoints || "0"}
                            </span>
                          </div>
                          <div className="detail-item highlight">
                            <span className="label">Percentage:</span>
                            <span className="value">
                              {progressData.quiz.percentage || "0"}%
                            </span>
                          </div>
                          {progressData.quiz.completionDate && (
                            <div className="detail-item">
                              <span className="label">Completed:</span>
                              <span className="value">
                                {formatDate(progressData.quiz.completionDate)}
                              </span>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Assignments Tab */}
        {activeTab === TABS.ASSIGNMENTS && (
          <div className="assignments-tab">
            <div className="tab-header">
              <h2>Assignment Progress</h2>
              <p className="stats">
                {progressData.assignments.submitted} of{" "}
                {progressData.assignments.total} submitted
              </p>
            </div>

            {assignmentsList.length === 0 ? (
              <div className="empty-state">
                <p>No assignments found</p>
              </div>
            ) : (
              <div className="assignments-list">
                {assignmentsList.map((assignment) => {
                  const submission = assignment.submission;
                  const status = submission?.status || "not-submitted";
                  const isGraded = status === "graded";
                  const isSubmitted =
                    status === "submitted" || status === "graded";

                  return (
                    <div
                      key={assignment._id}
                      className={`assignment-item ${status}`}
                    >
                      <div className="assignment-header">
                        <h4>{assignment.title}</h4>
                        <div className="status-indicators">
                          <span className={`status-badge ${status}`}>
                            {status === "not-submitted" && "⏳ Not Submitted"}
                            {status === "submitted" && "📤 Submitted"}
                            {status === "graded" && "✅ Graded"}
                          </span>
                        </div>
                      </div>

                      <div className="assignment-meta">
                        <p className="instructions">
                          {assignment.instructions}
                        </p>
                      </div>

                      <div className="assignment-details">
                        <div className="detail-row">
                          <span className="label">Max Marks:</span>
                          <span className="value">{assignment.maxMarks}</span>
                        </div>
                        {assignment.dueDate && (
                          <div className="detail-row">
                            <span className="label">Due Date:</span>
                            <span className="value">
                              {formatDate(assignment.dueDate)}
                            </span>
                          </div>
                        )}
                        {isSubmitted && submission?.submissionDate && (
                          <div className="detail-row">
                            <span className="label">Submitted:</span>
                            <span className="value">
                              {formatDate(submission.submissionDate)}
                            </span>
                          </div>
                        )}
                        {isGraded && submission?.obtainedMarks !== null && (
                          <div className="detail-row highlight">
                            <span className="label">Marks Obtained:</span>
                            <span className="value">
                              {submission.obtainedMarks} /{" "}
                              {assignment.maxMarks}
                            </span>
                          </div>
                        )}
                        {submission?.feedback && (
                          <div className="detail-row feedback">
                            <span className="label">Feedback:</span>
                            <p className="feedback-text">
                              {submission.feedback}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
