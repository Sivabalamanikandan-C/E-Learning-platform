const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const { authenticate, authorizeStudent } = require("../middleware/auth");
const Student = require("../models/Student");
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const QuizSubmission = require("../models/QuizSubmission");
const Progress = require("../models/Progress");
const CourseLevelSuspension = require("../models/CourseLevelSuspension");
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");



/**
 * GET /api/student/enrollments
 * Get all enrolled courses and statistics for the logged-in student
 */
router.get("/enrollments", authenticate, authorizeStudent, async (req, res) => {
  try {
    // Redirect to the unified endpoint logic
    return res.redirect(307, "/api/student/courses/enrolled");
  } catch (err) {
    console.error("Error fetching enrollments:", err);
    res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

// Helper function for unified progress calculation
async function calculateCourseProgress(studentId, courseId, courseData = null) {
  const course = courseData || await Course.findById(courseId);
  if (!course) return null;

  // 1. Lecture Progress
  const totalLectures = course.lectures ? course.lectures.length : 0;
  const completedLectures = await Progress.countDocuments({
    student: studentId,
    course: courseId,
    isCompleted: true,
  });
  const lecturePct = totalLectures > 0 ? (completedLectures / totalLectures) * 100 : 0;

  // 2. Quiz Progress (100% if passed/completed, 0% if not)
  let quizPct = 0;
  const hasQuiz = !!course.quiz;
  let quizScore = null;
  let quizTotalPoints = null;
  let quizPercentage = null;
  let quizCompletionDate = null;
  let quizAutoSubmitted = false;

  if (hasQuiz) {
    const quizSub = await QuizSubmission.findOne({ student: studentId, course: courseId }).sort({ submittedAt: -1, createdAt: -1 });
    if (quizSub) {
      // Extract quiz submission details - handle both old and new field names
      quizScore = quizSub.score !== undefined ? quizSub.score : (quizSub.obtainedMarks !== undefined ? quizSub.obtainedMarks : null);
      quizTotalPoints = quizSub.totalPoints !== undefined ? quizSub.totalPoints : (quizSub.totalMarks || null);
      quizPercentage = quizSub.percentage !== undefined ? quizSub.percentage : null;
      quizCompletionDate = quizSub.submittedAt || quizSub.createdAt || null;
      // Consider both explicit flag and legacy/status-based indicator
      quizAutoSubmitted = (quizSub.autoSubmitted === true) || (quizSub.status === "auto_submitted");
      
      // Debug logging
      console.log(`[calculateCourseProgress] Quiz submission found for student ${studentId}, course ${courseId}:`, {
        quizScore,
        quizTotalPoints,
        quizPercentage,
        submittedAt: quizCompletionDate,
        autoSubmitted: quizAutoSubmitted,
        hasAnswers: !!quizSub.answers?.detailedAnswers
      });
      
      // Fallback: if score/totalPoints are missing but answers exist, compute from them
      if ((quizScore === null || quizTotalPoints === null) && quizSub.answers?.detailedAnswers) {
        const detailedAnswers = quizSub.answers.detailedAnswers;
        if (Array.isArray(detailedAnswers) && detailedAnswers.length > 0) {
          const correctCount = detailedAnswers.filter(a => a.isCorrect).length;
          const totalCount = detailedAnswers.length;
          if (quizScore === null) {
            quizScore = correctCount;
          }
          if (quizTotalPoints === null) {
            quizTotalPoints = totalCount;
          }
          if (quizPercentage === null) {
            quizPercentage = Math.round((correctCount / totalCount) * 100);
          }
          console.log(`[calculateCourseProgress] Computed from answers: score=${quizScore}, totalPoints=${quizTotalPoints}, percentage=${quizPercentage}`);
        }
      }
      
      // Determine quiz progress based on scoring
      if ((quizPercentage !== null && quizPercentage >= 50) || quizSub.isCompleted) {
        quizPct = 100;
      }
    } else {
      console.log(`[calculateCourseProgress] No quiz submission found for student ${studentId}, course ${courseId}`);
    }
  }

  // 3. Assignment Progress
  const assignments = await Assignment.find({ course: courseId, isPublished: true }).select('_id');
  const totalAssignments = assignments.length;
  const hasAssignments = totalAssignments > 0;
  
  let assignmentPct = 0;
  let submittedAssignments = 0;
  
  if (hasAssignments) {
    submittedAssignments = await AssignmentSubmission.countDocuments({
      student: studentId,
      assignment: { $in: assignments.map(a => a._id) },
      status: { $in: ["submitted", "graded"] }
    });
    assignmentPct = (submittedAssignments / totalAssignments) * 100;
  }

  // 4. Calculate Average
  let validComponents = 0;
  let totalScore = 0;

  if (totalLectures > 0) {
    validComponents++;
    totalScore += lecturePct;
  }

  if (hasQuiz) {
    validComponents++;
    totalScore += quizPct;
  }

  if (hasAssignments) {
    validComponents++;
    totalScore += assignmentPct;
  }

  const finalProgress = validComponents > 0 ? Math.round(totalScore / validComponents) : 0;

  return {
    progress: finalProgress,
    detail: {
      lectures: { completed: completedLectures, total: totalLectures, percentage: Math.round(lecturePct) },
      quiz: {
        completed: quizPct === 100,
        hasQuiz,
        score: quizScore,
        totalPoints: quizTotalPoints,
        percentage: quizPercentage,
        completionDate: quizCompletionDate,
        autoSubmitted: quizAutoSubmitted,
      },
      assignments: { submitted: submittedAssignments, total: totalAssignments, percentage: Math.round(assignmentPct) }
    }
  };
}

/**
 * GET /api/student/courses/enrolled
 * Get all enrolled courses for the logged-in student
 * Unified endpoint for Dashboard, My Courses, and Tracker
 */
router.get("/courses/enrolled", authenticate, authorizeStudent, async (req, res) => {
  try {
    const studentId = req.user._id;
    console.log("Fetching enrollments for student:", studentId);

    // Fetch all enrollments for the student with instructor details
    const enrollments = await Enrollment.find({ student: studentId }).populate({
      path: "course",
      populate: {
        path: "instructor",
        select: "name",
      },
    });

    console.log("Enrollments found:", enrollments.length);

    // Extract courses from enrollments and calculate progress
    const enrolledCourses = await Promise.all(
      enrollments.map(async (enrollment) => {
        try {
          const course = enrollment.course;
          
          // Skip if course is null (deleted or not found)
          if (!course) {
            console.warn("Course not found for enrollment:", enrollment._id);
            return null;
          }

          const courseId = course._id;
          
          // Calculate unified progress
          const progressData = await calculateCourseProgress(studentId, courseId, course);

          // Get last watched lecture
          const lastWatched = await Progress.findOne({
            student: studentId,
            course: courseId,
          })
            .sort({ updatedAt: -1 })
            .lean();

          // Check for course-level suspension
          const suspension = await CourseLevelSuspension.findOne({
            studentId: studentId,
            courseId: courseId,
            suspensionStatus: "active",
          });

          let isSuspendedFromCourse = false;
          let suspensionDetails = null;

          if (suspension) {
            const now = new Date();
            if (suspension.suspensionEndDate && now >= suspension.suspensionEndDate) {
              // Auto-lift suspension
              suspension.suspensionStatus = "lifted";
              suspension.liftedAt = new Date();
              await suspension.save();
            } else {
              // Suspension is still active
              isSuspendedFromCourse = true;
              suspensionDetails = {
                reason: suspension.reason,
                startDate: suspension.suspensionStartDate,
                endDate: suspension.suspensionEndDate,
              };
            }
          }

          return {
            _id: course._id,
            title: course.title,
            description: course.description,
            thumbnail: course.thumbnail,
            category: course.category,
            level: course.level,
            price: course.price,
            instructorName: course.instructor?.name || "Unknown Instructor",
            progress: progressData.progress,
            progressDetail: progressData.detail, // Include detailed breakdown
            totalLectures: progressData.detail.lectures.total,
            completedLectures: progressData.detail.lectures.completed,
            lastWatchedLectureIndex: lastWatched?.lectureIndex || 0,
            status: progressData.progress >= 100 ? "Completed" : "In Progress",
            isSuspendedFromCourse: isSuspendedFromCourse,
            suspensionDetails: suspensionDetails,
          };
        } catch (mapError) {
          console.error("Error processing enrollment:", enrollment._id, mapError);
          return null;
        }
      })
    );

    // Filter out null values (deleted courses)
    const validCourses = enrolledCourses.filter(course => course !== null);
    console.log("Valid courses after filtering:", validCourses.length);

    // Fetch quiz submissions for stats
    const quizSubmissions = await QuizSubmission.find({
      student: studentId,
    });

    // Calculate statistics
    const totalEnrolled = validCourses.length;
    const completedCourses = validCourses.filter(
      (course) => course.progress >= 100
    ).length;
    const quizzesAttempted = quizSubmissions.length;
    const quizzesCompleted = quizSubmissions.filter(
      (submission) => submission.isCompleted
    ).length;

    res.status(200).json({
      success: true,
      enrolledCourses: validCourses,
      stats: {
        totalEnrolled,
        completedCourses,
        quizzesAttempted,
        quizzesCompleted,
      },
    });
  } catch (err) {
    console.error("Error fetching enrollments:", err);
    res.status(500).json({ message: "Failed to fetch enrollments" });
  }
});

/**
 * GET /api/student/enrollments/:courseId
 * Get details of a specific enrolled course
 */
router.get(
  "/enrollments/:courseId",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const studentId = req.user._id;
      const { courseId } = req.params;

      // Check if student is enrolled in this course
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      }).populate("course");

      if (!enrollment) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        });
      }

      const course = enrollment.course;

      // Calculate unified progress for this specific course
      const progressData = await calculateCourseProgress(studentId, courseId, course);

      res.status(200).json({
        success: true,
        course: {
          _id: course._id,
          title: course.title,
          description: course.description,
          thumbnail: course.thumbnail,
          category: course.category,
          level: course.level,
          lectures: course.lectures || [],
          quiz: course.quiz || null,
          progress: progressData.progress,
          progressDetail: progressData.detail
        },
      });
    } catch (err) {
      console.error("Error fetching course details:", err);
      res.status(500).json({ message: "Failed to fetch course details" });
    }
  }
);

