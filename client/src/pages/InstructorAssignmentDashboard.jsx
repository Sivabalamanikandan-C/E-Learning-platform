import React, { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../styles/InstructorAssignmentDashboard.css";

const InstructorAssignmentDashboard = () => {
  const [assignments, setAssignments] = useState([]);
  const [courses, setCourses] = useState([]);
  const [showCreateForm, setShowCreateForm] = useState(true);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filterCourse, setFilterCourse] = useState("all");

  // Form states
  const [formData, setFormData] = useState({
    title: "",
    instructions: "",
    dueDate: "",
    dueTime: "",
    maxMarks: "",
    submissionType: "both",
    course: "",
  });

  const [referenceFile, setReferenceFile] = useState(null);
  const token = localStorage.getItem("token");

  // Fetch assignments and courses
  useEffect(() => {
    fetchAssignmentsAndCourses();
  }, []);

  const fetchAssignmentsAndCourses = async () => {
    try {
      setLoading(true);
      // Fetch instructor's courses
      const coursesResponse = await axios.get(
        "http://localhost:5000/api/instructor/courses/list",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setCourses(coursesResponse.data || []);

      // Fetch all assignments
      const assignmentsResponse = await axios.get(
        "http://localhost:5000/api/assignment/instructor/all",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAssignments(assignmentsResponse.data || []);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
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

    if (!formData.course) {
      setError("Please select a course");
      return;
    }
    // Validate required fields
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

    const maxMarksNum = Number(formData.maxMarks);
    if (Number.isNaN(maxMarksNum) || maxMarksNum < 0) {
      setError("Max marks must be a non-negative number");
      return;
    }

    if (!referenceFile) {
      setError("Reference file is required when creating an assignment");
      return;
    }

    setError("");

    const formPayload = new FormData();
    formPayload.append("title", formData.title);
    formPayload.append("instructions", formData.instructions);
    formPayload.append("course", formData.course);
    formPayload.append("dueDate", `${formData.dueDate}T${formData.dueTime}`);
    formPayload.append("maxMarks", formData.maxMarks);
    formPayload.append("submissionType", formData.submissionType);

    if (referenceFile) {
      formPayload.append("referenceFile", referenceFile);
    }

    try {
      await axios.post("http://localhost:5000/api/assignment/create", formPayload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setSuccessMessage("Assignment created successfully!");
      setFormData({
        title: "",
        instructions: "",
        dueDate: "",
        dueTime: "",
        maxMarks: "",
        submissionType: "both",
        course: "",
      });
      setReferenceFile(null);
      setShowCreateForm(false);
      fetchAssignmentsAndCourses();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to create assignment");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleDelete = async (assignmentId) => {
    if (!window.confirm("Are you sure you want to delete this assignment?")) {
      return;
    }

    try {
      await axios.delete(
        `http://localhost:5000/api/assignment/delete/${assignmentId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setSuccessMessage("Assignment deleted successfully!");
      fetchAssignmentsAndCourses();
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError("Failed to delete assignment");
      setTimeout(() => setError(""), 3000);
    }
  };

  const filteredAssignments =
    filterCourse === "all"
      ? assignments
      : assignments.filter((a) => {
        const id = a?.course?._id || a?.course || null;
        return id === filterCourse;
      });

  const getCourseName = (courseOrId) => {
    const id = courseOrId?._id || courseOrId || null;
    const course = courses.find((c) => String(c._id) === String(id));
    return course?.title || "Unknown Course";
  };

  if (loading) {
    return <div className="assignment-dashboard loading">Loading assignments...</div>;
  }

  return (
    <div className="assignment-dashboard">
      {/* Header */}
      <div className="dashboard-header">
        <h1>My Assignments</h1>
      </div>

      {/* Messages */}
      {successMessage && <div className="success-message">{successMessage}</div>}
      {error && <div className="error-message">{error}</div>}

      {/* Create Form */}
      {showCreateForm && (
        <div className="create-form-container">
          <form onSubmit={handleSubmit} className="assignment-form">
            <h2>Create New Assignment</h2>

            {/* Course Selection */}
            <div className="form-group">
              <label>Course *</label>
              <select
                name="course"
                value={formData.course}
                onChange={handleInputChange}
                required
              >
                <option value="">Select a course</option>
                {courses.map((course) => (
                  <option key={course._id} value={course._id}>
                    {course.title}
                  </option>
                ))}
              </select>
            </div>

            {/* Title */}
            <div className="form-group">
              <label>Assignment Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                placeholder="e.g., Build a Todo App"
                required
              />
            </div>

            {/* Instructions */}
            <div className="form-group">
              <label className="block font-medium mb-1">Instructions *</label>

              <p className="text-sm text-gray-600 mb-2">
                The assignment must be submitted in handwritten format.
                Submissions that are not handwritten will not be considered valid and not be graded.
              </p>

              <textarea
                name="instructions"
                value={formData.instructions}
                onChange={handleInputChange}
                placeholder="Enter detailed assignment instructions..."
                rows="5"
                required
                className="w-full border border-gray-300 rounded p-2"
              />
            </div>

            {/* Due Date and Time */}
            <div className="form-row">
              <div className="form-group">
                <label>Due Date *</label>
                <input
                  type="date"
                  name="dueDate"
                  value={formData.dueDate}
                  onChange={handleInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Due Time *</label>
                <input
                  type="time"
                  name="dueTime"
                  value={formData.dueTime}
                  onChange={handleInputChange}
                  required
                />
              </div>
            </div>

            {/* Max Marks */}
            <div className="form-group">
              <label>Max Marks *</label>
              <input
                type="number"
                name="maxMarks"
                value={formData.maxMarks}
                onChange={handleInputChange}
                placeholder="e.g., 100"
                min="1"
                required
              />
            </div>

            {/* Submission Type */}
            <div className="form-group">
              <label>Submission Type *</label>
              <select
                name="submissionType"
                value={formData.submissionType}
                onChange={handleInputChange}
                required
              >
                <option value="text">Text Only(Must be in handwritten format)</option>
                <option value="file">File Only(Must be in handwritten format)</option>
                <option value="both">Both Text & File(Must be in handwritten format)</option>
              </select>
            </div>

            {/* Reference File */}
            <div className="form-group">
              <label>Reference File (Optional)</label>
              <input
                type="file"
                onChange={handleFileChange}
                accept=".pdf,.doc,.docx,.zip,.txt,.jpg,.jpeg,.png,.gif"
              />
              <small>Max 50MB. Supported: PDF, DOC, DOCX, ZIP, TXT, Images</small>
            </div>

            {/* Submit Button */}
            <button type="submit" className="submit-btn">
              Create Assignment
            </button>
          </form>
        </div>
      )}

      {/* Filter */}
      <div className="filter-section">
        <label>Filter by Course:</label>
        <select value={filterCourse} onChange={(e) => setFilterCourse(e.target.value)}>
          <option value="all">All Courses</option>
          {courses.map((course) => (
            <option key={course._id} value={course._id}>
              {course.title}
            </option>
          ))}
        </select>
      </div>

      {/* Assignments List */}
      <div className="assignments-list">
        {filteredAssignments.length === 0 ? (
          <div className="no-assignments">
            <p>No assignments yet. Create one to get started!</p>
          </div>
        ) : (
          filteredAssignments.map((assignment) => (
            <div key={assignment._id} className="assignment-card">
              <div className="card-header">
                <h3>{assignment.title}</h3>
                <span className="course-badge">{getCourseName(assignment.course)}</span>
              </div>

              <div className="card-body">
                <p className="instructions">{assignment.instructions}</p>

                <div className="assignment-details">
                  <div className="detail-item">
                    <strong>Due Date:</strong> {new Date(assignment.dueDate).toLocaleDateString()}
                  </div>
                  <div className="detail-item">
                    <strong>Max Marks:</strong> {assignment.maxMarks}
                  </div>
                  <div className="detail-item">
                    <strong>Submission Type:</strong>{" "}
                    {assignment.submissionType.charAt(0).toUpperCase() +
                      assignment.submissionType.slice(1)}
                  </div>
                </div>
              </div>

              <div className="card-actions">
                <Link
                  to={`/instructor/assignment/${assignment._id}/submissions`}
                  className="btn btn-view"
                >
                  View Submissions
                </Link>
                <button
                  onClick={() => handleDelete(assignment._id)}
                  className="btn btn-delete"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default InstructorAssignmentDashboard;
