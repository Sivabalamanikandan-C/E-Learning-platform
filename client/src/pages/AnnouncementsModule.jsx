import React from "react";
import StudentAnnouncements from "../components/Announcements/StudentAnnouncements";
import "../components/Announcements/StudentAnnouncements.css";

export default function AnnouncementsModule() {
  return (
    <div className="announcements-page-wrapper">
      <StudentAnnouncements />
    </div>
  );
}