/**
 * GET /api/student/course/:courseId/progress
 * Get detailed progress for a specific course (quiz score, lecture progress, etc.)
 */
router.get(
  "/course/:courseId/progress",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const studentId = req.user._id;
      const { courseId } = req.params;

      // Check if student is enrolled in this course
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      }).populate("course");

      if (!enrollment) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        });
      }

      const course = enrollment.course;

      // Calculate unified progress for this specific course
      const progressData = await calculateCourseProgress(studentId, courseId, course);

      // Return progress detail with explicit quiz information
      res.status(200).json({
        success: true,
        progress: progressData.progress,
        detail: progressData.detail,
        quiz: progressData.detail.quiz || {
          completed: false,
          hasQuiz: false,
          score: null,
          totalPoints: null,
          percentage: null,
          completionDate: null,
          autoSubmitted: false,
        }
      });
    } catch (err) {
      console.error("Error fetching course progress:", err);
      res.status(500).json({ message: "Failed to fetch course progress" });
    }
  }
);

/**
 * GET /api/student/course/:courseId/quiz-submission
 * Get raw quiz submission data for debugging
 */
router.get(
  "/course/:courseId/quiz-submission",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const studentId = req.user._id;
      const { courseId } = req.params;

      const quizSub = await QuizSubmission.findOne({ student: studentId, course: courseId }).sort({ submittedAt: -1, createdAt: -1 });

      if (!quizSub) {
        return res.status(200).json({
          success: true,
          message: "No quiz submission found",
          data: null
        });
      }

      res.status(200).json({
        success: true,
        data: {
          _id: quizSub._id,
          score: quizSub.score,
          totalPoints: quizSub.totalPoints,
          percentage: quizSub.percentage,
          obtainedMarks: quizSub.obtainedMarks || "undefined",
          totalMarks: quizSub.totalMarks || "undefined",
          submittedAt: quizSub.submittedAt,
          createdAt: quizSub.createdAt,
          autoSubmitted: quizSub.autoSubmitted,
          isCompleted: quizSub.isCompleted,
          status: quizSub.status,
          answers: { detailedAnswers: quizSub.answers?.detailedAnswers ? quizSub.answers.detailedAnswers.length : 0 },
        }
      });
    } catch (err) {
      console.error("Error fetching quiz submission:", err);
      res.status(500).json({ message: "Failed to fetch quiz submission" });
    }
  }
);

