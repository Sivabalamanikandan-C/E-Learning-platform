const express = require("express");
const Course = require("../models/Course");
const QuizSubmission = require("../models/QuizSubmission");
const { authenticate } = require("../middleware/auth");

const router = express.Router();

/* ===== GET QUIZ ===== */
/* ===== DEBUG: Check all submissions ===== */
router.get("/debug/all-submissions", async (req, res) => {
  try {
    const submissions = await QuizSubmission.find().limit(100);
    const count = await QuizSubmission.countDocuments();
    
    console.log("[debug] Total submissions in DB:", count);
    console.log("[debug] Sample submissions:", submissions.slice(0, 3));
    
    res.json({
      totalCount: count,
      sampleSubmissions: submissions,
      dbConnection: "OK",
    });
  } catch (error) {
    console.error("[debug] Error:", error);
    res.status(500).json({
      message: "Debug error",
      error: error.message,
    });
  }
});

/* ===== DEBUG: Create a test submission (bypass auth) ===== */
router.post("/debug/create-test-submission", async (req, res) => {
  try {
    // Create a minimal test submission using sample data or body override
    const sample = req.body && Object.keys(req.body).length ? req.body : {
      student: null,
      course: null,
      answers: { sampleQuestionId: "sampleOptionId" },
      score: 1,
      totalPoints: 1,
      percentage: 100,
      status: "graded",
    };

    // If client provided a student/course, accept them; otherwise null to show DB behavior
    const submission = await QuizSubmission.create(sample);

    console.log('[debug-create] Created submission:', submission._id);
    res.status(201).json({ success: true, submission });
  } catch (err) {
    console.error('[debug-create] Error creating test submission:', err.message);
    if (err.errors) console.error('[debug-create] Validation errors:', err.errors);
    res.status(500).json({ message: 'Debug create failed', error: err.message });
  }
});

// Get quiz for a course (returns quiz without correct answers)
router.get("/:courseId/quiz", async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course || !course.quiz) {
      return res.status(404).json({ message: "Quiz not found for this course" });
    }

    // Filter out correct answers from the quiz
    const sanitizedQuiz = {
      _id: course.quiz._id || course._id,
      title: course.quiz.title,
      description: course.quiz.description,
      timeLimit: course.quiz.timeLimit,
      questions: course.quiz.questions.map((q) => ({
        _id: q._id,
        questionText: q.questionText,
        questionType: q.questionType,
        points: q.points,
        options: q.options.map((o) => ({
          _id: o._id,
          optionText: o.optionText,
          // Don't send isCorrect to students
        })),
      })),
    };

    res.json(sanitizedQuiz);
  } catch (error) {
    res.status(500).json({ message: "Error fetching quiz", error: error.message });
  }
});

/* ===== SUBMIT QUIZ ANSWERS ===== */
// This endpoint now accepts the pre-calculated submission data from the client
// and determines the submission type (manual vs. auto) from the header.
router.post("/:courseId/quiz/submit", authenticate, async (req, res) => {
  try {
    const { courseId } = req.params;
    const studentId = req.user.id;
    const submissionDataFromClient = req.body;

    // Check if student has already submitted this quiz (only one submission allowed)
    const existingSubmission = await QuizSubmission.findOne({
      student: studentId,
      course: courseId,
    });

    if (existingSubmission) {
      return res.status(403).json({
        message: "You have already submitted this quiz. Each student can only submit the quiz once.",
      });
    }

    // Determine auto submit from explicit header only (do NOT trust client body)
    const isAuto = req.headers["x-auto-submit"] === "true";

    // Prepare data for DB model, mapping fields from the client
    const submissionToSave = {
      student: studentId,
      course: courseId,
      score: submissionDataFromClient.obtainedMarks,
      totalPoints: submissionDataFromClient.totalMarks,
      percentage: submissionDataFromClient.percentage,
      status: isAuto ? "auto_submitted" : "submitted",
      autoSubmitted: isAuto,
      // Nest the detailed answers and metadata inside the 'answers' field
      answers: {
        quizTitle: submissionDataFromClient.quizTitle,
        totalQuestions: submissionDataFromClient.totalQuestions,
        answeredQuestions: submissionDataFromClient.answeredQuestions,
        timeSpent: submissionDataFromClient.timeSpent,
        detailedAnswers: submissionDataFromClient.answers,
      },
      submittedAt: new Date(),
    };

    // Save quiz submission
    const submission = await QuizSubmission.create(submissionToSave);

    // Debug logging as requested
    console.log("AUTO:", submission.autoSubmitted);
    console.log("STATUS:", submission.status);

    res.status(201).json({
      success: true,
      submission: submission, // Return the full submission object
    });
  } catch (error) {
    console.error("[quiz-submit] Error:", error);
    res.status(500).json({
      message: "Error submitting quiz",
      error: error.message,
    });
  }
});

/* ===== GET QUIZ SUBMISSION (for review) ===== */
// Get a specific quiz submission
router.get(
  "/:courseId/submission/:submissionId",
  authenticate,
  async (req, res) => {
    try {
      const submission = await QuizSubmission.findById(
        req.params.submissionId
      ).populate("student", "name email");

      if (!submission) {
        return res.status(404).json({ message: "Submission not found" });
      }

      // Check authorization (student can only view their own, instructor can view all)
      if (
        submission.student._id.toString() !== req.user.id &&
        req.user.role !== "instructor"
      ) {
        return res.status(403).json({ message: "Not authorized" });
      }

      const course = await Course.findById(req.params.courseId);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Build detailed submission with question details
      const detailedSubmission = {
        ...submission.toObject(),
        questions: course.quiz.questions.map((question) => {
          const studentAnswer = submission.answers.get(question._id.toString());

          return {
            _id: question._id,
            questionText: question.questionText,
            questionType: question.questionType,
            points: question.points,
            studentAnswer,
            options: question.options.map((option) => ({
              _id: option._id,
              optionText: option.optionText,
              isCorrect: option.isCorrect,
              studentSelected:
                question.questionType === "single"
                  ? option._id.toString() === studentAnswer
                  : Array.isArray(studentAnswer) &&
                    studentAnswer.includes(option._id.toString()),
            })),
          };
        }),
      };

      res.json(detailedSubmission);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching submission",
        error: error.message,
      });
    }
  }
);

/* ===== GET ALL SUBMISSIONS FOR A COURSE (instructor only) ===== */
// Get all submissions for a course
router.get("/:courseId/submissions", authenticate, async (req, res) => {
  try {
    const course = await Course.findById(req.params.courseId);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check if user is the instructor
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Only instructor can view submissions" });
    }

    const submissions = await QuizSubmission.find({
      course: req.params.courseId,
    })
      .populate("student", "name email")
      .sort({ submittedAt: -1 });

    res.json(submissions);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching submissions",
      error: error.message,
    });
  }
});

/* ===== GET STUDENT'S QUIZ SUBMISSIONS ===== */
// Get all quiz submissions for a student in a course
router.get(
  "/:courseId/my-submissions",
  authenticate,
  async (req, res) => {
    try {
      const submissions = await QuizSubmission.find({
        course: req.params.courseId,
        student: req.user.id,
      }).sort({ submittedAt: -1 });

      res.json(submissions);
    } catch (error) {
      res.status(500).json({
        message: "Error fetching submissions",
        error: error.message,
      });
    }
  }
);

module.exports = router;
