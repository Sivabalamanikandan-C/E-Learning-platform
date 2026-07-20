import { useState, useEffect } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function QuizResults() {
  const location = useLocation();
  const navigate = useNavigate();
  const { courseId } = useParams();
  const [submission, setSubmission] = useState(location.state?.submission || null);
  const [loading, setLoading] = useState(!submission);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (submission) {
      return;
    }

    const fetchSubmission = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("token");
        if (!token) {
          navigate("/login");
          return;
        }

        const response = await axios.get(
          `http://localhost:5000/api/quiz/${courseId}/my-submissions`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (response.data && response.data.length > 0) {
          setSubmission(response.data[0]); // Get the latest submission
        } else {
          setError("No submission found for this quiz.");
        }
      } catch (err) {
        console.error("Error fetching quiz results:", err);
        setError(err.response?.data?.message || "Failed to load quiz results.");
      } finally {
        setLoading(false);
      }
    };

    fetchSubmission();
  }, [courseId, navigate, submission]);

  console.log("autoSubmitted:", submission?.autoSubmitted);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading results...</p>
        </div>
      </div>
    );
  }

  if (error || !submission) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "No results found"}</p>
          <button
            onClick={() => navigate(`/student/course/${courseId}`)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Back to Course
          </button>
        </div>
      </div>
    );
  }

  const getGrade = (percentage) => {
    if (percentage >= 90) return { grade: "A+", color: "text-green-700" };
    if (percentage >= 80) return { grade: "A", color: "text-green-600" };
    if (percentage >= 70) return { grade: "B", color: "text-blue-600" };
    if (percentage >= 60) return { grade: "C", color: "text-yellow-600" };
    if (percentage >= 50) return { grade: "D", color: "text-orange-600" };
    return { grade: "F", color: "text-red-600" };
  };

  const gradeInfo = getGrade(submission.percentage);
  // Normalize answers shape: server may return { answers: { detailedAnswers: [...] } }
  const answersArray = Array.isArray(submission.answers)
    ? submission.answers
    : Array.isArray(submission.answers?.detailedAnswers)
    ? submission.answers.detailedAnswers
    : [];

  const answeredQuestions =
    typeof submission.answeredQuestions === "number"
      ? submission.answeredQuestions
      : answersArray.length;

  const correctAnswers = answersArray.filter((answer) => answer.isCorrect).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Back Button */}
      <div className="max-w-6xl mx-auto px-4 pt-6">
        <button
          onClick={() => navigate(`/student/course/${courseId}`)}
          className="text-blue-600 hover:text-blue-700 mb-6 flex items-center gap-2"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back to Course
        </button>
      </div>

      {/* Results Summary Card */}
      <div className="max-w-6xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          {/* Header */}
          <div className="from-blue-600 to-blue-700 text-white p-8 text-center">
            <h1 className="text-3xl font-bold mb-2"></h1>
            <p className="text-2xl" style={{color:"#667eea"}}>{submission.quizTitle}</p>
          </div>

          {/* Score Section */}
          <div className="p-8">
            <div className="flex justify-center gap-8 mb-8">
              {/* Main Score */}
              <div className="flex flex-col items-center justify-center text-center">
                <div className="relative w-40 h-40 mb-6">
                  <svg className="w-full h-full" viewBox="0 0 100 100">
                    {/* Background Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke="#e5e7eb"
                      strokeWidth="8"
                    />
                    {/* Progress Circle */}
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={
                        submission.percentage >= 70
                          ? "#10b981"
                          : submission.percentage >= 50
                            ? "#f59e0b"
                            : "#ef4444"
                      }
                      strokeWidth="8"
                      strokeDasharray={`${(submission.percentage / 100) * 283} 283`}
                      strokeLinecap="round"
                      transform="rotate(-90 50 50)"
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className={`text-5xl font-bold ${gradeInfo.color}`}>
                      {submission.percentage.toFixed(1)}%
                    </span>
                    <span className={`text-2xl font-bold ${gradeInfo.color}`}>
                      {gradeInfo.grade}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            {submission.autoSubmitted ? (
              <p style={{textAlign: "center", color: "red", fontSize: "20px", fontWeight: "bold"}}>
                Quiz automatically submitted due to inactivity.
              </p>
            ) : (
              <p style={{textAlign: "center", color: "green", fontSize: "20px", fontWeight: "bold"}}>
                Quiz submitted successfully.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Answer Review - only show if at least one question was answered */}
      {answeredQuestions > 0 && (
        <div className="max-w-6xl mx-auto px-4 py-6">
                  <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                    <div className="bg-gray-100 px-8 py-6">
                      <h2 className="text-2xl font-bold text-gray-900">Answer Review</h2>
                    </div>

                    <div className="p-8 space-y-6">
                      {answersArray.map((answer, index) => (
                        <div
                          key={index}
                          className={`p-6 rounded-lg border-2 ${answer.isCorrect ? "border-green-300 bg-green-50" : "border-red-300 bg-red-50"
                            }`}
                        >
                          {/* Question */}
                          <div className="mb-4">
                            <div className="flex items-start gap-3 mb-2">
                              <span
                                className={`text-lg font-bold px-3 py-1 rounded-full ${answer.isCorrect ? "bg-green-600 text-white" : "bg-red-600 text-white"
                                  }`}
                              >
                                Q{index + 1}
                              </span>
                              <span
                                className={`text-sm font-bold px-3 py-1 rounded-full ${answer.isCorrect ? "bg-green-200 text-green-800" : "bg-red-200 text-red-800"
                                  }`}
                              >
                                {answer.isCorrect ? "✓ Correct" : "✗ Incorrect"}
                              </span>
                              <span className="text-sm font-semibold text-gray-600 ml-auto">
                                Points: {answer.isCorrect ? answer.points : 0} / {answer.points}
                              </span>
                            </div>
                            <p className="text-lg font-semibold text-gray-900">{answer.questionText}</p>
                          </div>

                          {/* Options */}
                          <div className="space-y-2 mb-4">
                            {answer.options.map((option, optionIndex) => {
                              const isSelected = answer.selectedOption === optionIndex;
                              const isCorrect = answer.correctOption === optionIndex;

                              return (
                                <div
                                  key={optionIndex}
                                  className={`p-4 rounded-lg border-2 transition-all ${isCorrect
                                      ? "border-green-500 bg-green-100"
                                      : isSelected && !answer.isCorrect
                                        ? "border-red-500 bg-red-100"
                                        : "border-gray-300 bg-gray-50"
                                    }`}
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="font-bold text-gray-900">{String.fromCharCode(65 + optionIndex)}.</span>
                                    <span className="text-gray-900">{option}</span>

                                    {isCorrect && (
                                      <span className="ml-auto flex items-center gap-1 text-green-700 font-semibold text-sm">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path
                                            fillRule="evenodd"
                                            d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        Correct Answer
                                      </span>
                                    )}

                                    {isSelected && !answer.isCorrect && (
                                      <span className="ml-auto flex items-center gap-1 text-red-700 font-semibold text-sm">
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                                          <path
                                            fillRule="evenodd"
                                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                                            clipRule="evenodd"
                                          />
                                        </svg>
                                        Your Answer
                                      </span>
                                    )}

                                    {answer.selectedOption === undefined && isCorrect && (
                                      <span className="ml-auto flex items-center gap-1 text-blue-700 font-semibold text-sm">Not Answered</span>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="max-w-6xl mx-auto px-4 py-8">
                <div className="flex gap-4">
                  <button
                    onClick={() => navigate(`/student/course/${courseId}`)}
                    className="flex-1 bg-blue-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Back to Course
                  </button>
                  <button
                    onClick={() => navigate("/student/courses")}
                    className="flex-1 bg-gray-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-gray-700 transition"
                  >
                    Browse Courses
                  </button>
                </div>
              </div>
    </div>
  );
}
