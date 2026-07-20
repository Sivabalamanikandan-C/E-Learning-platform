/**
 * Format date to locale string
 * @param {Date|string} date - Date to format
 * @returns {string} Formatted date
 */
export const formatDate = (date) => {
  if (!date) return "N/A";
  return new Date(date).toLocaleDateString();
};

/**
 * Get status badge variant based on status
 * @param {string} status - Status value
 * @returns {string} Badge class variant
 */
export const getStatusVariant = (status) => {
  switch (status) {
    case "graded":
      return "success";
    case "submitted":
      return "warning";
    case "not-submitted":
      return "danger";
    default:
      return "info";
  }
};

/**
 * Calculate percentage
 * @param {number} current - Current value
 * @param {number} total - Total value
 * @returns {number} Percentage
 */
export const calculatePercentage = (current, total) => {
  if (total === 0) return 0;
  return Math.round((current / total) * 100);
};

/**
 * Get lecture completion status
 * @param {object} lectureProgressData - Lecture progress data
 * @returns {boolean} Is completed
 */
export const isLectureCompleted = (lectureProgressData) => {
  return lectureProgressData?.isCompleted || false;
};

/**
 * Get assignment submission details
 * @param {object} assignment - Assignment object
 * @returns {object} Submission details
 */
export const getSubmissionDetails = (assignment) => {
  const submission = assignment.submission;
  return {
    status: submission?.status || "not-submitted",
    isGraded: submission?.status === "graded",
    isSubmitted:
      submission?.status === "submitted" || submission?.status === "graded",
  };
};
