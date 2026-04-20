import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import "../styles/SubmissionGrading.css";

const SubmissionGrading = () => {
  const { assignmentId } = useParams();
  const [submissions, setSubmissions] = useState([]);
  const [assignment, setAssignment] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [gradingData, setGradingData] = useState({
    obtainedMarks: "",
    feedback: "",
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [stats, setStats] = useState(null);

  const token = localStorage.getItem("token");

  useEffect(() => {
    fetchData();
  }, [assignmentId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const [submissionsRes, assignmentRes, statsRes] = await Promise.all([
        axios.get(`http://localhost:5000/api/assignment/submissions/${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:5000/api/assignment/instructor/${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
        axios.get(`http://localhost:5000/api/assignment/stats/${assignmentId}`, {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      setSubmissions(submissionsRes.data);
      setAssignment(assignmentRes.data);
      setStats(statsRes.data);
      setError("");
    } catch (err) {
      console.error(err);
      setError("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSubmission = (submission) => {
    setSelectedSubmission(submission);
    setGradingData({
      obtainedMarks: submission.obtainedMarks || "",
      feedback: submission.feedback || "",
    });
  };

  const handleGradeChange = (e) => {
    const { name, value } = e.target;
    setGradingData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitGrade = async () => {
    if (!selectedSubmission) return;

    if (gradingData.obtainedMarks === "") {
      setError("Please enter obtained marks");
      return;
    }

    const marks = parseFloat(gradingData.obtainedMarks);
    if (marks > assignment.maxMarks) {
      setError(`Marks cannot exceed ${assignment.maxMarks}`);
      return;
    }

    try {
      await axios.post(
        `http://localhost:5000/api/assignment/grade/${selectedSubmission._id}`,
        {
          obtainedMarks: marks,
          feedback: gradingData.feedback,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage("Submission graded successfully!");
      setSelectedSubmission(null);
      setGradingData({ obtainedMarks: "", feedback: "" });
      fetchData();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.message || "Failed to grade submission");
    }
  };

  const getSubmissionStatus = (submission) => {
    if (submission.status === "graded") {
      return <span className="badge-graded">Graded</span>;
    } else if (submission.isLate) {
      return <span className="badge-late">Late Submission</span>;
    } else {
      return <span className="badge-submitted">Submitted</span>;
    }
  };

  if (loading) return <div className="loading">Loading submissions...</div>;

  return (
    <div className="submission-grading-container">
      <div className="grading-header">
        <div>
          <h2>Assignment: {assignment?.title}</h2>
          <p className="assignment-info">
            Max Marks: {assignment?.maxMarks} | Due: {new Date(assignment?.dueDate).toLocaleString()}
          </p>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {stats && (
        <div className="submission-stats">
          <div className="stat-box">
            <span className="stat-label">Total Enrolled</span>
            <span className="stat-value">{stats.totalEnrolled}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Submitted</span>
            <span className="stat-value pending">{stats.submitted}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Graded</span>
            <span className="stat-value graded">{stats.graded}</span>
          </div>
          <div className="stat-box">
            <span className="stat-label">Not Submitted</span>
            <span className="stat-value">{stats.notSubmitted}</span>
          </div>
        </div>
      )}

      <div className="grading-content">
        <div className="submissions-panel">
          <h3>Submissions ({submissions.length})</h3>
          <div className="submissions-list">
            {submissions.length === 0 ? (
              <p className="no-submissions">No submissions yet</p>
            ) : (
              submissions.map((submission) => (
                <div
                  key={submission._id}
                  className={`submission-item ${selectedSubmission?._id === submission._id ? "selected" : ""
                    }`}
                  onClick={() => handleSelectSubmission(submission)}
                >
                  <div className="submission-info">
                    <p className="student-name">Student Name :</p>
                    <p>{submission.student?.name}</p>

                    <p className="student-email">Student Email :</p>
                    <p>{submission.student?.email}</p>

                    <p className="submission-date">Submission Date :</p>
                    <p>{new Date(submission.submissionDate).toLocaleString()}</p>
                  </div>

                  <div className="submission-status">
                    {getSubmissionStatus(submission)}
                    {submission.obtainedMarks !== null && (
                      <span className="marks-badge">
                        {submission.obtainedMarks}/{assignment?.maxMarks}
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="grading-panel">
          {selectedSubmission ? (
            <>
              <h3>Grade Submission</h3>

              <div className="submission-detail">
                <h4>Student Name : {selectedSubmission.student?.name}</h4>
                <p className="email">Student Email : {selectedSubmission.student?.email}</p>

                <div className="submission-content">
                  {selectedSubmission.submissionText && (
                    <div className="text-submission">
                      <h5>Text Response:</h5>
                      <div className="text-content">{selectedSubmission.submissionText}</div>
                    </div>
                  )}

                  {selectedSubmission.submissionFile && (
                    <div className="file-submission">
                      <h5>Submitted File:</h5>
                      <a
                        href={`http://localhost:5000${selectedSubmission.submissionFile.fileUrl}`}
                        className="file-link"
                        download
                      >
                        📥 {selectedSubmission.submissionFile.fileName}
                      </a>
                    </div>
                  )}

                  <div className="submission-meta">
                    <p>Submitted: {new Date(selectedSubmission.submissionDate).toLocaleString()}</p>
                    {selectedSubmission.isLate && <p className="late-badge">⚠️ Late Submission</p>}
                  </div>
                </div>
              </div>

              <div className="grading-form">
                <div className="form-group">
                  <label>
                    Marks ({assignment?.maxMarks} max)*
                  </label>
                  <input
                    type="number"
                    name="obtainedMarks"
                    value={gradingData.obtainedMarks}
                    onChange={handleGradeChange}
                    min="0"
                    max={assignment?.maxMarks}
                    placeholder="Enter marks"
                    disabled={selectedSubmission.status === "graded"}
                  />
                </div>

                <div className="form-group">
                  <label>Feedback (Optional)</label>
                  <textarea
                    name="feedback"
                    value={gradingData.feedback}
                    onChange={handleGradeChange}
                    placeholder="Provide feedback to the student"
                    rows="4"
                    disabled={selectedSubmission.status === "graded"}
                  ></textarea>
                </div>

                <button
                  className="btn-grade"
                  onClick={handleSubmitGrade}
                  disabled={selectedSubmission.status === "graded"}
                >
                  {selectedSubmission.status === "graded" ? "Already Graded" : "Submit Grade"}
                </button>
              </div>
            </>
          ) : (
            <div className="no-selection">
              <p>Select a submission to grade</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SubmissionGrading;