/**
 * GET /api/student/stats
 * Get overall statistics for the student
 */
router.get("/stats", authenticate, authorizeStudent, async (req, res) => {
  try {
    const studentId = req.user._id;

    const enrollments = await Enrollment.find({ student: studentId });
    const quizSubmissions = await QuizSubmission.find({
      student: studentId,
    });

    const totalEnrolled = enrollments.length;
    const quizzesAttempted = quizSubmissions.length;
    const quizzesCompleted = quizSubmissions.filter(
      (submission) => submission.isCompleted
    ).length;

    res.status(200).json({
      success: true,
      stats: {
        totalEnrolled,
        quizzesAttempted,
        quizzesCompleted,
      },
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ message: "Failed to fetch statistics" });
  }
});

/**
 * GET /api/student/courses
 * Get all published courses available for enrollment
 * Accessible to logged-in students and optionally guests
 */
// Middleware to optionally authenticate (doesn't fail if no token)
// Sets `req.authUser = { id, role }` when token present. Also sets `req.user` for student role for backwards compatibility.
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("Optional auth decoded:", decoded);
      if (decoded && decoded.id && decoded.role) {
        req.authUser = { id: decoded.id, role: decoded.role };
        if (decoded.role === "student") {
          req.user = await Student.findById(decoded.id).select("-password");
          console.log("User authenticated in optionalAuth (student):", req.user?._id);
        }
      }
    }
  } catch (err) {
    console.log("Optional auth error (silent):", err.message);
    // Silently continue if token is invalid
  }
  next();
};

