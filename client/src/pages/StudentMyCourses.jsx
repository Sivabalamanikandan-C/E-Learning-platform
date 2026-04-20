import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/StudentMyCourses.css";

export default function StudentMyCourses() {
  const navigate = useNavigate();
  const { token, isAuthenticated, role } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all"); // all, in-progress, completed

  useEffect(() => {
    if (!isAuthenticated) {
      setLoading(false);
      return;
    }

    if (role && role !== "student") {
      setError("Access restricted to students");
      setLoading(false);
      return;
    }

    let cancelled = false;

    async function load() {
      try {
        setLoading(true);
        setError(null);
        console.log("🔍 Fetching enrolled courses with token:", token ? token.substring(0, 20) + "..." : "NO TOKEN");
        const res = await axios.get("/api/student/courses/enrolled", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("✅ Enrolled courses response:", res.data);
        const coursesList = res.data.courses || res.data.enrolledCourses || res.data.enrolled || [];
        console.log("✅ Courses list count:", coursesList.length);
        if (!cancelled) setCourses(coursesList);
      } catch (err) {
        console.error("❌ Error fetching enrolled courses:", err);
        console.error("Error details:", {
          status: err.response?.status,
          data: err.response?.data,
          message: err.message,
        });
        if (!cancelled) setError(err.response?.data?.message || err.message || "Failed to load courses");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, token, role]);

  const openCourse = (id) => navigate(`/student/course/${id}`);

  const filteredCourses = courses.filter((course) => {
    if (filterStatus === "all") return true;
    if (filterStatus === "in-progress") return course.status === "In Progress";
    if (filterStatus === "completed") return course.status === "Completed";
    return true;
  });

  if (loading) return <div className="smc-loading">Loading your courses...</div>;
  if (!isAuthenticated) return <div className="smc-empty">Please log in to see your courses.</div>;
  if (error) return <div className="smc-error">{error}</div>;

  const completedCount = courses.filter((c) => c.status === "Completed").length;
  const inProgressCount = courses.filter((c) => c.status === "In Progress").length;

  return (
    <div className="smc-page">
      <div className="smc-header">
        <h1>My Courses</h1>
        <p className="smc-sub">Your learning journey - {courses.length} course{courses.length !== 1 ? "s" : ""}</p>
      </div>

      {/* Stats Overview */}
      {courses.length > 0 && (
        <div className="smc-stats">
          <div className="smc-stat-card">
            <div className="smc-stat-number">{courses.length}</div>
            <div className="smc-stat-label">Total Enrolled</div>
          </div>
          <div className="smc-stat-card">
            <div className="smc-stat-number">{inProgressCount}</div>
            <div className="smc-stat-label">In Progress</div>
          </div>
          <div className="smc-stat-card">
            <div className="smc-stat-number">{completedCount}</div>
            <div className="smc-stat-label">Completed</div>
          </div>
        </div>
      )}

      {/* Filter Tabs */}
      {courses.length > 0 && (
        <div className="smc-filters">
          <button
            className={`smc-filter-btn ${filterStatus === "all" ? "active" : ""}`}
            onClick={() => setFilterStatus("all")}
          >
            All Courses ({courses.length})
          </button>
          <button
            className={`smc-filter-btn ${filterStatus === "in-progress" ? "active" : ""}`}
            onClick={() => setFilterStatus("in-progress")}
          >
            In Progress ({inProgressCount})
          </button>
          <button
            className={`smc-filter-btn ${filterStatus === "completed" ? "active" : ""}`}
            onClick={() => setFilterStatus("completed")}
          >
            Completed ({completedCount})
          </button>
        </div>
      )}

      {/* Courses Display */}
      {filteredCourses.length === 0 ? (
        <div className="smc-no">
          {courses.length === 0
            ? "You are not enrolled in any courses yet. Explore our course catalog to get started!"
            : `No ${filterStatus === "all" ? "" : filterStatus} courses found.`}
        </div>
      ) : (
        <div className="smc-grid">
          {filteredCourses.map((c) => (
            <div className="smc-card" key={c._id || c.id}>
              <div className="smc-card-header">
                <div
                  className="smc-thumb"
                  style={{
                    backgroundImage: `url(${(c.thumbnail || c.image) && !(c.thumbnail || c.image).includes('localhost')
                        ? (c.thumbnail || c.image)
                        : ''
                      })`,
                    backgroundColor: !(c.thumbnail || c.image) || (c.thumbnail || c.image).includes('localhost') ? '#667eea' : 'transparent'
                  }}
                  onClick={() => openCourse(c._id || c.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === "Enter" && openCourse(c._id || c.id)}
                  title={c.title || 'Course'}
                />
                <div className={`smc-status-badge ${c.status === "Completed" ? "completed" : "in-progress"}`}>
                  {c.status}
                </div>
              </div>

              <div className="smc-info">
                <h2 className="smc-title">{c.title}</h2>
                <p className="smc-instructor">by {c.instructorName}</p>
                <p className="smc-desc">{c.description?.slice(0, 100)}...</p>

                {/* Progress Bar */}
                {(() => {
                  const progressValue = c.status === "Completed" ? 100 : (c.displayProgress ?? c.progress ?? 0);

                  return (
                    <div className="smc-progress-section">
                      <div className="smc-progress-header">
                        <span className="smc-progress-label">Progress</span>
                        <span className="smc-progress-percentage">
                          {progressValue}%
                        </span>
                      </div>

                      <div className="smc-progress-bar">
                        <div
                          className="smc-progress-fill"
                          style={{ width: `${progressValue}%` }}
                        ></div>
                      </div>

                      <div className="smc-lecture-count">
                        {c.completedLectures} of {c.totalLectures} lectures completed
                      </div>
                    </div>
                  );
                })()}


                {/* Course Meta */}
                <div className="smc-meta">
                  <div className="smc-meta-item">
                    <span className="smc-meta-icon">📚</span>
                    <span className="smc-meta-text">{c.category}</span>
                  </div>
                  <div className="smc-meta-item">
                    <span className="smc-meta-icon">📊</span>
                    <span className="smc-meta-text">{c.level}</span>
                  </div>
                </div>

                <button className="smc-cta" onClick={() => openCourse(c._id || c.id)}>
                  {c.status === "Completed" ? "Review Course" : "Continue Learning"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
