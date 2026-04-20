import { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

export default function Quiz() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [course, setCourse] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [quizStarted, setQuizStarted] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  const [activeSessionInfo, setActiveSessionInfo] = useState(null);
  const [isActiveElsewhere, setIsActiveElsewhere] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const bcRef = useRef(null);
  const hasSubmittedRef = useRef(false);
  const visibilityHandlerRef = useRef(null);
  const blurHandlerRef = useRef(null);
  const keydownHandlerRef = useRef(null);
  const beforeUnloadHandlerRef = useRef(null);

  useEffect(() => {
    fetchCourseDetails();
  }, [courseId]);

  // Keep track of active quiz sessions across tabs using localStorage and BroadcastChannel
  useEffect(() => {
    const key = `quiz_active_${courseId}`;

    // Listen for storage events (other tabs) to detect active session
    const onStorage = (e) => {
      if (e.key !== key) return;
      try {
        const info = e.newValue ? JSON.parse(e.newValue) : null;
        setActiveSessionInfo(info);
        setIsActiveElsewhere(!!info && info.sessionId !== sessionId);
      } catch (err) {
        // ignore parse errors
      }
    };

    window.addEventListener("storage", onStorage);

    // BroadcastChannel for same-origin tabs (more immediate)
    try {
      bcRef.current = new BroadcastChannel(`quiz_channel_${courseId}`);
      bcRef.current.onmessage = (msg) => {
        if (!msg?.data) return;
        if (msg.data.type === "ACTIVE_SESSION") {
          setActiveSessionInfo(msg.data.info || null);
          setIsActiveElsewhere(!!msg.data.info && msg.data.info.sessionId !== sessionId);
        }
        if (msg.data.type === "CLEAR_SESSION") {
          setActiveSessionInfo(null);
          setIsActiveElsewhere(false);
        }
      };
    } catch (err) {
      // BroadcastChannel may not be available; storage events still work
    }

    // initialize from storage
    try {
      const existing = localStorage.getItem(key);
      const info = existing ? JSON.parse(existing) : null;
      setActiveSessionInfo(info);
      setIsActiveElsewhere(!!info);
    } catch (err) {}

    return () => {
      window.removeEventListener("storage", onStorage);
      try {
        if (bcRef.current) bcRef.current.close();
      } catch (err) {}
    };
  }, [courseId, sessionId]);

  const fetchCourseDetails = async () => {
    try {
      const response = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}`
      );
      const courseData = response.data.course;
      setCourse(courseData);
      if (courseData.quiz) {
        setQuiz(courseData.quiz);
        setTimeLeft(courseData.quiz.timeLimit * 60); // Convert minutes to seconds
      }
      setLoading(false);
    } catch (err) {
      console.error("Error fetching course details:", err);
      setError("Failed to load quiz");
      setLoading(false);
    }
  };

  // Timer countdown
  useEffect(() => {
    if (!quizStarted || timeLeft === 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Time's up - auto submit
            handleSubmitQuiz(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [quizStarted, timeLeft]);

  // Prevent opening new tabs and detect visibility changes while quiz is active
  useEffect(() => {
    if (!quizStarted) return;
    // ignore visibility/blur events once submission started
    if (hasSubmittedRef.current) return;
    const handleKeyDown = (e) => {
      const key = (e.key || "").toLowerCase();
      // Block common new-tab/window shortcuts: Ctrl/Cmd+T, Ctrl/Cmd+N, Ctrl/Cmd+W
      if ((e.ctrlKey || e.metaKey) && (key === "t" || key === "n" || key === "w")) {
        e.preventDefault();
        e.stopPropagation();
        setError("Opening a new tab or window is disabled during the quiz.");
      }
      // Block F11 (fullscreen) which may be used to bypass monitoring
      if (key === "f11") {
        e.preventDefault();
        e.stopPropagation();
      }
    };

    

    const handleVisibilityChange = () => {
      if (hasSubmittedRef.current) return;
      if (document.hidden) {
        // Auto-submit when user switches tabs or minimizes
        setError("You left the quiz. Your answers are being submitted.");
        // ensure submission runs asynchronously to allow UI update
        setTimeout(() => {
            handleSubmitQuiz(true);
        }, 200);
      }
    };

    const handleBlur = () => {
      if (hasSubmittedRef.current) return;
      // treat blur the same as visibility change for extra safety
      if (document.hidden) return;
      setError("You left the quiz. Your answers are being submitted.");
      setTimeout(() => {
          handleSubmitQuiz(true);
      }, 200);
    };

    const handleBeforeUnload = (e) => {
      // Warn the user if they try to close/refresh the page during quiz
      e.preventDefault();
      e.returnValue = "";
      return "";
    };

    // store handlers in refs so they can be removed elsewhere (e.g., on manual submit)
    keydownHandlerRef.current = handleKeyDown;
    visibilityHandlerRef.current = handleVisibilityChange;
    blurHandlerRef.current = handleBlur;
    beforeUnloadHandlerRef.current = handleBeforeUnload;

    document.addEventListener("keydown", keydownHandlerRef.current, true);
    document.addEventListener("visibilitychange", visibilityHandlerRef.current);
    window.addEventListener("blur", blurHandlerRef.current);
    window.addEventListener("beforeunload", beforeUnloadHandlerRef.current);

    return () => {
      document.removeEventListener("keydown", keydownHandlerRef.current, true);
      document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
      window.removeEventListener("blur", blurHandlerRef.current);
      window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
    };
  }, [quizStarted, hasSubmitted]);

  // Active-tab coordination: claim active slot when quiz starts, release on submit/unload
  useEffect(() => {
    const key = `quiz_active_${courseId}`;
    if (!quizStarted) return;

    const sid = sessionId || `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    setSessionId(sid);
    const info = { sessionId: sid, startedAt: Date.now() };

    try {
      localStorage.setItem(key, JSON.stringify(info));
    } catch (err) {}

    try {
      if (bcRef.current) bcRef.current.postMessage({ type: "ACTIVE_SESSION", info });
    } catch (err) {}

    const cleanup = () => {
      try {
        const current = JSON.parse(localStorage.getItem(key) || "null");
        if (current && current.sessionId === sid) {
          localStorage.removeItem(key);
        }
      } catch (err) {}
      try {
        if (bcRef.current) bcRef.current.postMessage({ type: "CLEAR_SESSION" });
      } catch (err) {}
    };

    window.addEventListener("unload", cleanup);

    return () => {
      cleanup();
      window.removeEventListener("unload", cleanup);
    };
  }, [quizStarted, courseId, sessionId]);

  // Start button handler that respects active-session
  const handleStartClick = () => {
    const key = `quiz_active_${courseId}`;
    try {
      const existing = localStorage.getItem(key);
      if (existing) {
        const info = JSON.parse(existing);
        // If another tab holds active session and it's not this tab, prevent start
        if (info && info.sessionId && info.sessionId !== sessionId) {
          setError("A quiz session is already active in another tab. Close it or take over to start here.");
          setIsActiveElsewhere(true);
          return;
        }
      }
    } catch (err) {}

    // claim and start
    const sid = `${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
    setSessionId(sid);
    // reset submission guard when starting a fresh quiz
    setHasSubmitted(false);
    hasSubmittedRef.current = false;
    const info = { sessionId: sid, startedAt: Date.now() };
    try { localStorage.setItem(key, JSON.stringify(info)); } catch (err) {}
    try { if (bcRef.current) bcRef.current.postMessage({ type: "ACTIVE_SESSION", info }); } catch (err) {}
    setQuizStarted(true);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  const handleAnswerChange = (questionIndex, selectedOption) => {
    setAnswers({
      ...answers,
      [questionIndex]: selectedOption,
    });
  };

  const handleSubmitQuiz = async (isAuto = false) => {
    if (submitting || hasSubmittedRef.current) return;

    // mark submitted to prevent auto-submit races (use ref for immediate effect)
    hasSubmittedRef.current = true;
    setHasSubmitted(true);

    try {
      setSubmitting(true);
      const token = localStorage.getItem("token");

      if (!token) {
        navigate("/login");
        return;
      }

      // Calculate marks
      const marks = calculateMarks();
      const totalMarks = calculateTotalMarks();

      // Prevent division by zero
      if (totalMarks === 0) {
        setError("Quiz has no questions with points");
        setSubmitting(false);
        return;
      }

      const submissionData = {
        quizTitle: quiz.title,
        totalQuestions: quiz.questions.length,
        answeredQuestions: Object.keys(answers).length,
        totalMarks: totalMarks,
        obtainedMarks: marks,
        percentage: (marks / totalMarks) * 100,
        timeSpent: quiz.timeLimit * 60 - timeLeft,
        answers: quiz.questions.map((question, index) => ({
          questionText: question.questionText,
          selectedOption: answers[index] !== undefined ? answers[index] : null,
          correctOption: question.options.findIndex((opt) => opt.isCorrect),
          isCorrect:
            answers[index] !==undefined &&
            answers[index] ===
            question.options.findIndex((opt) => opt.isCorrect),
          points: question.points || 0,
          options: question.options.map((opt) => opt.optionText),
        })),
      };

      // If this is a manual submit, remove listeners and release active session
      if (!isAuto) {
        try {
          if (keydownHandlerRef.current)
            document.removeEventListener("keydown", keydownHandlerRef.current, true);
          if (visibilityHandlerRef.current)
            document.removeEventListener("visibilitychange", visibilityHandlerRef.current);
          if (blurHandlerRef.current)
            window.removeEventListener("blur", blurHandlerRef.current);
          if (beforeUnloadHandlerRef.current)
            window.removeEventListener("beforeunload", beforeUnloadHandlerRef.current);
        } catch (remErr) {
          console.warn("Error removing auto-submit listeners:", remErr);
        }

        // clear active session entry and notify other tabs
        try {
          const key = `quiz_active_${courseId}`;
          const current = JSON.parse(localStorage.getItem(key) || "null");
          if (current && current.sessionId === sessionId) {
            localStorage.removeItem(key);
          }
        } catch (err) {}
        try { if (bcRef.current) bcRef.current.postMessage({ type: "CLEAR_SESSION" }); } catch (err) {}
      }

      // Do NOT send autoSubmitted in body. Use header for auto-submit only.
      console.log("Submitting quiz data:", submissionData, "isAuto:", isAuto);

      // Build headers, include x-auto-submit only for auto submits
      const headers = {
        Authorization: `Bearer ${token}`,
      };
      if (isAuto) headers["x-auto-submit"] = "true";

      const response = await axios.post(
        `http://localhost:5000/api/student/courses/${courseId}/quiz/submit`,
        submissionData,
        {
          headers,
        }
      );

      console.log("Quiz submission successful:", response.data);

      // Prefer server-side submission record (has authoritative autoSubmitted flag)
      const serverSubmission = response.data?.submission || null;
      navigate(`/student/course/${courseId}/quiz-results`, {
        state: { submission: serverSubmission || submissionData },
      });
    } catch (err) {
      console.error("Error submitting quiz:", err);
      const errorMessage = err.response?.data?.message || err.message || "Failed to submit quiz";
      console.error("Detailed error:", {
        status: err.response?.status,
        data: err.response?.data,
        message: errorMessage,
      });
      setError(errorMessage);
      setSubmitting(false);
    }
  };

  const calculateMarks = () => {
    let totalMarks = 0;
    quiz.questions.forEach((question, index) => {
      const correctOptionIndex = question.options.findIndex(
        (opt) => opt.isCorrect
      );
      if (answers[index] === correctOptionIndex) {
        totalMarks += question.points || 0;
      }
    });
    return totalMarks;
  };

  const calculateTotalMarks = () => {
    return quiz.questions.reduce((sum, question) => sum + (question.points || 0), 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quiz) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "No quiz available"}</p>
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

  if (!quizStarted) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-lg max-w-2xl w-full p-8">
          {/* Back Button */}
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

          {/* Quiz Info */}
          <h1 className="text-4xl font-bold text-gray-900 mb-4">{quiz.title}</h1>

          {quiz.description && (
            <p className="text-gray-700 mb-6">{quiz.description}</p>
          )}

          {/* Quiz Details */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Quiz Details
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600">Total Questions</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quiz.questions.length}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Time Limit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {quiz.timeLimit} minutes
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Marks</p>
                <p className="text-2xl font-bold text-gray-900">
                  {calculateTotalMarks()}
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Question Types</p>
                <p className="text-lg font-semibold text-gray-900">
                  MCQ
                </p>
              </div>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">
              Important Instructions
            </h2>
            <ul className="space-y-2 text-sm text-gray-700">
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-1">•</span>
                <span>
                  Answer all questions carefully. Each correct answer will award
                  you the specified points.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-1">•</span>
                <span>
                  You have {quiz.timeLimit} minutes to complete the quiz. The timer
                  will start when you click "Start Quiz".
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-1">•</span>
                <span>
                  Once the time is up, the quiz will be automatically submitted.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-1">•</span>
                <span>
                  You cannot go back to previous questions after moving forward.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-yellow-600 font-bold mt-1">•</span>
                <span>
                  After submitting, you will see your results with correct answers.
                </span>
              </li>
            </ul>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStartClick}
            className="w-full bg-green-600 text-white py-4 px-6 rounded-lg font-bold text-lg hover:bg-green-700 transition"
            disabled={isActiveElsewhere}
            title={isActiveElsewhere ? "Another tab has an active quiz session" : "Start Quiz"}
          >
            🚀 Start Quiz
          </button>
        </div>
      </div>
    );
  }

  // Quiz Taking Interface
  const currentQuestion = quiz.questions[currentQuestionIndex];
  const selectedAnswer = answers[currentQuestionIndex];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Error Alert */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-600 text-red-700 p-4 mb-4" role="alert">
          <p className="font-bold">Error</p>
          <p>{error}</p>
        </div>
      )}

      {/* Header with Timer */}
      <div className="sticky top-0 bg-white shadow-md z-50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          {/* Quiz Title */}
          <div>
            <h1 className="text-xl font-bold text-gray-900">{quiz.title}</h1>
            <p className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </p>
          </div>

          {/* Timer */}
          <div
            className={`text-center px-6 py-3 rounded-lg font-bold text-lg ${
              timeLeft < 60
                ? "bg-red-100 text-red-700"
                : "bg-blue-100 text-blue-700"
            }`}
          >
            ⏱️ {formatTime(timeLeft)}
          </div>

          {/* Exit Button */}
          <button
            onClick={() => {
              if (
                window.confirm(
                  "Are you sure you want to exit? Your progress will be saved."
                )
              ) {
                navigate(`/student/course/${courseId}`);
              }
            }}
            className="text-gray-600 hover:text-red-600 transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Questions List */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-md p-4 sticky top-28">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Questions</h2>
              <div className="grid grid-cols-4 gap-2">
                {quiz.questions.map((_, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentQuestionIndex(index)}
                    className={`w-10 h-10 rounded-lg font-semibold transition-all ${
                      index === currentQuestionIndex
                        ? "bg-blue-600 text-white ring-2 ring-blue-400"
                        : answers[index] !== undefined
                        ? "bg-green-500 text-white hover:bg-green-600"
                        : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    }`}
                  >
                    {index + 1}
                  </button>
                ))}
              </div>

              {/* Progress Info */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <p className="text-sm text-gray-600">
                  Answered: {Object.keys(answers).length} /{" "}
                  {quiz.questions.length}
                </p>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all"
                    style={{
                      width: `${(Object.keys(answers).length / quiz.questions.length) * 100}%`,
                    }}
                  ></div>
                </div>
              </div>
            </div>
          </div>

          {/* Question & Options */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-lg shadow-md p-8">
              {/* Question */}
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  Question {currentQuestionIndex + 1}
                </h2>
                <p className="text-xl text-gray-800 mb-2">
                  {currentQuestion.questionText}
                </p>
                <p className="text-sm text-gray-600">
                  Points: <span className="font-semibold">{currentQuestion.points || 0}</span>
                </p>
              </div>

              {/* Options */}
              <div className="space-y-3 mb-8">
                {currentQuestion.options.map((option, optionIndex) => (
                  <label
                    key={optionIndex}
                    className={`flex items-center p-4 rounded-lg border-2 cursor-pointer transition-all ${
                      selectedAnswer === optionIndex
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 bg-gray-50 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name={`question-${currentQuestionIndex}`}
                      value={optionIndex}
                      checked={selectedAnswer === optionIndex}
                      onChange={() =>
                        handleAnswerChange(currentQuestionIndex, optionIndex)
                      }
                      className="w-4 h-4 text-blue-600"
                    />
                    <span className="ml-3 text-gray-900">
                      {option.optionText}
                    </span>
                  </label>
                ))}
              </div>

              {/* Navigation Buttons */}
              <div className="flex gap-4">
                <button
                  onClick={() =>
                    setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))
                  }
                  disabled={currentQuestionIndex === 0}
                  className="flex-1 px-6 py-3 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  ← Previous
                </button>

                {currentQuestionIndex < quiz.questions.length - 1 ? (
                  <button
                    onClick={() =>
                      setCurrentQuestionIndex(currentQuestionIndex + 1)
                    }
                    className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition"
                  >
                    Next →
                  </button>
                ) : (
                  <button
                    onClick={() => handleSubmitQuiz(false)}
                    disabled={submitting}
                    className="flex-1 px-6 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition disabled:bg-gray-400"
                  >
                    {submitting ? "Submitting..." : "Submit Quiz 🎯"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
