import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Announcements.css";

const CreateAnnouncement = ({ onAnnouncementCreated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    // Default to the most important type for instructors
    type: "Important Notice",
    courses: [],
    // Send to all courses by default for instructor convenience
    isAllCourses: true,
    // Empty means send immediately
    scheduledDate: "",
    // Default to Draft (server accepts: Draft, Scheduled, Sent)
    status: "Draft",
  });

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Announcement type removed from form UI per request; default `type` remains in state

  useEffect(() => {
    fetchInstructorCourses();
  }, []);

  const fetchInstructorCourses = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/instructor/courses", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCourses(response.data.courses || response.data);
    } catch (err) {
      console.error("Error fetching courses:", err);
      setError("Failed to load courses");
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === "checkbox" ? checked : value,
    });
  };

  const handleCourseSelect = (courseId) => {
    setFormData((prev) => {
      const isSelected = prev.courses.includes(courseId);
      return {
        ...prev,
        courses: isSelected
          ? prev.courses.filter((id) => id !== courseId)
          : [...prev.courses, courseId],
      };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      if (!formData.title.trim() || !formData.message.trim()) {
        setError("Title and message are required");
        setLoading(false);
        return;
      }

      if (!formData.isAllCourses && formData.courses.length === 0) {
        setError("Please select at least one course or select all courses");
        setLoading(false);
        return;
      }

      const token = localStorage.getItem("token");
      const response = await axios.post("http://localhost:5000/api/instructor/announcements", formData, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setFormData({
        title: "",
        message: "",
        type: "Course Update",
        courses: [],
        isAllCourses: false,
        scheduledDate: "",
        status: "Draft",
      });

      if (onAnnouncementCreated) {
        onAnnouncementCreated(response.data.announcement);
      }
    } catch (err) {
      console.error("Error creating announcement:", err);
      setError(err.response?.data?.message || "Failed to create announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-announcement">
      <h2>Create New Announcement</h2>

      {error && <div className="error-message">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label htmlFor="title">Title *</label>
          <input
            type="text"
            id="title"
            name="title"
            value={formData.title}
            onChange={handleChange}
            placeholder="Enter announcement title"
            required
          />
        </div>

        {/* Announcement Type removed from form - using default `type` in state */}

        <div className="form-group">
          <label htmlFor="message">Message *</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            placeholder="Enter announcement message"
            rows="6"
            required
          />
        </div>

        <div className="form-group">
          <label>
            <input
              type="checkbox"
              name="isAllCourses"
              checked={formData.isAllCourses}
              onChange={handleChange}
            />
            Send to all my courses
          </label>
        </div>

        {!formData.isAllCourses && (
          <div className="form-group">
            <label>Select Courses</label>
            <div className="courses-list">
              {courses.length > 0 ? (
                courses.map((course) => (
                  <div key={course._id} className="course-item">
                    <input
                      type="checkbox"
                      id={`course-${course._id}`}
                      checked={formData.courses.includes(course._id)}
                      onChange={() => handleCourseSelect(course._id)}
                    />
                    <label htmlFor={`course-${course._id}`}>{course.title}</label>
                  </div>
                ))
              ) : (
                <p className="no-courses">No courses available</p>
              )}
            </div>
          </div>
        )}

        <div className="form-group">
          <label htmlFor="scheduledDate">Schedule Date & Time (Optional)</label>
          <input
            type="datetime-local"
            id="scheduledDate"
            name="scheduledDate"
            value={formData.scheduledDate}
            onChange={handleChange}
          />
          <small>Leave empty to send immediately</small>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Creating..." : "Create Announcement"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateAnnouncement;
