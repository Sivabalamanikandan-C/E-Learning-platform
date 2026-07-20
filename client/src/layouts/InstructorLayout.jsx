import { Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function InstructorLayout() {
  const navigate = useNavigate();

  const auth = useAuth();

  const handleLogout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* NAVBAR */}
      <nav className="bg-blue-600 text-white px-6 py-4 flex justify-between items-center">
        <h1
          className="text-xl font-bold cursor-pointer"
          onClick={() => navigate("/instructor")}
        >
          Instructor
        </h1>

        <div className="flex gap-6">
          <button
            onClick={() => navigate("/instructor")}
            className="hover:text-blue-100 transition"
          >
            Dashboard
          </button>
          <button
            onClick={() => navigate("/instructor/create-course")}
            className="hover:text-blue-100 transition"
          >
            Create Course
          </button>
          <button
            onClick={() => navigate("/instructor/my-courses")}
            className="hover:text-blue-100 transition"
          >
            My Courses
          </button>
          <button
            onClick={() => navigate("/instructor/announcements")}
            className="hover:text-blue-100 transition"
          >
            Announcements
          </button>
          
          <button
            onClick={() => navigate("/instructor/assignments")}
            className="hover:text-blue-100 transition"
            title="Create and manage assignments"
          >
            Assignments
          </button>

          <button
            onClick={() => navigate("/instructor/questions")}
            className="hover:text-blue-100 transition"
            title="Answer student questions"
          >
            Questions
          </button>

          <button
            onClick={() => navigate("/instructor/raise-complaint")}
            className="hover:text-blue-100 transition"
            title="Raise a complaint against a student"
          >
            Raise Complaint
          </button>

          <button
            onClick={() => navigate("/instructor/my-profile")}
            className="hover:text-blue-100 transition"
          >
            My Profile
          </button>
        </div>

        <button
          onClick={handleLogout}
          className="bg-red-500 hover:bg-red-600 px-4 py-2 rounded transition"
        >
          Logout
        </button>
      </nav>

      {/* PAGE CONTENT */}
      <Outlet />
    </div>
  );
}
