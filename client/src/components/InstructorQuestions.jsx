import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/InstructorQuestions.css";

export default function InstructorQuestions() {
  const [questions, setQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [answerInputs, setAnswerInputs] = useState({});
  const [submittingAnswers, setSubmittingAnswers] = useState({});
  const [stats, setStats] = useState({ totalQuestions: 0, answeredQuestions: 0, pendingQuestions: 0 });

  const token = localStorage.getItem("token");

  // Fetch questions on mount
  useEffect(() => {
    fetchQuestions();
    fetchStats();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        "http://localhost:5000/api/questions/instructor/all",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setQuestions(response.data.grouped || {});
      setStats({
        totalQuestions: response.data.total || 0,
        answeredQuestions: response.data.answeredCount || 0,
        pendingQuestions: response.data.pendingCount || 0,
      });
      setError("");
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await axios.get(
        "http://localhost:5000/api/questions/instructor/stats",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setStats(response.data);
    } catch (err) {
      console.error("Error fetching statistics:", err);
    }
  };

  const handleAnswerChange = (questionId, value) => {
    setAnswerInputs((prev) => ({
      ...prev,
      [questionId]: value,
    }));
  };

  const handleSubmitAnswer = async (questionId) => {
    const answerContent = answerInputs[questionId]?.trim();

    if (!answerContent) {
      alert("Please enter an answer");
      return;
    }

    try {
      setSubmittingAnswers((prev) => ({
        ...prev,
        [questionId]: true,
      }));

      await axios.post(
        `http://localhost:5000/api/questions/${questionId}/answer`,
        { content: answerContent },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage("Answer submitted successfully!");
      setAnswerInputs((prev) => ({
        ...prev,
        [questionId]: "",
      }));

      // Refresh questions
      fetchQuestions();
      fetchStats();

      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error submitting answer:", err);
      setError(err.response?.data?.message || "Failed to submit answer");
    } finally {
      setSubmittingAnswers((prev) => ({
        ...prev,
        [questionId]: false,
      }));
    }
  };



  if (loading) {
    return <div className="loading">Loading questions...</div>;
  }

  const totalUnanswered = Object.values(questions).reduce((sum, lectures) => {
    return sum + Object.values(lectures).reduce((lecSum, qs) => lecSum + qs.length, 0);
  }, 0);

  return (
    <div className="instructor-questions-container">
      <div className="questions-header">
        <h1>💬 Student Questions</h1>
        <p className="header-subtitle">Answer student questions and help them learn better</p>
      </div>

      {/* Statistics */}
      <div className="questions-stats">
        <div className="stat-card">
          <span className="stat-label">Total Questions</span>
          <span className="stat-value">{stats.totalQuestions}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Answered</span>
          <span className="stat-value" style={{ color: "#28a745" }}>{stats.answeredQuestions}</span>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pending</span>
          <span className="stat-value" style={{ color: "#ffc107" }}>{stats.pendingQuestions}</span>
        </div>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* Questions List */}
      <div className="questions-list-container">
        {totalUnanswered === 0 && stats.totalQuestions === 0 ? (
          <div className="no-unanswered">
            <p>📭 No questions yet</p>
            <p className="hint">Student questions will appear here</p>
          </div>
        ) : totalUnanswered === 0 && stats.totalQuestions > 0 ? (
          <div className="all-answered">
            <p>✓ All questions have been answered!</p>
          </div>
        ) : (
          Object.keys(questions).map((courseName) => (
            <div key={courseName} className="course-questions-group">
              <div className="course-header">
                <h2>📚 {courseName}</h2>
                {/* <span className="question-count">
                  {Object.values(questions[courseName]).reduce((sum, qs) => sum + qs.length, 0)}
                </span> */}
              </div>

              <div className="lectures-group">
                  {Object.keys(questions[courseName]).map((lectureTitle) => {
                    const lectureKey = `${courseName}-${lectureTitle}`;
                    const lectureQuestions = questions[courseName][lectureTitle];

                    return (
                      <div key={lectureKey} className="lecture-group">
                        <div className="lecture-header">
                          <h3>🎥 {lectureTitle}</h3>
                          {/* <span className="question-count">
                            {lectureQuestions.length}
                          </span> */}
                        </div>

                        <div className="questions-in-lecture">
                            {lectureQuestions.map((question) => (
                              <div key={question._id} className="question-card">
                                <div className="question-meta">
                                  <span className="student-info">
                                    👤 {question.student?.name}
                                  </span>
                                  <span className="question-date">
                                    {new Date(question.createdAt).toLocaleDateString()}
                                  </span>
                                  <span className={`status status-${question.status}`}>
                                    {question.status === "pending" ? "⏳ Pending" : "✓ Answered"}
                                  </span>
                                </div>

                                <div className="question-content">
                                  <p className="student-question">{question.content}</p>
                                </div>

                                {question.status === "pending" ? (
                                  <div className="answer-form">
                                    <textarea
                                      value={answerInputs[question._id] || ""}
                                      onChange={(e) =>
                                        handleAnswerChange(question._id, e.target.value)
                                      }
                                      placeholder="Type your answer here..."
                                      className="answer-textarea"
                                      rows={3}
                                    />
                                    <button
                                      onClick={() => handleSubmitAnswer(question._id)}
                                      disabled={submittingAnswers[question._id]}
                                      className="submit-answer-btn"
                                    >
                                      {submittingAnswers[question._id]
                                        ? "Submitting..."
                                        : "Submit Answer"}
                                    </button>
                                  </div>
                                ) : (
                                  <div className="answer-section">
                                    <div className="answer-header">
                                      <span className="answer-label">Your Answer:</span>
                                      <span className="answer-date">
                                        {new Date(
                                          question.answer?.answeredAt
                                        ).toLocaleDateString()}
                                      </span>
                                    </div>
                                    <p className="answer-content">
                                      {question.answer?.content}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
