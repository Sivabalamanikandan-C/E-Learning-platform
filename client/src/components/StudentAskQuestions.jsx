import React, { useState, useEffect } from "react";
import axios from "axios";
import "../styles/StudentAskQuestions.css";

export default function StudentAskQuestions({ courseId, lectureIndex, lectureTitle, hasAccess }) {
  const [questions, setQuestions] = useState([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const token = localStorage.getItem("token");

  // Fetch questions for this lecture
  useEffect(() => {
    if (hasAccess && courseId && lectureIndex !== undefined) {
      fetchQuestions();
    } else {
      setLoading(false);
    }
  }, [courseId, lectureIndex, hasAccess]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `http://localhost:5000/api/questions/student/lecture/${courseId}/${lectureIndex}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setQuestions(response.data);
      setError("");
    } catch (err) {
      console.error("Error fetching questions:", err);
      setError("Failed to fetch questions");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      setError("Please enter a question");
      return;
    }

    try {
      setSubmitting(true);
      setError("");

      const response = await axios.post(
        "http://localhost:5000/api/questions/student/ask",
        {
          courseId,
          lectureIndex,
          lectureTitle,
          content: newQuestion,
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      setSuccessMessage("Question submitted successfully!");
      setNewQuestion("");

      // Add the new question to the list
      setQuestions([response.data.question, ...questions]);

      // Clear success message after 3 seconds
      setTimeout(() => setSuccessMessage(""), 3000);
    } catch (err) {
      console.error("Error submitting question:", err);
      setError(err.response?.data?.message || "Failed to submit question");
    } finally {
      setSubmitting(false);
    }
  };

  if (!hasAccess) {
    return (
      <div className="no-access-message">
        <p>🔒 Enroll in this course to ask questions</p>
      </div>
    );
  }

  if (loading) {
    return <div className="loading">Loading questions...</div>;
  }

  return (
    <div className="ask-questions-container">
      {error && <div className="alert alert-error">{error}</div>}
      {successMessage && <div className="alert alert-success">{successMessage}</div>}

      {/* Question Input Section */}
      <div className="question-input-section">
        <h3>📝 Ask a Question</h3>
        <p className="section-subtitle">Got a doubt? Ask it here and get answers from your instructor.</p>
        
        <textarea
          value={newQuestion}
          onChange={(e) => setNewQuestion(e.target.value)}
          placeholder="Type your question here..."
          className="question-textarea"
          rows={4}
        />
        
        <button
          onClick={handleSubmitQuestion}
          disabled={submitting || !newQuestion.trim()}
          className="submit-question-btn"
        >
          {submitting ? "Submitting..." : "Ask Question"}
        </button>
      </div>

      {/* Questions List Section */}
      <div className="questions-list-section">
        <h3>
          💬 Questions ({questions.length})
        </h3>

        {questions.length > 0 ? (
          <div className="questions-list">
            {questions.map((question) => (
              <div key={question._id} className="question-item">
                <div className="question-header">
                  <div className="question-meta">
                    <span className="student-name">You</span>
                    <span className="question-date">
                      {new Date(question.createdAt).toLocaleDateString()} at{" "}
                      {new Date(question.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className={`question-status status-${question.status}`}>
                    {question.status === "pending" ? "⏳ Pending" : "✓ Answered"}
                  </div>
                </div>

                <div className="question-content">
                  <p>{question.content}</p>
                </div>

                {question.answer && (
                  <div className="answer-section">
                    <div className="answer-header">
                      <span className="answer-label">📌 Instructor's Answer:</span>
                      <span className="answer-date">
                        {new Date(question.answer.answeredAt).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="answer-content">
                      <p>{question.answer.content}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="no-questions">
            <p>📭 No questions asked yet for this lecture</p>
            <p className="hint">Be the first to ask a question!</p>
          </div>
        )}
      </div>
    </div>
  );
}
