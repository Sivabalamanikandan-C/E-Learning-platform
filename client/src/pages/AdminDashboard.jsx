import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import { GraduationCap, Users, BookOpen } from "lucide-react";

export default function AdminDashboard() {
  const auth = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/dashboard/stats", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setStats(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching stats:", err);
        setError(err.response?.data?.message || "Failed to fetch stats");
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchStats();
    }
  }, [auth]);

  if (loading)
    return (
      <div className="p-8 flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-10 w-10 border-4 border-blue-500 border-t-transparent"></div>
      </div>
    );

  if (error)
    return (
      <div className="p-8 text-center text-red-500 font-semibold">
        Error: {error}
      </div>
    );

  return (
    <div className="admin-dashboard p-6 md:p-10 bg-gray-100 min-h-screen">
      {/* Header */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-gray-800">
          Dashboard Overview
        </h2>
        <p className="text-gray-500 mt-1">
          Monitor platform performance and user activity
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 mb-10">

        {/* Students */}
        <div className="bg-white/70 backdrop-blur-lg border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Students</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                {stats?.totalStudents || 0}
              </h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-xl">
              <GraduationCap className="text-blue-600 w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Instructors */}
        <div className="bg-white/70 backdrop-blur-lg border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Instructors</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                {stats?.totalInstructors || 0}
              </h3>
            </div>
            <div className="bg-green-100 p-3 rounded-xl">
              <Users className="text-green-600 w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Courses */}
        <div className="bg-white/70 backdrop-blur-lg border border-gray-200 p-6 rounded-2xl shadow-sm hover:shadow-md transition">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-500 text-sm">Courses</p>
              <h3 className="text-3xl font-bold text-gray-800 mt-2">
                {stats?.totalCourses || 0}
              </h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-xl">
              <BookOpen className="text-purple-600 w-6 h-6" />
            </div>
          </div>
        </div>

      </div>

      {/* Welcome Card */}
      <div
        // style={{
        //   background: "linear-gradient(135deg, #f25c54 0%, #d4524f 100%)",
        // }}
        className="bg-white text-black p-8 rounded-2xl shadow-lg"
      >
        <h3 className="text-2xl font-semibold mb-2">
          Welcome back, Admin 👋
        </h3>
        <p className="text-black leading-relaxed">
          Manage students, instructors, and courses efficiently. Use the sidebar
          to navigate through different sections of your platform.
        </p>
      </div>
    </div>
  );
}