router.get("/courses", optionalAuth, async (req, res) => {
  try {
    const studentId = req.user ? req.user._id : null;

    console.log("GET /api/student/courses - studentId:", studentId);

    // Fetch all courses where isAvailable is true AND approved by admin
    const courses = await Course.find({ isAvailable: true, status: "approved" })
      .populate("instructor", "name email")
      .select("_id title description price thumbnail instructor isAvailable");

    // Format response with instructor name and enrollment status
    const formattedCourses = await Promise.all(
      courses.map(async (course) => {
        let isEnrolled = false;

        // Check if student is authenticated and enrolled
        if (studentId) {
          const enrollment = await Enrollment.findOne({
            student: studentId,
            course: course._id,
          });
          isEnrolled = !!enrollment;
        }

        return {
          _id: course._id,
          title: course.title,
          description: course.description,
          price: course.price,
          thumbnail: course.thumbnail,
          instructorName: course.instructor?.name || "Unknown Instructor",
          isEnrolled: isEnrolled,
        };
      })
    );

    res.status(200).json({
      success: true,
      courses: formattedCourses,
    });
  } catch (err) {
    console.error("Error fetching courses:", err);
    res.status(500).json({ message: "Failed to fetch courses" });
  }
});

/**
 * GET /api/student/courses/:courseId
 * Get full details of a specific course (including lectures)
 * Public endpoint - anyone can view course preview
 */
