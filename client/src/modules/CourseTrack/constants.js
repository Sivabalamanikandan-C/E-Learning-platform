// API Endpoints
export const API_ENDPOINTS = {
  COURSE_DETAILS: (courseId) =>
    `http://localhost:5000/api/student/courses/${courseId}`,
  COURSE_PROGRESS: (courseId) =>
    `http://localhost:5000/api/student/course/${courseId}/progress`,
  COURSE_ASSIGNMENTS: (courseId) =>
    `http://localhost:5000/api/student/course/${courseId}/assignments`,
  LECTURES_PROGRESS: (courseId) =>
    `http://localhost:5000/api/student/course/${courseId}/lectures-progress`,
};

// Tab Names
export const TABS = {
  OVERVIEW: "overview",
  LECTURES: "lectures",
  QUIZZES: "quizzes",
  ASSIGNMENTS: "assignments",
};

// Status Constants
export const STATUS = {
  NOT_SUBMITTED: "not-submitted",
  SUBMITTED: "submitted",
  GRADED: "graded",
  NOT_STARTED: "not-started",
  IN_PROGRESS: "in-progress",
  COMPLETED: "completed",
};

// Assignment Status Labels
export const ASSIGNMENT_STATUS_LABELS = {
  "not-submitted": "⏳ Not Submitted",
  submitted: "📤 Submitted",
  graded: "✅ Graded",
};
