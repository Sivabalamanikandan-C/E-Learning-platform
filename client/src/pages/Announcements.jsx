import React, { useState, useEffect } from "react";
import axios from "axios";
import CreateAnnouncement from "../components/Announcements/CreateAnnouncement";
import EditAnnouncement from "../components/Announcements/EditAnnouncement";
import AnnouncementList from "../components/Announcements/AnnouncementList";
import "../styles/Announcements.css";
import "../components/Announcements/Announcements.css";

const AnnouncementsPage = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState("list"); // 'list', 'create', 'edit'
  const [selectedAnnouncement, setSelectedAnnouncement] = useState(null);
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.get("http://localhost:5000/api/instructor/announcements", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAnnouncements(response.data);
    } catch (error) {
      console.error("Error fetching announcements:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnnouncementCreated = (newAnnouncement) => {
    setAnnouncements([newAnnouncement, ...announcements]);
    setView("list");
    showSuccessMessage("Announcement created successfully!");
  };

  const handleAnnouncementUpdated = (updatedAnnouncement) => {
    setAnnouncements(
      announcements.map((a) =>
        a._id === updatedAnnouncement._id ? updatedAnnouncement : a
      )
    );
    setView("list");
    setSelectedAnnouncement(null);
    showSuccessMessage("Announcement updated successfully!");
  };

  const handleDelete = async (announcementId) => {
    if (window.confirm("Are you sure you want to delete this announcement?")) {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        await axios.delete(`http://localhost:5000/api/instructor/announcements/${announcementId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAnnouncements(announcements.filter((a) => a._id !== announcementId));
        showSuccessMessage("Announcement deleted successfully!");
      } catch (error) {
        console.error("Error deleting announcement:", error);
        alert(error.response?.data?.message || "Failed to delete announcement");
      } finally {
        setLoading(false);
      }
    }
  };

  const handleSend = async (announcementId) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `http://localhost:5000/api/instructor/announcements/${announcementId}/send`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAnnouncements(
        announcements.map((a) =>
          a._id === announcementId ? response.data.announcement : a
        )
      );
      showSuccessMessage("Announcement sent successfully!");
    } catch (error) {
      console.error("Error sending announcement:", error);
      alert(error.response?.data?.message || "Failed to send announcement");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (announcement) => {
    setSelectedAnnouncement(announcement);
    setView("edit");
  };

  const showSuccessMessage = (message) => {
    setSuccessMessage(message);
    setTimeout(() => setSuccessMessage(""), 3000);
  };

  return (
    <div className="announcements-page">
      {successMessage && (
        <div className="success-message">
          <p>{successMessage}</p>
        </div>
      )}

      {view === "edit" && selectedAnnouncement ? (
        <EditAnnouncement
          announcement={selectedAnnouncement}
          onAnnouncementUpdated={handleAnnouncementUpdated}
          onCancel={() => {
            setView("list");
            setSelectedAnnouncement(null);
          }}
        />
      ) : (
        <>
          <CreateAnnouncement
            onAnnouncementCreated={handleAnnouncementCreated}
          />

          <AnnouncementList
            announcements={announcements}
            onEdit={handleEdit}
            onDelete={handleDelete}
            onSend={handleSend}
            loading={loading}
          />
        </>
      )}
    </div>
  );
};

export default AnnouncementsPage;
