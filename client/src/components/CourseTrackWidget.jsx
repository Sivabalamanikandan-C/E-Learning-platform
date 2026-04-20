import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function CourseTrackWidget({ courseId, courseName, instructorName }) {
  const navigate = useNavigate();
  const [progressData, setProgressData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchProgressData();
  }, [courseId]);

  const fetchProgressData = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://localhost:5000/api/student/enrollments/${courseId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      const detail = response.data.course.progressDetail;
      const overall = response.data.course.progress;
      
      setProgressData({ ...detail, overallProgress: overall, displayProgress: overall });
      setError(null);
    } catch (err) {
      console.error("Error fetching progress:", err);
      setError("Failed to load progress");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="course-track-widget">
        <div className="widget-loading">Loading...</div>
      </div>
    );
  }

  if (error || !progressData) {
    return null;
  }

  return (
    <div className="course-track-widget">
      <div className="widget-header">
        <div className="widget-title">
          <h4>{courseName}</h4>
          <p className="widget-instructor">By {instructorName}</p>
        </div>
        <button
          className="view-details-btn"
          onClick={() => navigate(`/student/course-track/${courseId}`)}
          title="View detailed track"
        >
          →
        </button>
      </div>

      <div className="widget-progress">
        <div className="progress-mini">
          <div className="progress-bar-mini">
            <div
              className="progress-fill-mini"
              style={{
                width: `${progressData.displayProgress ?? progressData.overallProgress ?? 0}%`,
              }}
            ></div>
          </div>
          <span className="progress-text">
            {progressData.displayProgress ?? progressData.overallProgress ?? 0}% completed
          </span>
        </div>
      </div>

      <div className="widget-stats">
        <div className="stat-item">
          <span className="stat-icon">🎬</span>
          <span className="stat-text">
            Lectures: {progressData.lectures.completed}/{progressData.lectures.total}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">
            {progressData.quiz.completed ? "✅" : "📋"}
          </span>
          <span className="stat-text">
            Quiz: {progressData.quiz.completed ? "Completed" : "Pending"}
          </span>
        </div>
        <div className="stat-item">
          <span className="stat-icon">✏️</span>
          <span className="stat-text">
            Assignments: {progressData.assignments.submitted}/{progressData.assignments.total}
          </span>
        </div>
      </div>
    </div>
  );
}
