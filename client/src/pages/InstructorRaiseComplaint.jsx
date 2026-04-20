import { useState, useEffect } from "react";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

export default function InstructorRaiseComplaint() {
  const auth = useAuth();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [studentId, setStudentId] = useState("");
  const [students, setStudents] = useState([]);
  const [image, setImage] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [complaints, setComplaints] = useState([]);
  const [loadingComplaints, setLoadingComplaints] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !description || !studentId || !image) {
      alert("All fields are required");
      return;
    }

    const form = new FormData();
    form.append("title", title);
    form.append("description", description);
    form.append("studentId", studentId);
    form.append("image", image);

    try {
      setSubmitting(true);
      const res = await axios.post("http://localhost:5000/api/complaints", form, {
        headers: { Authorization: `Bearer ${auth.token}`, "Content-Type": "multipart/form-data" },
      });
      alert("Complaint submitted successfully");
      setTitle("");
      setDescription("");
      setStudentId("");
      setImage(null);
      // refresh instructor's complaints list
      fetchComplaints();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.message || "Failed to submit complaint");
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        setLoadingStudents(true);
        const res = await axios.get("http://localhost:5000/api/complaints/students/enrolled", {
          headers: { Authorization: `Bearer ${auth.token}` },
        });
        setStudents(res.data || []);
      } catch (err) {
        console.error(err);
        setStudents([]);
      } finally {
        setLoadingStudents(false);
      }
    };

    if (auth?.token) fetchStudents();
  }, [auth]);

  // fetch complaints raised by this instructor
  const fetchComplaints = async () => {
    try {
      setLoadingComplaints(true);
      const res = await axios.get("http://localhost:5000/api/complaints/mine", {
        headers: { Authorization: `Bearer ${auth.token}` },
      });
      setComplaints(res.data || []);
    } catch (err) {
      console.error("Failed to load complaints:", err);
      setComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  useEffect(() => {
    if (auth?.token) fetchComplaints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth]);

  return (
    <div className="p-8 w-full max-w-5xl mx-auto flex flex-col items-center">
      <h2 className="text-2xl font-bold mb-4">Raise Complaint Against Student</h2>
      <form onSubmit={handleSubmit} className="pace-y-4 w-full max-w-3xl mx-auto">
        <div className="mb-3">
          <label className="block font-medium">Complaint Title</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border p-2 rounded" />
        </div>

        <div className="mb-3">
          <label className="block font-medium">Complaint Description</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border p-2 rounded" rows={5} />
        </div>

        <div className="mb-3">
          <label className="block font-medium">Student</label>
          {loadingStudents ? (
            <div>Loading students...</div>
          ) : students.length === 0 ? (
            <div className="text-sm text-gray-600">No students enrolled in your courses.</div>
          ) : (
            <select value={studentId} onChange={(e) => setStudentId(e.target.value)} className="w-full border p-2 rounded">
              <option value="">-- Select student --</option>
              {students.map((s) => (
                <option key={s._id} value={s._id}>
                  {s.name} — {s.email}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="mt-3 mb-4">
          <label className="block font-medium mb-2">Image Upload</label>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImage(e.target.files[0])}
            className="w-full border border-gray-300 rounded-lg p-2 
    file:mr-4 file:py-2 file:px-4 
    file:rounded-md file:border-0 
    file:text-sm file:font-semibold 
    file:bg-blue-50 file:text-blue-700 
    hover:file:bg-blue-100 cursor-pointer"
          />
        </div>

        <div className="flex items-center justify-center">
          <button disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded">
            {submitting ? "Submitting..." : "Raise Complaint"}
          </button>
        </div>
      </form>

      <div className="mt-12 w-full max-w-3xl mx-auto">
        <h3 className="text-xl font-semibold mb-4">Your Complaints</h3>
        {loadingComplaints ? (
          <div>Loading complaints...</div>
        ) : complaints.length === 0 ? (
          <div className="text-sm text-gray-600">You have not raised any complaints yet.</div>
        ) : (
          <div className="space-y-4">
            {complaints.map((c) => (
              <div key={c._id} className="border rounded p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-lg font-semibold">{c.title}</div>
                    <div className="text-sm text-gray-600">Against: {c.student?.name} — {c.student?.email}</div>
                  </div>
                  <div className="text-sm font-medium px-2 py-1 rounded" style={{ backgroundColor: '#f3f4f6' }}>{c.status}</div>
                </div>
                <p className="mt-2 text-sm text-gray-800">{c.description}</p>
                {/* {c.image && (
                            <div className="mt-3">
                              <img src={c.image} alt="complaint" className="max-w-xs max-h-48 object-contain border" />
                            </div>
                          )} */}
                {c.unsuspendReason && (
                  <div className="mt-2 bg-yellow-50 border border-yellow-200 rounded p-2">
                    <div className="text-sm font-semibold text-yellow-800">Unsuspend Reason:</div>
                    <div className="text-sm text-yellow-700">{c.unsuspendReason}</div>
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">Submitted: {new Date(c.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
