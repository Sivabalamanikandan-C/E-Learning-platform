import { useEffect, useState } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";
import UnsuspendModal from "../components/UnsuspendModal";

export default function AdminStudents() {
  const auth = useAuth();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);


  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const res = await axios.get("http://localhost:5000/api/admin/students", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setStudents(res.data);
        setLoading(false);
      } catch (err) {
        console.error("Error fetching students:", err);
        setError(err.response?.data?.message || "Failed to fetch students");
        setLoading(false);
      }
    };

    if (auth?.token) {
      fetchStudents();
    }
  }, [auth]);



  const handleUnsuspend = async (studentId) => {
    // open unsuspend modal for this student
    const student = students.find((s) => s._id === studentId);
    if (!student) return alert("Student not found");
    setUnsuspendTarget({ isOpen: true, student });
  };



  const [unsuspendTarget, setUnsuspendTarget] = useState({ isOpen: false, student: null });

  const handleUnsuspendSuccess = (data) => {
    const studentId = data?.student?._id || unsuspendTarget.student?._id;
    // Update the student in the list
    setStudents(
      students.map((s) =>
        s._id === studentId
          ? {
              ...s,
              suspensionStatus: "active",
              suspensionReason: null,
              suspensionStartDate: null,
              suspensionEndDate: null,
              suspensionDuration: null,
            }
          : s
      )
    );
  };

  if (loading) return <div className="p-8">Loading...</div>;
  if (error) return <div className="p-8 text-red-600">Error: {error}</div>;

  return (
    <div className="admin-students p-8">
      <h2 className="text-3xl font-bold mb-8">Manage Students</h2>

      {students.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No students found</p>
      ) : (
        <div className="overflow-x-auto shadow-md rounded-lg">
          <table className="w-full border-collapse">
            <thead className="bg-linear-to-r from-orange-500 via-red-500 to-pink-500 text-white">
              <tr>
                <th className="p-4 text-left">Name</th>
                <th className="p-4 text-left">Email</th>
                <th className="p-4 text-left">Status</th>
                <th className="p-4 text-left">ID</th>
                <th className="p-4 text-left">Created At</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody>
              {students.map((student) => (
                <tr
                  key={student._id}
                  className={`border-b hover:bg-gray-50 ${
                    student.suspensionStatus === "suspended" ? "bg-red-50" : ""
                  }`}
                >
                  <td className="p-4">{student.name}</td>
                  <td className="p-4">{student.email}</td>
                  <td className="p-4">
                    <span
                      className={`px-3 py-1 rounded-full text-sm font-semibold ${
                        student.suspensionStatus === "suspended"
                          ? "bg-red-200 text-red-800"
                          : "bg-green-200 text-green-800"
                      }`}
                    >
                      {student.suspensionStatus === "suspended"
                        ? "Suspended"
                        : "Active"}
                    </span>
                  </td>
                  <td className="p-4 text-sm text-gray-500">{student._id}</td>
                  <td className="p-4 text-sm text-gray-500">
                    {new Date(student.createdAt).toLocaleDateString()}
                  </td>
                  <td className="p-4 text-center">
                    {student.suspensionStatus === "suspended" ? (
                      <div className="flex gap-2 justify-center">
                        <button
                          onClick={() => handleUnsuspend(student._id)}
                          className="px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                        >
                          Unsuspend
                        </button>
                        <button
                          onClick={() =>
                            alert(
                              `Reason: ${student.suspensionReason}\nEnd Date: ${new Date(
                                student.suspensionEndDate
                              ).toLocaleDateString()}`
                            )
                          }
                          className="px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                        >
                          View Details
                        </button>
                      </div>
                    ) : (
                      <button
                        disabled
                        title="Suspensions managed via instructor complaints"
                        className="px-4 py-2 bg-gray-400 text-white rounded text-sm cursor-not-allowed"
                      >
                        Suspend (via complaints)
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <UnsuspendModal
        isOpen={unsuspendTarget.isOpen}
        onClose={() => setUnsuspendTarget({ isOpen: false, student: null })}
        student={unsuspendTarget.student}
        auth={auth}
        onSuccess={(data) => {
          handleUnsuspendSuccess(data);
          setUnsuspendTarget({ isOpen: false, student: null });
        }}
      />
    </div>
  );
}
