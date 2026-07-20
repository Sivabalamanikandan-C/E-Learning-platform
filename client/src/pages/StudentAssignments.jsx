import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/StudentAssignments.css";

const StudentAssignments = () => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [filter, setFilter] = useState("all");

  // Submission form states
  const [submissionForm, setSubmissionForm] = useState({
    submissionText: "",
    submissionFile: null,
  });

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      setLoading(true);
      const response = await axios.get("http://localhost:5000/api/assignment/student/all", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAssignments(response.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch assignments");
    } finally {
      setLoading(false);
    }
  };

  const getAssignmentStatus = (assignment) => {
    const now = new Date();
    const dueDate = new Date(assignment.dueDate);

    if (!assignment.submission) {
      return dueDate < now ? "late" : "not-submitted";
    }

    if (assignment.submission.status === "graded") {
      return "graded";
    }

    return assignment.submission.isLate ? "late" : "submitted";
  };

  const getStatusBadge = (status) => {
    const badges = {
      "not-submitted": { label: "Not Submitted", className: "badge-not-submitted" },
      submitted: { label: "Submitted", className: "badge-submitted" },
      late: { label: "Late", className: "badge-late" },
      graded: { label: "Graded", className: "badge-graded" },
    };
    const badge = badges[status] || badges["not-submitted"];
    return <span className={`status-badge ${badge.className}`}>{badge.label}</span>;
  };

  const filteredAssignments = assignments.filter((assignment) => {
    if (filter === "all") return true;
    return getAssignmentStatus(assignment) === filter;
  });

  const handleSelectAssignment = (assignment) => {
    setSelectedAssignment(assignment);
    setSubmissionForm({ submissionText: "", submissionFile: null });
  };

  const handleFileChange = (e) => {
    setSubmissionForm((prev) => ({
      ...prev,
      submissionFile: e.target.files[0],
    }));
  };

  const handleTextChange = (e) => {
    setSubmissionForm((prev) => ({
      ...prev,
      submissionText: e.target.value,
    }));
  };

  const handleSubmitAssignment = async () => {
    if (!selectedAssignment) return;

    const { submissionType } = selectedAssignment;

    if (submissionType === "file" && !submissionForm.submissionFile) {
      setError("File upload is required for this assignment");
      return;
    }

    if (submissionType === "text" && !submissionForm.submissionText.trim()) {
      setError("Text response is required for this assignment");
      return;
    }

    if (submissionType === "both") {
      if (!submissionForm.submissionFile || !submissionForm.submissionText.trim()) {
        setError("Both file upload and text response are required for this assignment");
        return;
      }
    }

    try {
      setSubmitting(true);
      const formData = new FormData();

      if (submissionForm.submissionText) {
        formData.append("submissionText", submissionForm.submissionText);
      }

      if (submissionForm.submissionFile) {
        formData.append("submissionFile", submissionForm.submissionFile);
      }

      const response = await axios.post(
        `http://localhost:5000/api/assignment/submit/${selectedAssignment._id}`,
        formData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage(response.data.message);
      setSubmissionForm({ submissionText: "", submissionFile: null });
      
      // Fetch updated assignments and update the selected assignment
      try {
        const updatedResponse = await axios.get("http://localhost:5000/api/assignment/student/all", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setAssignments(updatedResponse.data);
        
        // Find and update the selected assignment with new submission data
        const updatedAssignment = updatedResponse.data.find((a) => a._id === selectedAssignment._id);
        if (updatedAssignment) {
          setSelectedAssignment(updatedAssignment);
        }
      } catch (fetchErr) {
        console.error("Error fetching updated assignments:", fetchErr);
      }

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to submit assignment");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="loading">Loading assignments...</div>;

  return (
    <div className="student-assignments-container">
      <div className="assignments-header">
        <h2>My Assignments</h2>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      <div className="filter-tabs">
        {["all", "not-submitted", "submitted", "late", "graded"].map((status) => (
          <button
            key={status}
            className={`filter-btn ${filter === status ? "active" : ""}`}
            onClick={() => setFilter(status)}
          >
            {status === "all"
              ? "All"
              : status === "not-submitted"
              ? "Not Submitted"
              : status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      <div className="assignments-content">
        <div className="assignments-panel">
          <div className="assignments-list">
            {filteredAssignments.length === 0 ? (
              <div className="no-assignments">
                {filter === "all"
                  ? "No assignments available"
                  : `No ${filter} assignments`}
              </div>
            ) : (
              filteredAssignments.map((assignment) => {
                const status = getAssignmentStatus(assignment);
                const isOverdue = new Date() > new Date(assignment.dueDate) && !assignment.submission;

                return (
                  <div
                    key={assignment._id}
                    className={`assignment-card ${
                      selectedAssignment?._id === assignment._id ? "selected" : ""
                    } ${isOverdue ? "overdue" : ""}`}
                    onClick={() => handleSelectAssignment(assignment)}
                  >
                    <div className="card-header">
                      <h4>{assignment.title}</h4>
                      {getStatusBadge(status)}
                    </div>

                    <div className="card-info">
                      <p className="instructor-name">👨‍🏫 {assignment.instructor?.name}</p>
                      <p className="due-date">
                        📅 Due: {new Date(assignment.dueDate).toLocaleString()}
                      </p>
                      <p className="max-marks">⭐ {assignment.maxMarks} marks</p>
                    </div>

                    {assignment.submission?.status === "graded" && (
                      <div className="grades-info">
                        <p className="obtained-marks">
                          Obtained: {assignment.submission.obtainedMarks}/{assignment.maxMarks}
                        </p>
                        <p className="percentage">
                          ({Math.round((assignment.submission.obtainedMarks / assignment.maxMarks) * 100)}%)
                        </p>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div> <br />

        <div className="details-panel">
          {selectedAssignment ? (
            <>
              <div className="assignment-detail">
                <h3>{selectedAssignment.title}</h3>

                <div className="detail-meta">
                  <p>
                    <strong>Instructor:</strong> {selectedAssignment.instructor?.name}
                  </p>
                  <p>
                    <strong>Maximum Marks:</strong> {selectedAssignment.maxMarks}
                  </p>
                  <p>
                    <strong>Due Date:</strong> {new Date(selectedAssignment.dueDate).toLocaleString()}
                  </p>
                  <p>
                    <strong>Submission Type:</strong> {selectedAssignment.submissionType}
                  </p>
                </div>

                <div className="instructions">
                  <h5>Instructions:</h5>
                  <div className="instruction-content">{selectedAssignment.instructions}</div>
                </div>

                {selectedAssignment.referenceFile && (
                  <div className="reference-section">
                    <h5>Reference Material:</h5>
                    <a
                      href={`http://localhost:5000${selectedAssignment.referenceFile.fileUrl}`}
                      className="reference-link"
                      download
                    >
                      📎 {selectedAssignment.referenceFile.fileName}
                    </a>
                  </div>
                )}

                {selectedAssignment.submission?.status === "graded" && (
                  <div className="grading-section">
                    <h5>Your Grade:</h5>
                    <div className="grade-card">
                      <p className="obtained-marks">
                        {selectedAssignment.submission.obtainedMarks}/{selectedAssignment.maxMarks}
                      </p>
                      {selectedAssignment.submission.feedback && (
                        <div className="feedback">
                          <h6>Feedback:</h6>
                          <p>{selectedAssignment.submission.feedback}</p>
                        </div>
                      )}
                      <p className="graded-date">
                        Graded on:{" "}
                        {new Date(selectedAssignment.submission.gradedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="submission-section">
                <h4>Submit Assignment</h4>

                {getAssignmentStatus(selectedAssignment) === "graded" ? (
                  <div className="submission-info">
                    <p>✓ You have already submitted and received grades for this assignment.</p>
                  </div>
                ) : (
                  <>
                    {selectedAssignment.submissionType === "text" ||
                    selectedAssignment.submissionType === "both" ? (
                      <div className="form-group">
                        <label>Your Response*</label>
                        <textarea
                          value={submissionForm.submissionText}
                          onChange={handleTextChange}
                          placeholder="Enter your response here..."
                          rows="6"
                        ></textarea>
                      </div>
                    ) : null}

                    {selectedAssignment.submissionType === "file" ||
                    selectedAssignment.submissionType === "both" ? (
                      <div className="form-group">
                        <label>Upload File*</label>
                        <input
                          type="file"
                          onChange={handleFileChange}
                          accept=".pdf,.doc,.docx,.zip,.txt,.jpg,.jpeg,.png,.gif"
                        />
                        {submissionForm.submissionFile && (
                          <p className="file-selected">
                            ✓ {submissionForm.submissionFile.name}
                          </p>
                        )}
                      </div>
                    ) : null}

                    {selectedAssignment.submission ? (
                      <div className="submission-info">
                        <p>
                          📤 submitted on:{" "}
                          {new Date(selectedAssignment.submission.submissionDate).toLocaleString()}
                        </p>
                        {selectedAssignment.submission.isLate && (
                          <p className="late-warning">⚠️ This was submitted after the deadline</p>
                        )}
                        {new Date() < new Date(selectedAssignment.dueDate) && (
                          <p className="can-resubmit" style={{marginLeft:"70px"}}>
                            You can re-submit before the deadline
                          </p>
                        )}
                      </div>
                    ) : null}

                    <button
                      className="btn-submit" 
                      onClick={handleSubmitAssignment}
                      disabled={submitting}
                    >
                      {submitting ? "Submitting..." : "Submit Assignment"}
                    </button>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select an assignment to view details and submit</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentAssignments;
