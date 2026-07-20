const express = require("express");
const router = express.Router();
const Question = require("../models/Question");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { authenticate, authorizeInstructor } = require("../middleware/auth");

/* ===== STUDENT ROUTES ===== */

// Get all questions for a specific lecture
router.get("/student/lecture/:courseId/:lectureIndex", authenticate, async (req, res) => {
  try {
    const { courseId, lectureIndex } = req.params;
    const studentId = req.user._id;

    // Check if student is enrolled in this course
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ["active", "completed"] },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const questions = await Question.find({
      course: courseId,
      student: studentId,
      "lecture.lectureIndex": parseInt(lectureIndex),
    })
      .populate("student", "name")
      .sort({ createdAt: -1 });

    res.json(questions);
  } catch (error) {
    console.error("Error fetching questions:", error);
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
});

// Submit a new question
router.post("/student/ask", authenticate, async (req, res) => {
  try {
    const { courseId, lectureIndex, lectureTitle, content } = req.body;
    const studentId = req.user._id;

    if (!courseId || lectureIndex === undefined || !lectureTitle || !content) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (!content.trim()) {
      return res.status(400).json({ message: "Question content cannot be empty" });
    }

    // Check if student is enrolled in this course
    const enrollment = await Enrollment.findOne({
      student: studentId,
      course: courseId,
      status: { $in: ["active", "completed"] },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const question = new Question({
      student: studentId,
      course: courseId,
      lecture: {
        lectureIndex: parseInt(lectureIndex),
        lectureTitle,
      },
      content: content.trim(),
    });

    await question.save();
    await question.populate("student", "name");

    res.status(201).json({
      message: "Question submitted successfully",
      question,
    });
  } catch (error) {
    console.error("Error submitting question:", error);
    res.status(500).json({ message: "Error submitting question", error: error.message });
  }
});

/* ===== INSTRUCTOR ROUTES ===== */

// Get all questions for instructor (both answered and pending, grouped by course and lecture)
router.get("/instructor/all", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get all courses owned by this instructor
    const courses = await Course.find({ instructor: instructorId }).select("_id title");
    const courseIds = courses.map((c) => c._id);

    // Get all questions for these courses (both answered and pending)
    const questions = await Question.find({
      course: { $in: courseIds },
    })
      .populate("student", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    // Group by course and lecture
    const grouped = {};
    let pendingCount = 0;
    let answeredCount = 0;

    questions.forEach((question) => {
      if (question.status === "pending") {
        pendingCount++;
      } else if (question.status === "answered") {
        answeredCount++;
      }

      const courseName = question.course.title;
      const lectureTitle = question.lecture.lectureTitle;

      if (!grouped[courseName]) {
        grouped[courseName] = {};
      }

      if (!grouped[courseName][lectureTitle]) {
        grouped[courseName][lectureTitle] = [];
      }

      grouped[courseName][lectureTitle].push(question);
    });

    res.json({ 
      grouped, 
      total: questions.length,
      pendingCount,
      answeredCount,
    });
  } catch (error) {
    console.error("Error fetching all questions:", error);
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
});

// Get all unanswered questions for instructor (grouped by course and lecture)
router.get("/instructor/unanswered", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get all courses owned by this instructor
    const courses = await Course.find({ instructor: instructorId }).select("_id title");
    const courseIds = courses.map((c) => c._id);

    // Get all unanswered questions for these courses
    const questions = await Question.find({
      course: { $in: courseIds },
      status: "pending",
    })
      .populate("student", "name email")
      .populate("course", "title")
      .sort({ createdAt: -1 });

    // Group by course and lecture
    const grouped = {};

    questions.forEach((question) => {
      const courseName = question.course.title;
      const lectureTitle = question.lecture.lectureTitle;

      if (!grouped[courseName]) {
        grouped[courseName] = {};
      }

      if (!grouped[courseName][lectureTitle]) {
        grouped[courseName][lectureTitle] = [];
      }

      grouped[courseName][lectureTitle].push(question);
    });

    res.json({ grouped, total: questions.length });
  } catch (error) {
    console.error("Error fetching unanswered questions:", error);
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
});

// Get all questions for a specific course (for instructor)
router.get("/instructor/course/:courseId", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const { courseId } = req.params;
    const instructorId = req.user._id;

    // Verify instructor owns this course
    const course = await Course.findById(courseId);
    if (!course || course.instructor.toString() !== instructorId) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const questions = await Question.find({ course: courseId })
      .populate("student", "name email")
      .sort({ createdAt: -1 });

    // Group by lecture
    const grouped = {};
    questions.forEach((question) => {
      const lectureTitle = question.lecture.lectureTitle;
      if (!grouped[lectureTitle]) {
        grouped[lectureTitle] = [];
      }
      grouped[lectureTitle].push(question);
    });

    res.json({ grouped, total: questions.length });
  } catch (error) {
    console.error("Error fetching course questions:", error);
    res.status(500).json({ message: "Error fetching questions", error: error.message });
  }
});

// Submit answer to a question
router.post("/:questionId/answer", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const { questionId } = req.params;
    const { content } = req.body;
    const instructorId = req.user._id;

    if (!content || !content.trim()) {
      return res.status(400).json({ message: "Answer content cannot be empty" });
    }

    const question = await Question.findById(questionId);

    if (!question) {
      return res.status(404).json({ message: "Question not found" });
    }

    // Verify instructor owns the course
    const course = await Course.findById(question.course);
    
    if (!course) {
      return res.status(404).json({ message: "Course not found" });
    }

    // Compare instructor IDs properly (convert both to string)
    if (course.instructor.toString() !== instructorId.toString()) {
      return res.status(403).json({ message: "You do not own this course" });
    }

    // Update question with answer
    question.answer = {
      content: content.trim(),
      answeredAt: new Date(),
    };
    question.status = "answered";

    await question.save();
    await question.populate("student", "name");

    res.json({
      message: "Answer submitted successfully",
      question,
    });
  } catch (error) {
    console.error("Error submitting answer:", error);
    res.status(500).json({ message: "Error submitting answer", error: error.message });
  }
});

// Get question statistics for instructor
router.get("/instructor/stats", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const instructorId = req.user._id;

    // Get all courses owned by this instructor
    const courses = await Course.find({ instructor: instructorId }).select("_id");
    const courseIds = courses.map((c) => c._id);

    const totalQuestions = await Question.countDocuments({
      course: { $in: courseIds },
    });

    const answeredQuestions = await Question.countDocuments({
      course: { $in: courseIds },
      status: "answered",
    });

    const pendingQuestions = totalQuestions - answeredQuestions;

    res.json({
      totalQuestions,
      answeredQuestions,
      pendingQuestions,
    });
  } catch (error) {
    console.error("Error fetching statistics:", error);
    res.status(500).json({ message: "Error fetching statistics", error: error.message });
  }
});

module.exports = router;
