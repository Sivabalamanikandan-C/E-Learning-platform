const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const { authenticate } = require("../middleware/auth");
const { authorizeInstructor, authorizeAdmin } = require("../middleware/auth");
const Complaint = require("../models/Complaint");
const Student = require("../models/Student");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { sendSuspensionEmail } = require("../utils/emailService");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "..", "uploads", "complaints");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const name = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    cb(null, name);
  },
});

const upload = multer({ storage });

/* ================= INSTRUCTOR - RAISE COMPLAINT ================= */
router.post(
  "/",
  authenticate,
  authorizeInstructor,
  upload.single("image"),
  async (req, res) => {
    try {
      const { title, description, studentId } = req.body;

      if (!title || !description || !studentId) {
        return res.status(400).json({ message: "All fields are required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "Image is required" });
      }

      const student = await Student.findById(studentId);
      if (!student) return res.status(404).json({ message: "Student not found" });

      const filename = req.file.filename;
      const imagePath = `/uploads/complaints/${filename}`;

      const complaint = new Complaint({
        instructor: req.user._id,
        student: studentId,
        title,
        description,
        image: imagePath,
      });

      await complaint.save();

      res.status(201).json({ message: "Complaint submitted", complaint });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: err.message });
    }
  }
);

/* ================= INSTRUCTOR - MY COMPLAINTS ================= */
router.get("/mine", authenticate, authorizeInstructor, async (req, res) => {
  try {
    const complaints = await Complaint.find({ instructor: req.user._id })
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= INSTRUCTOR - GET STUDENTS ENROLLED IN MY COURSES ================= */
router.get(
  "/students/enrolled",
  authenticate,
  authorizeInstructor,
  async (req, res) => {
    try {
      // find courses by this instructor
      const courses = await Course.find({ instructor: req.user._id }).select("_id");
      const courseIds = courses.map((c) => c._id);

      if (courseIds.length === 0) return res.json([]);

      const enrollments = await Enrollment.find({ course: { $in: courseIds } }).populate(
        "student",
        "name email"
      );

      // deduplicate students
      const map = new Map();
      enrollments.forEach((enr) => {
        if (enr.student) map.set(String(enr.student._id), enr.student);
      });

      const students = Array.from(map.values());
      res.json(students);
    } catch (err) {
      res.status(500).json({ message: err.message });
    }
  }
);

/* ================= PUBLIC/ADMIN - GET COMPLAINT BY ID ================= */
/* ================= ADMIN - LIST ALL COMPLAINTS ================= */
router.get("/admin/all", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const complaints = await Complaint.find()
      .populate("instructor", "name email")
      .populate("student", "name email")
      .sort({ createdAt: -1 });
    res.json(complaints);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= PUBLIC/ADMIN - GET COMPLAINT BY ID ================= */
router.get("/:id", authenticate, async (req, res) => {
  try {
    const complaint = await Complaint.findById(req.params.id)
      .populate("instructor", "name email")
      .populate("student", "name email");

    if (!complaint) return res.status(404).json({ message: "Complaint not found" });
    res.json(complaint);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= ADMIN - APPROVE ================= */
router.post("/admin/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { suspensionDays, suspensionReason } = req.body;

    if (!suspensionDays || isNaN(suspensionDays)) {
      return res.status(400).json({ message: "suspensionDays (1-10) is required" });
    }

    const days = parseInt(suspensionDays, 10);
    if (days < 1 || days > 10) {
      return res.status(400).json({ message: "suspensionDays must be between 1 and 10" });
    }

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    // determine reason: provided or auto-fill from complaint description
    const reason = suspensionReason && suspensionReason.trim() !== "" ? suspensionReason : complaint.description;

    // update complaint
    complaint.status = "approved";
    complaint.rejectionReason = null;
    await complaint.save();

    // suspend student
    const student = await Student.findById(complaint.student);
    if (!student) return res.status(404).json({ message: "Student not found to suspend" });

    const now = new Date();
    const end = new Date(now);
    end.setDate(end.getDate() + days);

    student.suspensionStatus = "suspended";
    student.isSuspended = true;
    student.suspensionReason = reason;
    student.suspensionStartDate = now;
    student.suspensionEndDate = end;
    student.suspensionDuration = days;
    student.suspendedBy = req.user._id;

    await student.save();

    // send suspension email (best-effort)
    try {
      const emailResult = await sendSuspensionEmail({
        to: student.email,
        studentName: student.name,
        reason,
        suspensionEndDate: end,
        duration: days,
      });
      if (emailResult && emailResult.success) {
        console.log(`Suspension email sent to ${student.email}`);
      } else {
        console.error("Failed to send suspension email:", emailResult);
      }
    } catch (emailErr) {
      console.error("Error sending suspension email:", emailErr);
    }

    res.json({ message: "Complaint approved and student suspended", complaint, student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= ADMIN - REJECT (with reason) ================= */
router.post("/admin/:id/reject", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;
    if (!rejectionReason) return res.status(400).json({ message: "Rejection reason required" });

    const complaint = await Complaint.findById(req.params.id);
    if (!complaint) return res.status(404).json({ message: "Complaint not found" });

    complaint.status = "rejected";
    complaint.rejectionReason = rejectionReason;
    await complaint.save();

    res.json({ message: "Complaint rejected", complaint });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
