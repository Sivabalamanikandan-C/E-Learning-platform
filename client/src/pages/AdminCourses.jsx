import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function AdminCourses() {
  const auth = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/courses", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setCourses(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching courses:", err);
        setError(err.response?.data?.message || "Failed to fetch courses");
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchCourses();
    }
  }, [auth]);

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="admin-courses p-8">
      <h2 className="text-3xl font-bold mb-8">Manage Courses</h2>

      {courses.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No courses found</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full border-collapse">
            <thead className="bg-purple-600 text-white">
              <tr>
                <th className="p-4 text-left">Title</th>
                <th className="p-4 text-left">Instructor</th>
                <th className="p-4 text-left">Category</th>
                <th className="p-4 text-left">Level</th>
                <th className="p-4 text-left">Price</th>
                <th className="p-4 text-left">Students</th>
                <th className="p-4 text-left">Created At</th>
              </tr>
            </thead>
            <tbody>
              {courses.map((course) => (
                <tr key={course._id} className="border-b hover:bg-gray-50">
                  <td className="p-4">{course.title}</td>
                  <td className="p-4">{course.instructor?.name || "N/A"}</td>
                  <td className="p-4">{course.category}</td>
                  <td className="p-4">{course.level}</td>
                  <td className="p-4">₹{course.price}</td>
                  <td className="p-4">{course.enrolledStudents?.length || 0}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(course.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