router.get("/courses/:courseId", optionalAuth, async (req, res) => {
  try {
    const { courseId } = req.params;

    const course = await Course.findById(courseId).populate(
      "instructor",
      "name email"
    );

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Enforce visibility: only allow viewing when course is approved,
    // unless requester is the instructor or an admin.
    if (course.status !== "approved") {
      const auth = req.authUser || null;
      const isInstructorOwner = auth && auth.role === "instructor" && auth.id === String(course.instructor._id);
      const isAdmin = auth && auth.role === "admin";
      if (!isInstructorOwner && !isAdmin) {
        return res.status(403).json({ message: "Course is not available" });
      }
    }

    // Format course data with instructor name
    const courseData = {
      _id: course._id,
      title: course.title,
      subtitle: course.subtitle,
      description: course.description,
      category: course.category,
      level: course.level,
      language: course.language,
      price: course.price,
      thumbnail: course.thumbnail,
      instructor: {
        _id: course.instructor._id,
        name: course.instructor.name,
        email: course.instructor.email,
      },
      lectures: course.lectures || [],
      quiz: course.quiz || null,
      isAvailable: course.isAvailable,
      // Expose approval workflow fields so instructors/admins can see status and rejection reason
      status: course.status,
      rejectionReason: course.rejectionReason || null,
      createdAt: course.createdAt,
      totalStudents: 0, // TODO: Count from Enrollment collection
    };

    res.status(200).json({
      success: true,
      course: courseData,
    });
  } catch (err) {
    console.error("Error fetching course details:", err);
    res.status(500).json({ message: "Failed to fetch course details" });
  }
});

/**
 * GET /api/student/courses/:courseId/access
 * Check if the logged-in student has access (purchased/enrolled) to the course
 * Requires authentication
 */
router.get(
  "/courses/:courseId/access",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req.user._id;

      // Check if student has an enrollment for this course
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      });

      const hasAccess = !!enrollment;

      res.status(200).json({
        success: true,
        hasAccess,
        enrollmentDate: enrollment ? enrollment.createdAt : null,
      });
    } catch (err) {
      console.error("Error checking course access:", err);
      res.status(500).json({ message: "Failed to check course access" });
    }
  }
);

/**
 * POST /api/student/courses/:courseId/enroll
 * [DEPRECATED] Use payment flow instead
 * This endpoint now returns an error directing to payment flow
 */
router.post(
  "/courses/:courseId/enroll",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    return res.status(400).json({
      success: false,
      message: "Please use the payment flow to enroll. Use POST /api/payment/create-order first.",
    });
  }
);

/**
 * GET /api/student/courses/:courseId/completed-lectures
 * Fetch all completed lectures for the logged-in student in a specific course
 * Requires authentication
 */
router.get(
  "/courses/:courseId/completed-lectures",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req.user._id;

      // Fetch all completed progress records for this student and course
      const completedLectures = await Progress.find({
        student: studentId,
        course: courseId,
        isCompleted: true,
      }).select("lectureIndex lectureTitle completedAt");

      res.status(200).json({
        success: true,
        completedLectures: completedLectures || [],
      });
    } catch (err) {
      console.error("Error fetching completed lectures:", err);
      res
        .status(500)
        .json({ message: "Failed to fetch completed lectures" });
    }
  }
);

/**
 * POST /api/student/courses/:courseId/lectures/:lectureIndex/complete
 * Mark a specific lecture as completed for the logged-in student
 * Requires authentication and enrollment in the course
 */
router.post(
  "/courses/:courseId/lectures/:lectureIndex/complete",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const { courseId, lectureIndex } = req.params;
      const studentId = req.user._id;

      // Check if student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      });

      if (!enrollment) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        });
      }

      // Get course details to validate lecture index
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      const lectureIdx = parseInt(lectureIndex);
      if (lectureIdx < 0 || lectureIdx >= course.lectures.length) {
        return res.status(400).json({ message: "Invalid lecture index" });
      }

      const lecture = course.lectures[lectureIdx];

      // Find or create progress record
      let progress = await Progress.findOne({
        student: studentId,
        course: courseId,
        lectureIndex: lectureIdx,
      });

      if (!progress) {
        progress = new Progress({
          student: studentId,
          course: courseId,
          lectureIndex: lectureIdx,
          lectureTitle: lecture.title,
        });
      }

      // Mark as completed
      progress.isCompleted = true;
      progress.completedAt = new Date();

      await progress.save();

      res.status(200).json({
        success: true,
        message: "Lecture marked as completed",
        progress,
      });
    } catch (err) {
      console.error("Error marking lecture as completed:", err);
      res.status(500).json({ message: "Failed to mark lecture as completed" });
    }
  }
);

