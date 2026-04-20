import { useState, useEffect } from "react";
import { useParams, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/CourseTrack.css";

export default function CourseTrack() {
  const { courseId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [courseData, setCourseData] = useState(null);
  const [progressData, setProgressData] = useState(null);
  const [lecturesList, setLecturesList] = useState([]);
  const [lecturesProgress, setLecturesProgress] = useState({});
  const [quizzesList, setQuizzesList] = useState([]);
  const [assignmentsList, setAssignmentsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    setActiveTab("overview");
    const navCourse = location.state?.course;
    const navProgress = location.state?.progress;
    if (navCourse) setCourseData(navCourse);
    if (navProgress) {
      const raw = navProgress || {};
      const p = {
        overallProgress: Math.round(raw.overallProgress ?? 0),
        displayProgress: Math.round(raw.displayProgress ?? raw.overallProgress ?? 0),
        lectures: {
          completed: raw.lectures?.completed ?? 0,
          total: raw.lectures?.total ?? 0,
          percentage: raw.lectures?.percentage ?? 0,
        },
        assignments: {
          submitted: raw.assignments?.submitted ?? 0,
          total: raw.assignments?.total ?? 0,
          submissionPercentage: raw.assignments?.submissionPercentage ?? 0,
        },
        quiz: {
          hasQuiz: raw.quiz?.hasQuiz ?? !!navCourse?.quiz,
          completed: raw.quiz?.completed ?? false,
          percentage: raw.quiz?.percentage ?? 0,
          score: raw.quiz?.score ?? null,
          totalPoints: raw.quiz?.totalPoints ?? null,
          completionDate: raw.quiz?.completionDate ?? null,
          autoSubmitted: raw.quiz?.autoSubmitted ?? false,
        },
      };
      setProgressData(p);
    }

    fetchCourseTrackData();
  }, [courseId]);

  const fetchCourseTrackData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const courseResponse = await axios.get(
        `http://localhost:5000/api/student/courses/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const enrollmentResponse = await axios.get(
        `http://localhost:5000/api/student/enrollments/${courseId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const raw = enrollmentResponse.data.course.progressDetail || {};
      const overall = enrollmentResponse.data.course.progress || 0;

      const p = {
        overallProgress: overall,
        displayProgress: overall,
        lectures: {
          completed: raw.lectures?.completed ?? 0,
          total: raw.lectures?.total ?? 0,
          percentage: raw.lectures?.percentage ?? 0,
        },
        assignments: {
          submitted: raw.assignments?.submitted ?? 0,
          total: raw.assignments?.total ?? 0,
          submissionPercentage: raw.assignments?.percentage ?? 0,
        },
        quiz: {
          hasQuiz: raw.quiz?.hasQuiz ?? !!courseResponse.data.course?.quiz,
          completed: raw.quiz?.completed ?? false,
          percentage: raw.quiz?.percentage ?? (raw.quiz?.completed ? 100 : 0),
          score: raw.quiz?.score ?? null,
          totalPoints: raw.quiz?.totalPoints ?? null,
          completionDate: raw.quiz?.completionDate ?? null,
          autoSubmitted: raw.quiz?.autoSubmitted ?? false,
        },
      };

      setCourseData(courseResponse.data.course);
      setProgressData(p);

      if (courseResponse.data.course.lectures) {
        setLecturesList(courseResponse.data.course.lectures);
      }

      if (courseResponse.data.course.quiz) {
        const quiz = courseResponse.data.course.quiz;
        if (!quiz.course || String(quiz.course) === String(courseId) || (quiz.course?._id && String(quiz.course._id) === String(courseId))) {
          setQuizzesList([quiz]);
        } else {
          setQuizzesList([]);
        }
      } else {
        setQuizzesList([]);
      }

      const assignmentsResponse = await axios.get(
        `http://localhost:5000/api/student/course/${courseId}/assignments`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const allAssignments = assignmentsResponse.data.assignments || [];
      const filteredAssignments = allAssignments.filter((a) => {
        if (!a) return false;
        if (!a.course) return true;
        return String(a.course) === String(courseId) || (a.course._id && String(a.course._id) === String(courseId));
      });
      setAssignmentsList(filteredAssignments);

      const lectureProgressResponse = await axios.get(
        `http://localhost:5000/api/student/course/${courseId}/lectures-progress`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setLecturesProgress(lectureProgressResponse.data.lecturesProgress || {});
      setError(null);
    } catch (err) {
      console.error("Error fetching course track data:", err);
      setError(err.response?.data?.message || "Failed to load course track data");
    } finally {
      setLoading(false);
    }
  };

  // Derived quiz object
  const quiz = (quizzesList && quizzesList.length > 0) ? quizzesList[0] : (courseData?.quiz || null);

  // Determine whether we should show the 'auto-submitted due to inactivity' state (robust checks)
  const quizAutoSubmittedDisplay = Boolean(progressData?.quiz?.autoSubmitted) || (
    progressData?.quiz?.percentage != null && Number(progressData.quiz.percentage) === 0 && progressData.quiz.completed !== true
  ) || (
    progressData?.quiz?.score === 0 && progressData.quiz.completed !== true
  );

  const quizStatus = quizAutoSubmittedDisplay
    ? "Quiz automatically completed"
    : progressData?.quiz?.completed
    ? "Completed"
    : "Pending";

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  return (
    <div className="course-track">
      <div className="detail-item">
        <span className="label">Questions:</span>
        <span className="value">{quiz.questions?.length ?? 0}</span>
      </div>
      <div className="detail-item">
        <span className="label">Time Limit:</span>
        <span className="value">{quiz.timeLimit ? `${quiz.timeLimit} mins` : "No Limit"}</span>
      </div>

      {progressData.quiz.completed && (
        <>
          <div className="detail-item highlight">
            <span className="label">Score:</span>
            <span className="value">
              {quizStatus === "Quiz automatically completed"
                ? "Quiz automatically completed"
                : (() => {
                    const score = progressData.quiz.score;
                    const total = progressData.quiz.totalPoints;
                    const percentage = progressData.quiz.percentage;

                    if (score != null && total != null) return `${score} / ${total}`;
                    if (percentage != null && total != null) {
                      const computed = Math.round((percentage / 100) * total);
                      return `${computed} / ${total}`;
                    }
                    if (score != null && percentage != null && percentage > 0) {
                      const computed = Math.round((score * 100) / percentage);
                      return `${score} / ${computed}`;
                    }
                    return "N/A";
                  })()}
            </span>
          </div>

          <div className="detail-item highlight">
            <span className="label">Percentage:</span>
            <span className="value">{quizStatus === "Quiz automatically completed" ? "Quiz automatically completed" : `${progressData.quiz.percentage ?? "N/A"}%`}</span>
          </div>

          {progressData.quiz.completionDate && (
            <div className="detail-item"><span className="label">Completed:</span><span className="value">{new Date(progressData.quiz.completionDate).toLocaleDateString()}</span></div>
          )}
        </>
      )}

      {quizStatus === "Quiz automatically completed" && (
        <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
          <p style={{ color: "#dc2626", fontSize: "0.9rem", fontWeight: "600", marginTop: "0.5rem" }}>Quiz automatically completed</p>
        </div>
      )}

      <div className="tab-content">
        {activeTab === "overview" && (
          <div className="overview-tab">
            <div className="summary-card">
              <h2>Course Overview</h2>
              <div className="summary-grid">
                <div className="summary-item">
                  <div className="stat-icon" style={{ fontSize: "2rem", marginBottom: "10px" }}>📊</div>
                  <div className="stat-content">
                    <p className="stat-label" style={{ fontSize: "1rem", color: "#666" }}>Overall Progress</p>
                    <p className="stat-value" style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#333" }}>{courseData.status === "Completed" ? 100 : progressData.displayProgress}%</p>
                    <p className="stat-percentage" style={{ color: (progressData.displayProgress >= 100 || courseData.status === "Completed") ? "green" : "#666" }}>{(progressData.displayProgress >= 100 || courseData.status === "Completed") ? "Completed" : "In Progress"}</p>
                    <div className="smc-progress-section" style={{ marginTop: "12px" }}>
                      <div className="smc-progress-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span className="smc-progress-label">Progress</span>
                        <span className="smc-progress-percentage">{courseData.status === "Completed" ? 100 : progressData.displayProgress}%</span>
                      </div>
                      <div className="smc-progress-bar" style={{ marginTop: '8px' }}>
                        <div className="smc-progress-fill" style={{ width: `${courseData.status === "Completed" ? 100 : progressData.displayProgress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="summary-item">
                  <div className="stat-icon" style={{ fontSize: "2rem", marginBottom: "10px" }}>🎬</div>
                  <div className="stat-content">
                    <p className="stat-label" style={{ fontSize: "1rem", color: "#666" }}>Lectures</p>
                    <p className="stat-value" style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#333" }}>{progressData.lectures.completed}/{progressData.lectures.total}</p>
                    <p className="stat-percentage" style={{ color: "#666" }}>{progressData.displayProgress}%</p>
                  </div>
                </div>

                <div className="summary-item">
                  <div className="stat-icon" style={{ fontSize: "2rem", marginBottom: "10px" }}>{quizAutoSubmittedDisplay ? "⚠️" : (progressData.quiz.completed ? "✅" : "📋")}</div>
                  <div className="stat-content">
                    <p className="stat-label" style={{ fontSize: "1rem", color: "#666" }}>Quiz</p>
                    {quizAutoSubmittedDisplay ? (
                      <p className="stat-value" style={{ color: "#dc2626", fontWeight: "600", fontSize: "1rem" }}>Quiz autosubmitted</p>
                    ) : (
                      <p className="stat-value" style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#333" }}>{quizStatus}</p>
                    )}
                    {progressData.quiz.completed && quizStatus === "Completed" && progressData.quiz.percentage !== 0 && (
                      <p className="stat-percentage" style={{ color: "#666" }}>{`${progressData.quiz.percentage}%`}</p>
                    )}
                  </div>
                </div>

                <div className="summary-item">
                  <div className="stat-icon" style={{ fontSize: "2rem", marginBottom: "10px" }}>✏️</div>
                  <div className="stat-content">
                    <p className="stat-label" style={{ fontSize: "1rem", color: "#666" }}>Assignments</p>
                    <p className="stat-value" style={{ fontSize: "1.5rem", fontWeight: "bold", color: "#333" }}>{progressData.assignments.submitted}/{progressData.assignments.total}</p>
                    <p className="stat-percentage" style={{ color: "#666" }}>{progressData.displayProgress}%</p>
                  </div>
                </div>
              </div>

              <div className="breakdown-section">
                <h3>Detailed Progress</h3>
                <div className="breakdown-items">
                  <div className="breakdown-item">
                    <span className="label">Lectures Completed:</span>
                    <span className="value">{progressData.lectures.completed} / {progressData.lectures.total}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Quiz Status:</span>
                    <span className="value">{progressData.quiz.hasQuiz ? quizStatus : "N/A"}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Assignments Submitted:</span>
                    <span className="value">{progressData.assignments.submitted} / {progressData.assignments.total}</span>
                  </div>
                  <div className="breakdown-item">
                    <span className="label">Overall Completion:</span>
                    <span className="value">{progressData.displayProgress}%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "lectures" && (
          <div className="lectures-tab">
            <div className="tab-header">
              <h2>Lecture Progress</h2>
              <p className="stats">{progressData.lectures.completed} of {progressData.lectures.total} lectures completed</p>
            </div>

            {lecturesList.length === 0 ? (
              <div className="empty-state"><p>No lectures found</p></div>
            ) : (
              <div className="lectures-list">
                {lecturesList.map((lecture, index) => {
                  const lectureProgressData = lecturesProgress[index];
                  const isCompleted = lectureProgressData?.isCompleted || false;
                  return (
                    <div key={index} className={`lecture-item ${isCompleted ? "completed" : ""}`}>
                      <div className="lecture-number"><span className="number">{index + 1}</span></div>
                      <div className="lecture-details">
                        <h4>{lecture.title || `Lecture ${index + 1}`}</h4>
                        <p className="status">{isCompleted ? <span className="status-badge success">✓ Completed</span> : <span className="status-badge pending">⏳ Not Completed</span>}</p>
                      </div>
                      <div className="lecture-action">{lecture.freePreview && <span className="free-badge">FREE</span>}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "quizzes" && (
          <div className="quizzes-tab">
            {!quiz ? (
              <div className="empty-state"><p>No quiz available for this course</p></div>
            ) : (
              <div className="quiz-details">
                <div className="detail-item"><span className="label">Questions:</span><span className="value">{quiz.questions?.length ?? 0}</span></div>
                <div className="detail-item"><span className="label">Time Limit:</span><span className="value">{quiz.timeLimit ? `${quiz.timeLimit} mins` : "No Limit"}</span></div>

                {progressData.quiz.completed && (
                  <>
                    <div className="detail-item highlight">
                      <span className="label">Score:</span>
                      <span className="value">{
                        quizAutoSubmittedDisplay
                          ? `0 / ${progressData.quiz.totalPoints || "N/A"}`
                          : (() => {
                              const score = progressData.quiz.score;
                              const total = progressData.quiz.totalPoints;
                              const percentage = progressData.quiz.percentage;

                              if (score != null && total != null) return `${score} / ${total}`;
                              if (percentage != null && total != null) {
                                const computed = Math.round((percentage / 100) * total);
                                return `${computed} / ${total}`;
                              }
                              if (score != null && percentage != null && percentage > 0) {
                                const computed = Math.round((score * 100) / percentage);
                                return `${score} / ${computed}`;
                              }
                              return "N/A";
                            })()
                      }</span>
                    </div>

                    <div className="detail-item highlight"><span className="label">Percentage:</span><span className="value">{quizStatus === "Quiz automatically completed" ? "Quiz automatically completed" : `${progressData.quiz.percentage ?? "N/A"}%`}</span></div>

                    {progressData.quiz.completionDate && (
                      <div className="detail-item"><span className="label">Completed:</span><span className="value">{new Date(progressData.quiz.completionDate).toLocaleDateString()}</span></div>
                    )}
                  </>
                )}

                {quizStatus === "Quiz automatically completed" && (
                  <div className="detail-item" style={{ gridColumn: "1 / -1" }}>
                    <p style={{ color: "#dc2626", fontSize: "0.9rem", fontWeight: "600", marginTop: "0.5rem" }}>Quiz automatically completed</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === "assignments" && (
          <div className="assignments-tab">
            <div className="tab-header"><h2>Assignment Progress</h2><p className="stats">{progressData.assignments.submitted} of {progressData.assignments.total} submitted</p></div>

            {assignmentsList.length === 0 ? (
              <div className="empty-state"><p>No assignments found</p></div>
            ) : (
              <div className="assignments-list">
                {assignmentsList.map((assignment) => {
                  const submission = assignment.submission;
                  const status = submission?.status || "not-submitted";
                  const isGraded = status === "graded";
                  const isSubmitted = status === "submitted" || status === "graded";

                  return (
                    <div key={assignment._id} className={`assignment-item ${status}`}>
                      <div className="assignment-header"><h4>{assignment.title}</h4>
                        <div className="status-indicators"><span className={`status-badge ${status}`}>{status === "not-submitted" && "⏳ Not Submitted"}{status === "submitted" && "📤 Submitted"}{status === "graded" && "✅ Graded"}</span></div>
                      </div>

                      <div className="assignment-meta"><p className="instructions">{assignment.instructions}</p></div>

                      <div className="assignment-details">
                        <div className="detail-row"><span className="label">Max Marks:</span><span className="value">{assignment.maxMarks}</span></div>
                        {assignment.dueDate && (<div className="detail-row"><span className="label">Due Date:</span><span className="value">{new Date(assignment.dueDate).toLocaleDateString()}</span></div>)}
                        {isSubmitted && submission?.submissionDate && (<div className="detail-row"><span className="label">Submitted:</span><span className="value">{new Date(submission.submissionDate).toLocaleDateString()}</span></div>)}
                        {isGraded && submission?.obtainedMarks !== null && (<div className="detail-row highlight"><span className="label">Marks Obtained:</span><span className="value">{submission.obtainedMarks} / {assignment.maxMarks}</span></div>)}
                        {submission?.feedback && (<div className="detail-row feedback"><span className="label">Feedback:</span><p className="feedback-text">{submission.feedback}</p></div>)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
 
