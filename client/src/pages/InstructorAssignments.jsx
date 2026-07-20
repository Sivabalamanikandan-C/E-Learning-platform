import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/InstructorAssignments.css";

const InstructorAssignments = () => {
  const { courseId } = useParams();
  const [assignments, setAssignments] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    instructions: "",
    dueDate: "",
    dueTime: "",
    maxMarks: "",
    submissionType: "both",
  });

  const [referenceFile, setReferenceFile] = useState(null);
  const token = localStorage.getItem("token");

  // Fetch assignments
  useEffect(() => {
    fetchAssignments();
  }, [courseId]);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/assignment/instructor/course/${courseId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAssignments(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setReferenceFile(e.target.files[0]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Client-side validation: all fields required when creating a new assignment
    if (
      !formData.title ||
      !formData.instructions ||
      !formData.dueDate ||
      !formData.dueTime ||
      formData.maxMarks === "" ||
      !formData.submissionType
    ) {
      setError("All fields are required");
      return;
    }

    // maxMarks should be a non-negative number
    const maxMarksNum = Number(formData.maxMarks);
    if (Number.isNaN(maxMarksNum) || maxMarksNum < 0) {
      setError("Maximum marks must be a non-negative number");
      return;
    }

    // Require reference file for new assignment creations (but not for edits)
    if (!editingId && !referenceFile) {
      setError("Reference material is required when creating an assignment");
      return;
    }

    // Clear previous errors
    setError("");

    const formPayload = new FormData();
    formPayload.append("title", formData.title);
    formPayload.append("instructions", formData.instructions);
    formPayload.append("course", courseId);
    formPayload.append("dueDate", `${formData.dueDate}T${formData.dueTime}`);
    formPayload.append("maxMarks", formData.maxMarks);
    formPayload.append("submissionType", formData.submissionType);

    if (referenceFile) {
      formPayload.append("referenceFile", referenceFile);
    }

    try {
      let response;
      if (editingId) {
        response = await axios.put(
          `http://localhost:5000/api/assignment/update/${editingId}`,
          formPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSuccessMessage("Assignment updated successfully");
      } else {
        response = await axios.post(
          "http://localhost:5000/api/assignment/create",
          formPayload,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        setSuccessMessage("Assignment created successfully");
      }

      setFormData({
        title: "",
        instructions: "",
        dueDate: "",
        dueTime: "",
        maxMarks: "",
        submissionType: "both",
      });
      setReferenceFile(null);
      setShowCreateForm(false);
      setEditingId(null);
      fetchAssignments();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Error saving assignment");
    }
  };

  const handleEdit = (assignment) => {
    const dueDate = new Date(assignment.dueDate);
    const dateStr = dueDate.toISOString().split("T")[0];
    const timeStr = dueDate.toTimeString().split(" ")[0].substring(0, 5);

    setFormData({
      title: assignment.title,
      instructions: assignment.instructions,
      dueDate: dateStr,
      dueTime: timeStr,
      maxMarks: assignment.maxMarks,
      submissionType: assignment.submissionType,
    });
    setEditingId(assignment._id);
    setShowCreateForm(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) return;

    try {
      await axios.delete(`http://localhost:5000/api/assignment/delete/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuccessMessage("Assignment deleted successfully");
      fetchAssignments();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to delete assignment");
    }
  };

  const handleViewSubmissions = (assignmentId) => {
    window.location.href = `/instructor/assignment/${assignmentId}/submissions`;
  };

  if (loading) return <div className="loading">Loading assignments...</div>;

  return (
    <div className="instructor-assignments-container">
      <div className="assignments-header">
        <h2>Course Assignments</h2>
        <button
          className="btn-create"
          onClick={() => {
            setShowCreateForm(!showCreateForm);
            setEditingId(null);
            setFormData({
              title: "",
              instructions: "",
              dueDate: "",
              dueTime: "",
              maxMarks: "",
              submissionType: "both",
            });
          }}
        >
          {showCreateForm ? "Cancel" : "+ Create Assignment"}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {showCreateForm && (
        <div className="assignment-form-container">
          <h3>{editingId ? "Edit Assignment" : "Create New Assignment"}</h3>
          <form onSubmit={handleSubmit} className="assignment-form">
            <div className="form-group">
              <label>Assignment Title*</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Chapter 1 Assignment"
                required
              />
            </div>

            <div className="form-group">
              <label>Instructions*</label>
              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Detailed instructions for the assignment"
                rows="6"
                required
              ></textarea>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Due Date*</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>

              <div className="form-group">
                <label>Due Time*</label>
                <input
                  type="time"
                  name="dueTime"
                  value={formData.dueTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Maximum Marks*</label>
                <input
                  type="number"
                  name="maxMarks"
                  value={formData.maxMarks}
                  onChange={handleInputChange}
                  placeholder="e.g., 100"
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Submission Type*</label>
                <select
                  name="submissionType"
                  value={formData.submissionType}
                  onChange={handleInputChange}
                  required
                >
                  <option value="file">File Upload Only</option>
                  <option value="text">Text Response Only</option>
                  <option value="both">File or Text</option>
                </select>
              </div>
            </div>

            <div className="form-group">
              <label>Reference Material (Optional)</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.zip,.txt,.jpg,.jpeg,.png,.gif"
              />
              {referenceFile && <span className="file-name">{referenceFile.name}</span>}
            </div>

            <div className="form-actions">
              <button type="submit" className="btn-submit">
                {editingId ? "Update Assignment" : "Create Assignment"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="assignments-list">
        {assignments.length === 0 ? (
          <div className="no-assignments">No assignments yet. Create your first assignment!</div>
        ) : (
          assignments.map((assignment) => (
            <div key={assignment._id} className="assignment-card">
              <div className="assignment-header">
                <h3>{assignment.title}</h3>
                <div className="assignment-badges">
                  <span className="badge-marks">{assignment.maxMarks} marks</span>
                  <span className={`badge-type ${assignment.submissionType}`}>
                    {assignment.submissionType}
                  </span>
                </div>
              </div>

              <div className="assignment-details">
                <p className="instructions-preview">{assignment.instructions.substring(0, 100)}...</p>

                <div className="assignment-meta">
                  <span className="due-date">
                    📅 Due: {new Date(assignment.dueDate).toLocaleString()}
                  </span>
                  {assignment.referenceFile && (
                    <a
                      href={`http://localhost:5000${assignment.referenceFile.fileUrl}`}
                      className="reference-file"
                      download
                    >
                      📎 Reference Material
                    </a>
                  )}
                </div>
              </div>

              <div className="assignment-actions">
                <button
                  className="btn-submissions"
                  onClick={() => handleViewSubmissions(assignment._id)}
                >
                  👥 View Submissions
                </button>
                <button
                  className="btn-edit"
                  onClick={() => handleEdit(assignment)}
                >
                  ✏️ Edit
                </button>
                <button
                  className="btn-delete"
                  onClick={() => handleDelete(assignment._id)}
                >
                  🗑️ Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InstructorAssignments;
