import React, { useState, useEffect } from "react";
import axios from "axios";
import "./Announcements.css";

const AnnouncementList = ({ announcements, onEdit, onDelete, onSend, loading }) => {
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case "Sent":
        return "badge-sent";
      case "Scheduled":
        return "badge-scheduled";
      case "Draft":
        return "badge-draft";
      default:
        return "";
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="announcement-list">
      <h2>Announcements</h2>

      {announcements.length === 0 ? (
        <div className="empty-state">
          <p>No announcements yet. Create your first announcement!</p>
        </div>
      ) : (
        <div className="announcements-table">
          {announcements.map((announcement) => (
            <div key={announcement._id} className="announcement-card">
              <div className="announcement-header">
                <div className="announcement-title-section">
                  <h3>{announcement.title}</h3>
                  <span className={`badge ${getStatusBadgeClass(announcement.status)}`}>
                    {announcement.status}
                  </span>
                </div>
                
              </div>

              <div className="announcement-content">
                <p>{announcement.message.substring(0, 150)}...</p>
              </div>

              <div className="announcement-meta">
                <div className="meta-item">
                  <span className="label">Created:</span>
                  <span className="value">{formatDate(announcement.createdAt)}</span>
                </div>

                {announcement.status === "Scheduled" && (
                  <div className="meta-item">
                    <span className="label">Scheduled:</span>
                    <span className="value">{formatDate(announcement.scheduledDate)}</span>
                  </div>
                )}

                {announcement.status === "Sent" && (
                  <div className="meta-item">
                    <span className="label">Sent:</span>
                    <span className="value">{formatDate(announcement.sentAt)}</span>
                  </div>
                )}

                <div className="meta-item">
                  <span className="label">Courses:</span>
                  <span className="value">
                    {announcement.isAllCourses
                      ? "All courses"
                      : `${announcement.courses?.length || 0} course(s)`}
                  </span>
                </div>
              </div>

              <div className="announcement-actions">
                {announcement.status !== "Sent" && (
                  <>
                    <button
                      className="btn-edit"
                      onClick={() => onEdit(announcement)}
                      disabled={loading}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={() => onDelete(announcement._id)}
                      disabled={loading}
                    >
                      Delete
                    </button>
                  </>
                )}

                {announcement.status === "Scheduled" && (
                  <button
                    className="btn-send"
                    onClick={() => onSend(announcement._id)}
                    disabled={loading}
                  >
                    Send Now
                  </button>
                )}

                {announcement.status === "Draft" && (
                  <button
                    className="btn-send"
                    onClick={() => onSend(announcement._id)}
                    disabled={loading}
                  >
                    Send Announcement
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AnnouncementList;