/**
 * POST /api/student/courses/:courseId/quiz/submit
 * Submit quiz answers and save submission
 * Requires authentication and enrollment
 */
router.post(
  "/courses/:courseId/quiz/submit",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req.user._id;
      const submissionData = req.body;

      // Check if student is enrolled in the course
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      });

      if (!enrollment) {
        return res.status(403).json({
          message: "You are not enrolled in this course",
        });
      }

      // Debug: log header and body auto-submitted indicators
      console.log("AUTO SUBMIT HEADER:", req.headers["x-auto-submit"]);
      console.log("AUTO SUBMIT BODY:", submissionData.autoSubmitted);

      // Determine auto submit from explicit header only (do NOT trust client body)
      const isAuto = req.headers["x-auto-submit"] === "true";

      // Prevent double submissions: check if a submission already exists for this student+course
      const existing = await QuizSubmission.findOne({ student: studentId, course: courseId });
      if (existing && existing.isCompleted) {
        return res.status(400).json({ message: "Quiz already submitted" });
      }

      // Build the submission record and set flags explicitly
      const now = new Date();
      const quizSubmission = new QuizSubmission({
        student: studentId,
        course: courseId,
        score: submissionData.obtainedMarks,
        totalPoints: submissionData.totalMarks,
        percentage: submissionData.percentage,
        status: isAuto ? "auto_submitted" : "submitted",
        autoSubmitted: !!isAuto,
        isCompleted: true,
        submittedAt: now,
        answers: {
          quizTitle: submissionData.quizTitle,
          totalQuestions: submissionData.totalQuestions,
          answeredQuestions: submissionData.answeredQuestions,
          timeSpent: submissionData.timeSpent,
          detailedAnswers: submissionData.answers,
        },
      });

      // If an existing (but incomplete) submission record exists, update it instead of creating duplicate
      if (existing && !existing.isCompleted) {
        existing.score = quizSubmission.score;
        existing.totalPoints = quizSubmission.totalPoints;
        existing.percentage = quizSubmission.percentage;
        existing.status = quizSubmission.status;
        existing.autoSubmitted = quizSubmission.autoSubmitted;
        existing.isCompleted = true;
        existing.submittedAt = quizSubmission.submittedAt;
        existing.answers = quizSubmission.answers;
        await existing.save();
        return res.status(200).json({ success: true, message: "Quiz submitted successfully", submission: existing });
      }

      await quizSubmission.save();

      res.status(201).json({
        success: true,
        message: "Quiz submitted successfully",
        submission: quizSubmission,
      });
    } catch (err) {
      console.error("Error submitting quiz:", err);
      res.status(500).json({ 
        message: "Failed to submit quiz",
        error: err.message
      });
    }
  }
);

/**
 * DEBUG ENDPOINT: GET /api/student/debug/enrollments
 * For debugging - shows enrollments for logged-in student
 */
router.get("/debug/enrollments", authenticate, authorizeStudent, async (req, res) => {
  try {
    const studentId = req.user._id;
    console.log("\n=== DEBUG: CHECKING ENROLLMENTS ===");
    console.log("Student ID:", studentId);
    console.log("Student Role:", req.user.role);

    const enrollments = await Enrollment.find({ student: studentId })
      .populate("course", "title")
      .populate("payment", "status");

    console.log("Total enrollments found:", enrollments.length);
    enrollments.forEach((e, i) => {
      console.log(`Enrollment ${i + 1}:`, {
        _id: e._id,
        course: e.course?.title || "DELETED",
        status: e.status,
        paymentStatus: e.payment?.status || "NO_PAYMENT"
      });
    });
    console.log("=== END DEBUG ===\n");

    res.status(200).json({
      debug: true,
      studentId,
      studentRole: req.user.role,
      totalEnrollments: enrollments.length,
      enrollments: enrollments.map(e => ({
        _id: e._id,
        courseId: e.course?._id,
        courseTitle: e.course?.title || "DELETED",
        status: e.status,
        progress: e.progress,
        paymentId: e.payment?._id,
        paymentStatus: e.payment?.status,
        createdAt: e.createdAt
      }))
    });
  } catch (err) {
    console.error("Debug error:", err);
    res.status(500).json({ message: "Debug failed", error: err.message });
  }
});

