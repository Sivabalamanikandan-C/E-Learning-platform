import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Announcements.css";

const EditAnnouncement = ({ announcement, onAnnouncementUpdated, onCancel }) => {
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    courses: [],
    isAllCourses: false,
    scheduledDate: "",
  });

  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchInstructorCourses();
    if (announcement) {
      setFormData({
        title: announcement.title,
        message: announcement.message,
        courses: announcement.courses?.map((c) => c._id) || [],
        isAllCourses: announcement.isAllCourses,
        scheduledDate: announcement.scheduledDate
          ? announcement.scheduledDate.split("T")[0] +
            "T" +
            announcement.scheduledDate.split("T")[1]?.substring(0, 5)
          : "",
      });
    }
  }, [announcement]);

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
      const payload = {
        title: formData.title,
        message: formData.message,
        courses: formData.courses,
        isAllCourses: formData.isAllCourses,
      };
      
      // Only include scheduledDate if it's not empty
      if (formData.scheduledDate) {
        payload.scheduledDate = formData.scheduledDate;
      }

      const response = await axios.put(
        `http://localhost:5000/api/instructor/announcements/${announcement._id}`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (onAnnouncementUpdated) {
        onAnnouncementUpdated(response.data.announcement);
      }
    } catch (err) {
      console.error("Error updating announcement:", err);
      setError(err.response?.data?.message || err.message || "Failed to update announcement");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="edit-announcement">
      <h2>Edit Announcement</h2>

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
          <button
            type="button"
            className="btn-cancel"
            onClick={onCancel}
            disabled={loading}
          >
            Cancel
          </button>
          <button type="submit" className="btn-submit" disabled={loading}>
            {loading ? "Updating..." : "Update Announcement"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default EditAnnouncement;
