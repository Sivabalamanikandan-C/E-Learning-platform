import React, { useState, useEffect } from "react";
import axios from "axios";
import "./StudentAnnouncements.css";

const StudentAnnouncements = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/student/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const toggleExpand = (id) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="student-announcements">
      <h2>Announcements</h2>

      {loading ? (
        <div className="loading">
          <p>Loading announcements...</p>
        </div>
      ) : announcements.length === 0 ? (
        <div className="no-announcements">
          <p>📌 No announcements yet</p>
          <p className="announcement-hint">Announcements will be available once you enroll in a course</p>
        </div>
      ) : (
        <div className="announcements-container">
          {announcements.map((announcement) => (
            <div
              key={announcement._id}
              className={`announcement-item ${
                expandedId === announcement._id ? "expanded" : ""
              }`}
            >
              <div
                className="announcement-summary"
                onClick={() => toggleExpand(announcement._id)}
              >
                <div className="announcement-info">
                  
                  <h3>{announcement.title}</h3>
                  <p className="instructor-info">
                    From: <strong>{announcement.instructor?.name}</strong>
                  </p>
                  <p className="sent-date">{formatDate(announcement.sentAt)}</p>
                </div>
                <span className="expand-icon">
                  {expandedId === announcement._id ? "−" : "+"}
                </span>
              </div>

              {expandedId === announcement._id && (
                <div className="announcement-detail">
                  <div className="message-content">
                    {announcement.message}
                  </div>
                  {announcement.courses && announcement.courses.length > 0 && (
                    <div className="courses-info">
                      <strong>Related Courses:</strong>
                      <ul>
                        {announcement.courses.map((course) => (
                          <li key={course._id}>{course.title}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudentAnnouncements;
