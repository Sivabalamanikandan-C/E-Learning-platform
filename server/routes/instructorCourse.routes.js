const express = require("express");
const Course = require("../models/Course");
const CourseLevelSuspension = require("../models/CourseLevelSuspension");
const Student = require("../models/Student");
const { authenticate, authorizeInstructor } = require("../middleware/auth");

const router = express.Router();

router.post(
  "/create-course",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      // Log quiz payload for debugging
      if (req.body && req.body.quiz) {
        console.log("[create-course] quiz payload:", JSON.stringify(req.body.quiz, null, 2).slice(0, 1000));
      }

      // If quiz is provided, validate it
      if (req.body && req.body.quiz) {
        const quizErrors = validateQuiz(req.body.quiz);
        if (quizErrors) {
          return res.status(400).json({ message: "Quiz validation failed", errors: quizErrors });
        }
      }

      // Create course with all data including quiz
      const courseData = {
        title: req.body.title,
        category: req.body.category,
        level: req.body.level,
        language: req.body.language,
        subtitle: req.body.subtitle,
        description: req.body.description,
        price: req.body.price,
        thumbnail: req.body.thumbnail,
        lectures: req.body.lectures || [],
        instructor: req.user.id,
        status: "pending",
      };

      // Validate thumbnail URL - reject localhost URLs
      if (courseData.thumbnail && courseData.thumbnail.includes('localhost')) {
        return res.status(400).json({ 
          message: "Invalid thumbnail URL. Please upload image using Cloudinary.",
          details: "Local preview URLs are not allowed. Ensure thumbnail is uploaded to Cloudinary."
        });
      }

      // Add quiz if provided
      if (req.body.quiz) {
        courseData.quiz = req.body.quiz;
      }

      const course = await Course.create(courseData);
      console.log("[create-course] course created with quiz:", course.quiz ? "YES" : "NO");

      res.status(201).json(course);
    } catch (err) {
      console.error("[create-course] error:", err);
      res.status(500).json({ message: "Course creation failed", error: err.message });
    }
  }
);


/* ===== VALIDATION HELPER ===== */
const validateQuiz = (quiz) => {
  if (!quiz) return null; // Quiz is optional

  const errors = [];

  if (!quiz.title || quiz.title.trim() === "") {
    errors.push("Quiz title is required");
  }

  if (!quiz.description || quiz.description.trim() === "") {
    errors.push("Quiz description is required");
  }

  if (!quiz.timeLimit || quiz.timeLimit <= 0) {
    errors.push("Quiz time limit must be greater than 0");
  }

  if (!quiz.questions || quiz.questions.length === 0) {
    errors.push("Quiz must have at least 1 question");
  }

  // Validate each question
  if (quiz.questions) {
    quiz.questions.forEach((question, index) => {
      if (!question.questionText || question.questionText.trim() === "") {
        errors.push(`Question ${index + 1}: Question text is required`);
      }

      if (!question.points || question.points <= 0) {
        errors.push(`Question ${index + 1}: Points must be greater than 0`);
      }

      if (!question.questionType) {
        errors.push(`Question ${index + 1}: Question type is required`);
      }

      if (
        !question.options ||
        question.options.length < 2
      ) {
        errors.push(`Question ${index + 1}: Must have at least 2 options`);
      }

      if (question.options) {
        question.options.forEach((option, optionIndex) => {
          if (!option.optionText || option.optionText.trim() === "") {
            errors.push(
              `Question ${index + 1}, Option ${optionIndex + 1}: Option text is required`
            );
          }
        });

        const correctCount = question.options.filter((o) => o.isCorrect).length;
        if (correctCount === 0) {
          errors.push(
            `Question ${index + 1}: Must have at least 1 correct answer`
          );
        }
      }
    });
  }

  return errors.length > 0 ? errors : null;
};

/* ===== UPDATE COURSE ===== */
router.put(
  "/update-course/:id",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check authorization
      if (course.instructor.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this course" });
      }

      // Validate quiz if included in update
      if (req.body.quiz) {
        const quizErrors = validateQuiz(req.body.quiz);
        if (quizErrors) {
          return res.status(400).json({
            message: "Quiz validation failed",
            errors: quizErrors,
          });
        }
      }

      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        req.body,
        { new: true, runValidators: false }
      );

      res.json(updatedCourse);
    } catch (err) {
      res.status(500).json({ message: "Course update failed", error: err.message });
    }
  }

);


/* ===== GET COURSES (for announcements, etc.) ===== */
router.get(
  "/courses",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const courses = await Course.find({ instructor: req.user.id }).select(
        "title description price thumbnail isAvailable createdAt status"
      );

      res.json({ courses });
    } catch (err) {
      res.status(500).json({ message: "Error fetching courses", error: err.message });
    }
  }
);

