import { useState } from "react";
import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import "../styles/AdminLayout.css";

export default function AdminLayout() {
  const navigate = useNavigate();
  const [activeModule, setActiveModule] = useState("dashboard");

  const auth = useAuth();

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="admin-layout">
      {/* Navigation Bar */}
      <nav className="admin-navbar">
        <div className="navbar-container">
          <div className="navbar-brand">
            <h1>Admin Dashboard</h1>
          </div>

          <div className="navbar-menu">
            <button
              className={`nav-btn ${activeModule === "dashboard" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("dashboard");
                navigate("/admin");
              }}
            >
              Dashboard
            </button>
            <button
              className={`nav-btn ${activeModule === "students" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("students");
                navigate("/admin/students");
              }}
            >
              Students
            </button>
            <button
              className={`nav-btn ${activeModule === "instructors" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("instructors");
                navigate("/admin/instructors");
              }}
            >
              Instructors
            </button>
            {/* <button
              className={`nav-btn ${activeModule === "courses" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("courses");
                navigate("/admin/courses");
              }}
            >
              Courses
            </button> */}
            <button
              className={`nav-btn ${activeModule === "manage-courses" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("manage-courses");
                navigate("/admin/manage-courses");
              }}
            >
              Manage Courses
            </button>
            <button
              className={`nav-btn ${activeModule === "inquiries" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("inquiries");
                navigate("/admin/suspension-inquiries");
              }}
            >
              Suspension Inquiries
            </button>
            <button
              className={`nav-btn ${activeModule === "complaints" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("complaints");
                navigate("/admin/complaints");
              }}
            >
              Complaints
            </button>
            
            {/* <button
              className={`nav-btn ${activeModule === "payments" ? "active" : ""}`}
              onClick={() => {
                setActiveModule("payments");
                navigate("/admin/payments");
              }}
            >
              Payments
            </button> */}
          </div>

          <div className="navbar-actions">
            <button className="logout-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="admin-content">
        <Outlet />
      </div>
    </div>
  );
}
