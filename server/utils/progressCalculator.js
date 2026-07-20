const AssignmentSubmission = require("../models/AssignmentSubmission");
const Assignment = require("../models/Assignment");

/**
 * Calculate total assignment marks for a student in a course
 * @param {string} studentId - Student ID
 * @param {string} courseId - Course ID
 * @returns {object} { totalAssignmentMarks, maxAssignmentMarks, assignmentPercentage }
 */
async function calculateAssignmentMarks(studentId, courseId) {
  try {
    // Get all assignments for the course
    const assignments = await Assignment.find({
      course: courseId,
      isPublished: true,
    }).select("_id maxMarks");

    if (assignments.length === 0) {
      return {
        totalAssignmentMarks: 0,
        maxAssignmentMarks: 0,
        assignmentPercentage: 0,
        gradesCount: 0,
        totalAssignments: 0,
        submitted: 0,
        submissionPercentage: 0,
      };
    }

    const assignmentIds = assignments.map((a) => a._id);
    let totalMaxMarks = assignments.reduce((sum, a) => sum + a.maxMarks, 0);

    // Get graded submissions for this student
    const submissions = await AssignmentSubmission.find({
      assignment: { $in: assignmentIds },
      student: studentId,
      status: "graded",
    }).select("obtainedMarks");

    // Get all submissions (submitted and graded) for submission count
    const submittedCount = await AssignmentSubmission.countDocuments({
      assignment: { $in: assignmentIds },
      student: studentId,
      status: { $in: ["submitted", "graded"] },
    });

    let totalObtainedMarks = submissions.reduce((sum, s) => sum + (s.obtainedMarks || 0), 0);

    const assignmentPercentage =
      totalMaxMarks > 0 ? Math.round((totalObtainedMarks / totalMaxMarks) * 100) : 0;

    const submissionPercentage =
      assignments.length > 0
        ? Math.round((submittedCount / assignments.length) * 100)
        : 0;

    return {
      totalAssignmentMarks: totalObtainedMarks,
      maxAssignmentMarks: totalMaxMarks,
      assignmentPercentage: assignmentPercentage,
      gradesCount: submissions.length,
      totalAssignments: assignments.length,
      submitted: submittedCount,
      submissionPercentage: submissionPercentage,
    };
  } catch (error) {
    console.error("Error calculating assignment marks:", error);
    return {
      totalAssignmentMarks: 0,
      maxAssignmentMarks: 0,
      assignmentPercentage: 0,
      gradesCount: 0,
      totalAssignments: 0,
      submitted: 0,
      submissionPercentage: 0,
    };
  }
}

/**
 * Calculate overall course completion percentage including lectures, quiz, and assignments
 * @param {object} params - Parameters containing lecture completion and other metrics
 * @returns {number} Overall completion percentage
 */
function calculateOverallProgress(params) {
  const {
    completedLectures = 0,
    totalLectures = 0,
    quizCompleted = false,
    hasQuiz = false,
    assignmentSubmissionPercentage = 0,
    totalAssignments = 0,
  } = params;

  let validComponents = 0;
  let totalScore = 0;

  // 1. Lectures
  if (totalLectures > 0) {
    const lecturePct = (completedLectures / totalLectures) * 100;
    validComponents++;
    totalScore += lecturePct;
  }

  // 2. Quiz
  if (hasQuiz) {
    const quizPct = quizCompleted ? 100 : 0;
    validComponents++;
    totalScore += quizPct;
  }

  // 3. Assignments
  if (totalAssignments > 0) {
    validComponents++;
    totalScore += assignmentSubmissionPercentage;
  }

  if (validComponents === 0) return 0;

  return Math.round(totalScore / validComponents);
}

module.exports = {
  calculateAssignmentMarks,
  calculateOverallProgress,
};
