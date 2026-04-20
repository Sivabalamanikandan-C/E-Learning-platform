const express = require("express");
const router = express.Router();
const Assignment = require("../models/Assignment");
const AssignmentSubmission = require("../models/AssignmentSubmission");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { authenticate } = require("../middleware/auth");
const upload = require("../config/multer");
const path = require("path");
const fs = require("fs");

// Create uploads directory if it doesn't exist
const uploadDir = path.join(__dirname, "../uploads/assignments");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

/* ===== INSTRUCTOR ROUTES ===== */

// Create Assignment
router.post("/create", authenticate, upload.single("referenceFile"), async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Only instructors can create assignments" });
    }

    const { title, instructions, course, dueDate, maxMarks, submissionType } = req.body;

    if (!title || !instructions || !course || !dueDate || !maxMarks || !submissionType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const referenceFile = req.file
      ? {
          fileName: req.file.originalname,
          fileUrl: `/uploads/assignments/${req.file.filename}`,
        }
      : null;

    const assignment = new Assignment({
      title,
      instructions,
      course,
      instructor: req.user._id,
      dueDate: new Date(dueDate),
      maxMarks,
      submissionType,
      referenceFile,
      isPublished: true,
    });

    await assignment.save();
    res.status(201).json({ message: "Assignment created successfully", assignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error creating assignment", error: error.message });
  }
});

// Get All Assignments for a Course (Instructor)
router.get("/instructor/course/:courseId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { courseId } = req.params;

    // Verify instructor owns the course
    const course = await Course.findById(courseId);
    if (!course || course.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Course not found or unauthorized" });
    }

    const assignments = await Assignment.find({
      course: courseId,
      instructor: req.user._id,
    }).populate("course", "title");

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching assignments", error: error.message });
  }
});

// Get All Assignments (Instructor - Dashboard)
router.get("/instructor/all", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignments = await Assignment.find({
      instructor: req.user._id,
    })
      .populate("course", "title _id")
      .sort({ createdAt: -1 });

    res.json(assignments);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching assignments", error: error.message });
  }
});

// Get Single Assignment Details (Instructor)
router.get("/instructor/:assignmentId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId).populate("course", "title");

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(assignment);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching assignment", error: error.message });
  }
});

