import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import "../styles/StudentLayout.css";
import { useAuth } from "../context/AuthContext";

export default function StudentLayout() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState("dashboard");

  const auth = useAuth();

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="student-layout">
      {/* Navigation Bar */}
      <nav className="student-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>Student Dashboard</h1>
          </div>

          <div className="navbar-menu">
            <button
              className={`nav-btn ${activeModule === "dashboard" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("dashboard");
                navigate("/student");
              }}
            >
              Dashboard
            </button>

            <button
              className={`nav-btn ${activeModule === "courses" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("courses");
                navigate("/student/courses");
              }}
            >
              All Courses
            </button>
            
            <button
              className={`nav-btn ${activeModule === "my-courses" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("my-courses");
                navigate("/student/my-courses");
              }}
            >
              My Courses
            </button>
            
            <button
              className={`nav-btn ${activeModule === "announcements" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("announcements");
                navigate("/student/announcements");
              }}
            >
              Announcements
            </button>
            <button
              className={`nav-btn ${activeModule === "assignments" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("assignments");
                navigate("/student/assignments");
              }}
            >
              Assignments
            </button>
            <button
              className={`nav-btn ${activeModule === "course-tracker" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("course-tracker");
                navigate("/student/course-tracker");
              }}
            >
              Course Tracker
            </button>
          </div>

          <div className="navbar-actions">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="student-content">
        <Outlet />
      </div>
    </div>
  );
}