/**
 * GET /api/student/test/status
 * Simple endpoint to test if server is working
 */
router.get("/test/status", authenticate, authorizeStudent, async (req, res) => {
  try {
    const studentId = req.user._id;
    const totalCourses = await Course.countDocuments();
    const totalEnrollments = await Enrollment.countDocuments();
    const myEnrollments = await Enrollment.countDocuments({ student: studentId });
    
    res.status(200).json({
      success: true,
      message: "Server is working and you are authenticated",
      studentId: studentId,
      studentEmail: req.user.email,
      stats: {
        totalCoursesInDB: totalCourses,
        totalEnrollmentsInDB: totalEnrollments,
        myEnrollments: myEnrollments,
      },
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/student/test/all-courses
 * Shows all courses in the database
 */
router.get("/test/all-courses", authenticate, authorizeStudent, async (req, res) => {
  try {
    const courses = await Course.find().select("_id title price").limit(20);
    res.status(200).json({
      success: true,
      totalCourses: await Course.countDocuments(),
      sampleCourses: courses
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/student/announcements
 * Get announcements for courses the student is enrolled in
 */
router.get("/announcements", authenticate, authorizeStudent, async (req, res) => {
  try {
    const studentId = req.user._id;
    const Announcement = require("../models/Announcement");

    // Get all courses the student is enrolled in
    const enrollments = await Enrollment.find({ student: studentId }).select("course");
    const courseIds = enrollments.map((e) => e.course);

    // Only show announcements if student is enrolled in at least one course
    if (courseIds.length === 0) {
      return res.json([]);
    }

    // Get announcements for these enrolled courses
    const announcements = await Announcement.find({
      $or: [
        { isAllCourses: true, courses: { $size: 0 } }, // "All courses" announcements only
        { courses: { $in: courseIds } }, // Announcements for specific enrolled courses
      ],
      status: "Sent",
    })
      .populate("instructor", "name")
      .populate("courses", "title")
      .sort({ sentAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error("Error fetching student announcements:", error);
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
});

/**
 * GET /api/student/courses/:courseId/notes
 * Get all notes for a specific course
 */
router.get("/courses/:courseId/notes", authenticate, authorizeStudent, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user._id;

    // Check if student is enrolled in this course
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    // Fetch notes for this course
    const Note = require("../models/Note");
    const notes = await Note.find({
      student: studentId,
      course: courseId,
    }).sort({ createdAt: -1 });

    res.json({ success: true, notes: notes || [] });
  } catch (error) {
    console.error("Error fetching notes:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching notes",
      error: error.message,
    });
  }
});

/**
 * POST /api/student/courses/:courseId/notes
 * Create a new note for a lecture
 */
router.post("/courses/:courseId/notes", authenticate, authorizeStudent, async (req, res) => {
  try {
    const { courseId } = req.params;
    const { lectureIndex, lectureTitle, content } = req.body;
    const studentId = req.user._id;

    // Validate inputs
    if (!lectureIndex !== undefined || !content) {
      return res.status(400).json({
        success: false,
        message: "Lecture index and content are required",
      });
    }

    // Check if student is enrolled in this course
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    // Create note
    const Note = require("../models/Note");
    const newNote = new Note({
      student: studentId,
      course: courseId,
      lectureIndex,
      lectureTitle,
      content,
    });

    await newNote.save();

    res.status(201).json({
      success: true,
      message: "Note created successfully",
      note: newNote,
    });
  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({
      success: false,
      message: "Error creating note",
      error: error.message,
    });
  }
});

/**
 * DELETE /api/student/courses/:courseId/notes/:noteId
 * Delete a specific note
 */
router.delete("/courses/:courseId/notes/:noteId", authenticate, authorizeStudent, async (req, res) => {
  try {
    const { courseId, noteId } = req.params;
    const studentId = req.user._id;

    // Check if student is enrolled in this course
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
    });

    if (!enrollment) {
      return res.status(403).json({
        success: false,
        message: "You are not enrolled in this course",
      });
    }

    // Delete note
    const Note = require("../models/Note");
    const note = await Note.findById(noteId);

    if (!note) {
      return res.status(404).json({
        success: false,
        message: "Note not found",
      });
    }

    // Verify ownership
    if (note.student.toString() !== studentId.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only delete your own notes",
      });
    }

    await Note.findByIdAndDelete(noteId);

    res.json({
      success: true,
      message: "Note deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({
      success: false,
      message: "Error deleting note",
      error: error.message,
    });
  }
});

/**
 * GET /api/student/course/:courseId/assignments
 * Get all assignments for a course with student submission details
 */
router.get(
  "/course/:courseId/assignments",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req.user._id;

      const AssignmentSubmission = require("../models/AssignmentSubmission");
      const Assignment = require("../models/Assignment");

      // Check enrollment
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      });

      if (!enrollment) {
        return res
          .status(404)
          .json({ message: "You are not enrolled in this course" });
      }

      // Get all assignments for this course
      const assignments = await Assignment.find({
        course: courseId,
        isPublished: true,
      }).populate("instructor", "name");

      // Get student submissions for these assignments
      const assignmentIds = assignments.map((a) => a._id);
      const submissions = await AssignmentSubmission.find({
        assignment: { $in: assignmentIds },
        student: studentId,
      });

      // Map assignments with submission details
      const assignmentsWithSubmissions = assignments.map((assignment) => {
        const submission = submissions.find(
          (s) => s.assignment.toString() === assignment._id.toString()
        );

        return {
          _id: assignment._id,
          title: assignment.title,
          instructions: assignment.instructions,
          dueDate: assignment.dueDate,
          maxMarks: assignment.maxMarks,
          submissionType: assignment.submissionType,
          referenceFile: assignment.referenceFile,
          submission: submission
            ? {
                _id: submission._id,
                submissionText: submission.submissionText,
                submissionFile: submission.submissionFile,
                submissionDate: submission.submissionDate,
                status: submission.status,
                obtainedMarks: submission.obtainedMarks,
                feedback: submission.feedback,
                isLate: submission.isLate,
                gradedAt: submission.gradedAt,
              }
            : null,
        };
      });

      res.status(200).json({
        success: true,
        assignments: assignmentsWithSubmissions,
      });
    } catch (error) {
      console.error("Error fetching assignments:", error);
      res.status(500).json({
        message: "Error fetching assignments",
        error: error.message,
      });
    }
  }
);

/**
 * GET /api/student/course/:courseId/lectures-progress
 * Get detailed progress for each lecture in a course
 */
router.get(
  "/course/:courseId/lectures-progress",
  authenticate,
  authorizeStudent,
  async (req, res) => {
    try {
      const { courseId } = req.params;
      const studentId = req.user._id;

      // Check enrollment
      const enrollment = await Enrollment.findOne({
        student: studentId,
        course: courseId,
      });

      if (!enrollment) {
        return res
          .status(404)
          .json({ message: "You are not enrolled in this course" });
      }

      // Get all lecture progress for this student in this course
      const lectureProgress = await Progress.find({
        student: studentId,
        course: courseId,
      }).select("lectureIndex isCompleted completedAt");

      // Create a map of lecture index to completion status
      const progressMap = {};
      lectureProgress.forEach((progress) => {
        progressMap[progress.lectureIndex] = {
          isCompleted: progress.isCompleted,
          completedAt: progress.completedAt,
        };
      });

      res.status(200).json({
        success: true,
        lecturesProgress: progressMap,
      });
    } catch (error) {
      console.error("Error fetching lectures progress:", error);
      res.status(500).json({
        message: "Error fetching lectures progress",
        error: error.message,
      });
    }
  }
);

module.exports = router;
