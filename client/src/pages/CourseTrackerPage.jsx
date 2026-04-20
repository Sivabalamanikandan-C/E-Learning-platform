import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/CourseTrackerPage.css";

export default function CourseTrackerPage() {
  const navigate = useNavigate();
  const [enrolledCourses, setEnrolledCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all"); // all, completed, in-progress

  useEffect(() => {
    fetchCoursesData();
  }, []);

  const fetchCoursesData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      // Fetch enrolled courses
      const enrollmentsResponse = await axios.get(
        "http://localhost:5000/api/student/courses/enrolled",
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const courses = enrollmentsResponse.data.courses || enrollmentsResponse.data.enrolledCourses || [];
      setEnrolledCourses(courses);
      setError(null);
    } catch (err) {
      console.error("Error fetching courses data:", err);
      setError(err.response?.data?.message || "Failed to load tracker");
    } finally {
      setLoading(false);
    }
  };

  const filteredCourses = enrolledCourses.filter((course) => {
    const displayProgress = course.progress;
    if (filterStatus === "all") return true;
    if (filterStatus === "completed") return displayProgress >= 100;
    if (filterStatus === "in-progress") return displayProgress < 100;
    return true;
  });

  if (loading) {
    return (
      <div className="course-tracker-page">
        <div className="tracker-loading">
          <div className="spinner"></div>
          <p>Loading your course tracker...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="course-tracker-page">
        <div className="tracker-error">
          <p>⚠️ {error}</p>
          <button onClick={fetchCoursesData} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="course-tracker-page">
      {/* Header */}
      <div className="tracker-header">
        <h1>📊 Course Tracker</h1>
        <p className="tracker-subtitle">
          Track your progress across all enrolled courses
        </p>
      </div>

      {/* Filter Tabs */}
      {enrolledCourses.length > 0 && (
        <div className="tracker-filters">
          <button
            className={`filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All Courses ({enrolledCourses.length})
          </button>
          <button
            className={`filter-btn ${filterStatus === "in-progress" ? "active" : ""}`}
            onClick={() => setFilterStatus("in-progress")}
          >
            In Progress (
            {enrolledCourses.filter((c) => (c.displayProgress ?? c.progress) < 100).length})
          </button>
          <button
            className={`filter-btn ${filterStatus === "completed" ? "active" : ""}`}
            onClick={() => setFilterStatus("completed")}
          >
            Completed (
            {enrolledCourses.filter((c) => (c.displayProgress ?? c.progress) >= 100).length})
          </button>
        </div>
      )}

      {/* Courses List */}
      {filteredCourses.length === 0 ? (
        <div className="tracker-empty">
          <p>
            {enrolledCourses.length === 0
              ? "📚 You haven't enrolled in any courses yet."
              : `No ${filterStatus} courses found.`}
          </p>
        </div>
      ) : (
        <div className="courses-tracker-list">
          {filteredCourses.map((course) => {
            const progress = course.progressDetail;

            return (
              <div key={course._id} className="course-tracker-item">
                {/* Course Header */}
                <div className="tracker-item-header">
                  <div className="course-info-left">
                    <h3 className="course-name">{course.title}</h3>
                    <p className="course-instructor">
                      👨‍🏫 {course.instructorName}
                    </p>
                  </div>

                  <div className="course-info-right">
                    <div className="overall-progress">
                      <div className="progress-number">
                        {course.progress}%
                      </div>
                      <div className="status-text">
                        {course.status}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Visualization */}
                <div className="tracker-progress-bar">
                  <div className="bar-background">
                    <div
                      className="bar-fill"
                      style={{ width: `${course.progress}%` }}
                    ></div>
                  </div>
                </div>

                {/* Stats Grid */}
                {progress && (
                  <div className="tracker-stats-grid">
                    {/* Lectures */}
                    <div className="tracker-stat">
                      <div className="stat-icon">🎬</div>
                      <div className="stat-content">
                        <p className="stat-label">Lectures</p>
                        <p className="stat-value">
                          {progress.lectures.completed}/{progress.lectures.total}
                        </p>
                        <p className="stat-percentage">
                          {progress.lectures.percentage}%
                        </p>
                      </div>
                    </div>

                    {/* Quiz */}
                    <div className="tracker-stat">
                      <div className="stat-icon">
                        {progress.quiz.autoSubmitted
                          ? "⚠️"
                          : progress.quiz.completed
                            ? "✅"
                            : "📋"}
                      </div>

                      <div className="stat-content">
                        <p className="stat-label">Quiz</p>

                        <p
                          className="stat-value"
                          style={{
                            color: progress.quiz.autoSubmitted
                              ? "#dc2626"      // red for auto submit
                              : progress.quiz.completed
                                ? "#16a34a"      // green for completed (optional)
                                : "#f59e0b",     // orange for pending (optional)
                            fontWeight: progress.quiz.autoSubmitted ? "600" : "normal"
                          }}
                        >
                          {progress.quiz.autoSubmitted
                            ? "Auto Submitted due to inactivity"
                            : progress.quiz.completed
                              ? "Completed"
                              : "Pending"}
                        </p>

                        {(progress.quiz.completed || progress.quiz.autoSubmitted) && (
                          <p className="stat-percentage">
                            {`${progress.quiz.percentage}%`}
                          </p>
                        )}
                      </div>
                    </div>


                    {/* Assignments */}
                    <div className="tracker-stat">
                      <div className="stat-icon">✏️</div>
                      <div className="stat-content">
                        <p className="stat-label">Assignments</p>
                        <p className="stat-value">
                          {progress.assignments.submitted}/{progress.assignments.total}
                        </p>
                        <p className="stat-percentage">
                          {progress.assignments.percentage}%
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Action Button */}
                <div className="tracker-action">
                  <button
                    className="view-details-btn"
                    onClick={() => navigate(`/student/course-track/${course._id}`, { state: { course, progress: course.progressDetail } })}
                  >
                    View Detailed Track →
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
