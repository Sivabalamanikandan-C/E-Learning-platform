import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";

export default function InstructorDashboard() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);

  const auth = useAuth();
  const logout = () => {
    auth.logout();
    navigate("/login", { replace: true });
  };

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await api.get("/api/instructor/dashboard", {
          headers: {
            Authorization: `Bearer ${auth?.token || localStorage.getItem("token")}`,
          },
        });
        setData(res.data);
      } catch (err) {
        logout(); // token invalid or unauthorized
      }
    };

    fetchDashboard();
  }, [auth?.token]);

  if (!data) {
    return <p className="p-8">Loading dashboard...</p>;
  }

  return (
    <div className="min-h-screen bg-gray-100">
    

      <div className="p-8">
        <h2 className="text-2xl font-semibold mb-6">
          Welcome, {data.instructorName} 👋
        </h2>

        {/* STATS */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <Stat title="Total Courses" value={data.totalCourses} />
          <Stat title="Total Students" value={data.totalStudents} />
          <Stat title="Total Revenue" value={`₹ ${data.totalRevenue}`} />
        </div>

        {/* STUDENTS TABLE */}
        <div className="bg-white shadow rounded p-6">
          <h3 className="text-xl font-semibold mb-4">
            Enrolled Students
          </h3>

          {data.students.length === 0 ? (
            <p className="text-gray-500">No students enrolled yet</p>
          ) : (
            <table className="w-full border">
              <thead className="bg-gray-200">
                <tr>
                  <th className="p-2 border">Student Name</th>
                  <th className="p-2 border">Email</th>
                  <th className="p-2 border">Course</th>
                </tr>
              </thead>
              <tbody>
                {data.students.map((s, i) => (
                  <tr key={i}>
                    <td className="p-2 border">{s.name}</td>
                    <td className="p-2 border">{s.email}</td>
                    <td className="p-2 border">{s.course}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

/* ================= STAT CARD ================= */
const Stat = ({ title, value }) => (
  <div className="bg-white p-6 rounded shadow text-center">
    <p className="text-gray-500">{title}</p>
    <p className="text-3xl font-bold mt-2">{value}</p>
  </div>
);
