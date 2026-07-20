import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/StudentDashboard.css";
import getDisplayProgress from "../utils/progress";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [stats, setStats] = useState({
    totalEnrolled: 0,
    completedCourses: 0,
    quizzesAttempted: 0,
    quizzesCompleted: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchStudentData();
  }, []);

  const fetchStudentData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("/api/student/courses/enrolled", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEnrolledCourses(response.data.courses || response.data.enrolledCourses || []);
      setStats({
        totalEnrolled: response.data.stats?.totalEnrolled || 0,
        completedCourses: response.data.stats?.completedCourses || 0,
        quizzesAttempted: response.data.stats?.quizzesAttempted || 0,
        quizzesCompleted: response.data.stats?.quizzesCompleted || 0,
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching student data:", err);
      setError(err.response?.data?.message || "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const handleContinueLearning = (courseId) => {
    navigate(`/student/course/${courseId}`);
  };

  if (loading) {
    return (
      <div className="dashboard-container">
        <div className="loading">Loading your dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-container">
        <div className="error">
          <p>{error}</p>
          <button onClick={fetchStudentData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      <section className="stats-section">
        <h2>Dashboard Statistics</h2>
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon total-enrolled">📚</div>
            <div className="stat-content">
              <p className="stat-label">Total Enrolled Courses</p>
              <p className="stat-value">{stats.totalEnrolled}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon completed-courses">✅</div>
            <div className="stat-content">
              <p className="stat-label">Completed Courses</p>
              <p className="stat-value">{stats.completedCourses}</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon quizzes-attempted">📋</div>
            <div className="stat-content">
              <p className="stat-label">Quizzes completed</p>
              <p className="stat-value">{stats.quizzesAttempted}</p>
            </div>
          </div>
          {/* <div className="stat-card">
            <div className="stat-icon quizzes-completed">🎓</div>
            <div className="stat-content">
              <p className="stat-label">Quizzes Completed</p>
              <p className="stat-value">{stats.quizzesCompleted}</p>
            </div>
          </div> */}
        </div>
      </section>
      <section className="courses-section">
        <h2>Your Enrolled Courses</h2>
        {enrolledCourses.length === 0 ? (
          <div className="no-courses">
            <p>📚 You haven't enrolled in any courses yet.</p>
            <p>Visit our course catalog to find and enroll in courses.</p>
          </div>
        ) : (
          <div className="courses-grid">
            {enrolledCourses.map((course) => {
              const progressValue = getDisplayProgress(course, course.progressData ?? null);
              return (
                <div key={course._id} className="course-card">
                  <div className="course-thumbnail">
                    {course.thumbnail && !course.thumbnail.includes("localhost") ? (
                      <img src={course.thumbnail} alt={course.title} />
                    ) : (
                      <div className="thumbnail-placeholder">
                        <span>📚</span>
                      </div>
                    )}
                    <div className="status-badge">
                      {course.status === "Completed" ? (
                        <span className="badge-completed">✓ Completed</span>
                      ) : (
                        <span className="badge-in-progress">In Progress</span>
                      )}
                    </div>
                  </div>
                  <div className="course-info">
                    <h3 className="course-title">{course.title}</h3>
                    <p className="instructor-name">👨‍🏫 {course.instructorName}</p>
                    <p className="course-description">{course.description}</p>
                    <div className="course-metadata">
                      <span className="course-category">{course.category || "General"}</span>
                      <span className="course-level">{course.level || "All Levels"}</span>
                    </div>
                    <div className="progress-section">
                      <div className="progress-header">
                        <span className="progress-label">Progress</span>
                        <span className="progress-percent">{progressValue}%</span>
                      </div>
                      <div className="progress-bar">
                        <div
                          className="progress-fill"
                          style={{ width: `${progressValue}%` }}
                        />
                      </div>
                      <p className="lectures-info">
                        {course.completedLectures || 0} of {course.totalLectures || 0} lectures completed
                      </p>
                    </div>
                    <button
                      className="continue-btn"
                      onClick={() => handleContinueLearning(course._id)}
                      style={{
                        marginTop: "1rem",
                        width: "100%",
                        padding: "0.75rem",
                        backgroundColor: progressValue >= 100 ? "#10b981" : "#4f46e5",
                        color: "white",
                        border: "none",
                        borderRadius: "0.5rem",
                        fontWeight: "600",
                        cursor: "pointer",
                      }}
                    >
                      {progressValue >= 100 ? "Review Course" : "Continue Learning"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
}