/* ===== GET COURSE ===== */
router.get("/:id", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);

    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Check authorization
    if (course.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to view this course" });
    }

    res.json(course);
  } catch (err) {
    res.status(500).json({ message: "Error fetching course", error: err.message });
  }
});

/* ===== GET ALL COURSES FOR INSTRUCTOR ===== */
router.get(
  "/courses/list",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const courses = await Course.find({ instructor: req.user.id }).select(
        "title description price thumbnail isAvailable createdAt status"
      );

      res.json(courses);
    } catch (err) {
      res.status(500).json({ message: "Error fetching courses", error: err.message });
    }
  }
);

/* ===== UPDATE COURSE AVAILABILITY ===== */
router.put(
  "/courses/:id/availability",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check authorization
      if (course.instructor.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to update this course" });
      }

      const { isAvailable } = req.body;

      const updatedCourse = await Course.findByIdAndUpdate(
        req.params.id,
        { isAvailable },
        { new: true }
      );

      res.json({
        message: `Course ${isAvailable ? "made available" : "made unavailable"}`,
        course: updatedCourse,
      });
    } catch (err) {
      res.status(500).json({ message: "Error updating course", error: err.message });
    }
  }
);

/* ===== DELETE COURSE ===== */
router.delete(
  "/courses/:id",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const course = await Course.findById(req.params.id);

      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      // Check authorization
      if (course.instructor.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized to delete this course" });
      }

      await Course.findByIdAndDelete(req.params.id);

      res.json({ message: "Course deleted successfully" });
    } catch (err) {
      res.status(500).json({ message: "Error deleting course", error: err.message });
    }
  }
);

/* ================= SUSPEND STUDENT FROM COURSE (INSTRUCTOR) ================= */
router.post(
  "/:courseId/students/:studentId/suspend",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const { courseId, studentId } = req.params;
      const { reason, duration } = req.body;

      if (!reason || !duration) {
        return res.status(400).json({ message: "Reason and duration are required" });
      }

      // Verify course exists and instructor is authorized
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (course.instructor.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Not authorized to suspend students in this course",
        });
      }

      // Verify student exists
      const student = await Student.findById(studentId);
      if (!student) {
        return res.status(404).json({ message: "Student not found" });
      }

      const suspensionStartDate = new Date();
      const suspensionEndDate = new Date(suspensionStartDate);
      suspensionEndDate.setDate(suspensionEndDate.getDate() + parseInt(duration));

      // Check if there's already an active suspension for this student in this course
      const existingSuspension = await CourseLevelSuspension.findOne({
        studentId: studentId,
        courseId: courseId,
        suspensionStatus: "active",
      });

      if (existingSuspension) {
        return res.status(400).json({
          message: "Student is already suspended from this course",
        });
      }

      // Create or update course-level suspension
      const suspension = await CourseLevelSuspension.findOneAndUpdate(
        { studentId, courseId },
        {
          studentId,
          courseId,
          instructorId: req.user.id,
          reason,
          suspensionStatus: "active",
          suspensionStartDate,
          suspensionEndDate,
          suspensionDuration: parseInt(duration),
          liftedAt: null,
          liftedBy: null,
          liftReason: null,
        },
        { upsert: true, new: true }
      );

      res.json({
        message: "Student suspended from course successfully",
        suspension,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/* ================= UNSUSPEND STUDENT FROM COURSE (INSTRUCTOR) ================= */
router.post(
  "/:courseId/students/:studentId/unsuspend",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const { courseId, studentId } = req.params;
      const { liftReason } = req.body;

      // Verify course exists and instructor is authorized
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (course.instructor.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Not authorized to unsuspend students in this course",
        });
      }

      // Find active suspension
      const suspension = await CourseLevelSuspension.findOne({
        studentId: studentId,
        courseId: courseId,
        suspensionStatus: "active",
      });

      if (!suspension) {
        return res.status(404).json({
          message: "No active suspension found for this student in this course",
        });
      }

      suspension.suspensionStatus = "lifted";
      suspension.liftedAt = new Date();
      suspension.liftedBy = req.user.id;
      suspension.liftReason = liftReason || null;
      await suspension.save();

      res.json({
        message: "Student unsuspended from course successfully",
        suspension,
      });
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/* ================= GET COURSE SUSPENSIONS (INSTRUCTOR) ================= */
router.get(
  "/:courseId/suspensions",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      const { courseId } = req.params;

      // Verify course exists and instructor is authorized
      const course = await Course.findById(courseId);
      if (!course) {
        return res.status(404).json({ message: "Course not found" });
      }

      if (course.instructor.toString() !== req.user.id) {
        return res.status(403).json({
          message: "Not authorized to view suspensions for this course",
        });
      }

      // Get all suspensions for this course
      const suspensions = await CourseLevelSuspension.find({
        courseId: courseId,
      })
        .populate("studentId", "name email")
        .populate("instructorId", "name")
        .sort({ createdAt: -1 });

      res.json(suspensions);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

module.exports = router;