// Update Assignment (Instructor)
router.put("/update/:assignmentId", authenticate, upload.single("referenceFile"), async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { title, instructions, dueDate, maxMarks, submissionType } = req.body;

    if (title) assignment.title = title;
    if (instructions) assignment.instructions = instructions;
    if (dueDate) assignment.dueDate = new Date(dueDate);
    if (maxMarks) assignment.maxMarks = maxMarks;
    if (submissionType) assignment.submissionType = submissionType;

    if (req.file) {
      assignment.referenceFile = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/assignments/${req.file.filename}`,
      };
    }

    assignment.updatedAt = Date.now();
    await assignment.save();

    res.json({ message: "Assignment updated successfully", assignment });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error updating assignment", error: error.message });
  }
});

// Delete Assignment (Instructor)
router.delete("/delete/:assignmentId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete associated submissions
    await AssignmentSubmission.deleteMany({ assignment: req.params.assignmentId });

    // Delete reference file if exists
    if (assignment.referenceFile && assignment.referenceFile.fileUrl) {
      const filePath = path.join(__dirname, "..", assignment.referenceFile.fileUrl);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    await Assignment.findByIdAndDelete(req.params.assignmentId);

    res.json({ message: "Assignment deleted successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error deleting assignment", error: error.message });
  }
});

// Get All Submissions for an Assignment (Instructor)
router.get("/submissions/:assignmentId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment || assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const submissions = await AssignmentSubmission.find({
      assignment: req.params.assignmentId,
    })
      .populate("student", "name email")
      .sort("-submissionDate");

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching submissions", error: error.message });
  }
});

// Grade Submission (Instructor)
router.post("/grade/:submissionId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const { obtainedMarks, feedback } = req.body;

    if (obtainedMarks === undefined || obtainedMarks === null) {
      return res.status(400).json({ message: "Obtained marks required" });
    }

    const submission = await AssignmentSubmission.findById(req.params.submissionId);

    if (!submission) {
      return res.status(404).json({ message: "Submission not found" });
    }

    // Verify instructor owns the assignment
    const assignment = await Assignment.findById(submission.assignment);
    if (assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    if (obtainedMarks > assignment.maxMarks) {
      return res.status(400).json({ message: "Obtained marks cannot exceed maximum marks" });
    }

    submission.obtainedMarks = obtainedMarks;
    submission.feedback = feedback || null;
    submission.status = "graded";
    submission.gradedAt = new Date();
    submission.gradedBy = req.user._id;

    await submission.save();

    res.json({ message: "Submission graded successfully", submission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error grading submission", error: error.message });
  }
});

/* ===== STUDENT ROUTES ===== */

// Get All Assignments for Student (from enrolled courses)
router.get("/student/all", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Get all enrolled courses
    const enrollments = await Enrollment.find({
      student: req.user._id,
      status: { $in: ["active", "completed"] },
    }).select("course");

    const courseIds = enrollments.map((e) => e.course);

    // Get all assignments for those courses
    const assignments = await Assignment.find({
      course: { $in: courseIds },
      isPublished: true,
    })
      .populate("course", "title instructor")
      .populate("instructor", "name")
      .sort("-createdAt");

    // Get submission status for each assignment
    const assignmentsWithStatus = await Promise.all(
      assignments.map(async (assignment) => {
        const submission = await AssignmentSubmission.findOne({
          assignment: assignment._id,
          student: req.user._id,
        });

        return {
          ...assignment.toObject(),
          submission: submission || null,
        };
      })
    );

    res.json(assignmentsWithStatus);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching assignments", error: error.message });
  }
});

// Get Single Assignment Details (Student)
router.get("/student/:assignmentId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId)
      .populate("course", "title")
      .populate("instructor", "name email");

    if (!assignment || !assignment.isPublished) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if student is enrolled in the course
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: assignment.course._id,
      status: { $in: ["active", "completed"] },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    // Get submission if exists
    const submission = await AssignmentSubmission.findOne({
      assignment: req.params.assignmentId,
      student: req.user._id,
    });

    res.json({ assignment, submission });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching assignment", error: error.message });
  }
});

// Submit Assignment (Student)
router.post("/submit/:assignmentId", authenticate, upload.single("submissionFile"), async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Check if student is enrolled
    const enrollment = await Enrollment.findOne({
      student: req.user._id,
      course: assignment.course,
      status: { $in: ["active", "completed"] },
    });

    if (!enrollment) {
      return res.status(403).json({ message: "You are not enrolled in this course" });
    }

    const { submissionText } = req.body;
    const now = new Date();
    const isLate = now > assignment.dueDate;

    // Validate submission type
    if (assignment.submissionType === "file" && !req.file) {
      return res.status(400).json({ message: "File upload required for this assignment" });
    }

    if (assignment.submissionType === "text" && !submissionText) {
      return res.status(400).json({ message: "Text submission required for this assignment" });
    }

    // Check if submission already exists
    let submission = await AssignmentSubmission.findOne({
      assignment: req.params.assignmentId,
      student: req.user._id,
    });

    if (!submission) {
      submission = new AssignmentSubmission({
        assignment: req.params.assignmentId,
        student: req.user._id,
      });
    }

    // Update submission details
    if (submissionText) {
      submission.submissionText = submissionText;
    }

    if (req.file) {
      submission.submissionFile = {
        fileName: req.file.originalname,
        fileUrl: `/uploads/assignments/${req.file.filename}`,
      };
    }

    submission.submissionDate = now;
    submission.isLate = isLate;
    submission.status = "submitted";

    await submission.save();

    res.status(201).json({
      message: isLate ? "Assignment submitted late" : "Assignment submitted successfully",
      submission,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error submitting assignment", error: error.message });
  }
});

// Get Student's Submission for an Assignment
router.get("/student-submission/:assignmentId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "student") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const submission = await AssignmentSubmission.findOne({
      assignment: req.params.assignmentId,
      student: req.user._id,
    })
      .populate("assignment")
      .populate("gradedBy", "name");

    if (!submission) {
      return res.status(404).json({ message: "No submission found" });
    }

    res.json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching submission", error: error.message });
  }
});

// Get Assignment Submission Statistics (Instructor)
router.get("/stats/:assignmentId", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "instructor") {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const assignment = await Assignment.findById(req.params.assignmentId);

    if (!assignment || assignment.instructor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    const totalEnrolled = await Enrollment.countDocuments({
      course: assignment.course,
      status: { $in: ["active", "completed"] },
    });

    const submitted = await AssignmentSubmission.countDocuments({
      assignment: req.params.assignmentId,
      status: "submitted",
    });

    const graded = await AssignmentSubmission.countDocuments({
      assignment: req.params.assignmentId,
      status: "graded",
    });

    const notSubmitted = totalEnrolled - submitted - graded;

    res.json({
      totalEnrolled,
      submitted,
      graded,
      notSubmitted: notSubmitted > 0 ? notSubmitted : 0,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Error fetching statistics", error: error.message });
  }
});

module.exports = router;
