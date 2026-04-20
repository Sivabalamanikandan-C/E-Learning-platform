const express = require("express");
const { authenticate, authorizeAdmin } = require("../middleware/auth");
const Student = require("../models/Student");
const Complaint = require("../models/Complaint");
const Instructor = require("../models/Instructor");
const Course = require("../models/Course");
const Payment = require("../models/Payment");
const { sendSuspensionEmail, sendUnsuspensionEmail, sendEmail } = require("../utils/emailService");

const router = express.Router();

/* ================= ADMIN DASHBOARD - GET STATS ================= */
router.get("/dashboard/stats", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const totalStudents = await Student.countDocuments();
    const totalInstructors = await Instructor.countDocuments();
    const totalCourses = await Course.countDocuments();
    const totalPayments = await Payment.countDocuments();
    
    const totalRevenue = await Payment.aggregate([
      { $group: { _id: null, total: { $sum: "$amount" } } }
    ]);

    res.json({
      totalStudents,
      totalInstructors,
      totalCourses,
      totalPayments,
      totalRevenue: totalRevenue[0]?.total || 0,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET ALL STUDENTS ================= */
router.get("/students", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const students = await Student.find().select("-password");
    res.json(students);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET ALL INSTRUCTORS ================= */
router.get("/instructors", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const instructors = await Instructor.find().select("-password");
    res.json(instructors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET ALL COURSES ================= */
router.get("/courses", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const courses = await Course.find().populate("instructor", "name email");
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= GET ALL PAYMENTS ================= */
router.get("/payments", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const payments = await Payment.find()
      .populate("studentId", "name email")
      .populate("courseId", "title price");
    res.json(payments);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= DELETE STUDENT ================= */
router.delete("/students/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    if (!student) return res.status(404).json({ message: "Student not found" });
    
    res.json({ message: "Student deleted successfully", student });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= DELETE INSTRUCTOR ================= */
router.delete("/instructors/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const instructor = await Instructor.findByIdAndDelete(req.params.id);
    if (!instructor) return res.status(404).json({ message: "Instructor not found" });
    
    res.json({ message: "Instructor deleted successfully", instructor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= SUSPEND STUDENT (ADMIN) ================= */
router.post("/students/:id/suspend", authenticate, authorizeAdmin, async (req, res) => {
  // Direct admin-initiated suspensions are no longer allowed.
  // Suspensions must be performed by approving instructor complaints.
  return res.status(403).json({ message: "Direct admin suspensions are disabled. Use the complaints approval workflow to suspend a student." });
});

/* ================= UNSUSPEND STUDENT (ADMIN) ================= */
router.post("/students/:id/unsuspend", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { unsuspendReason } = req.body;
    const student = await Student.findById(req.params.id);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    if (student.suspensionStatus !== "suspended") {
      return res.status(400).json({ message: "Student is not suspended" });
    }

    // detect if admin is unsuspending before the scheduled end date
    const now = new Date();
    const suspensionEnd = student.suspensionEndDate ? new Date(student.suspensionEndDate) : null;
    const unsuspendedEarly = suspensionEnd ? now < suspensionEnd : false;

    // when unsuspending early, reason is required
    if (unsuspendedEarly && (!unsuspendReason || unsuspendReason.trim() === "")) {
      return res.status(400).json({ message: "Unsuspend reason is required when unsuspending before end date" });
    }

    student.suspensionStatus = "active";
    student.suspensionReason = null;
    student.suspensionStartDate = null;
    student.suspensionEndDate = null;
    student.suspensionDuration = null;
    student.suspendedBy = null;

    await student.save();

    // Send unsuspension email
    try {
      await sendUnsuspensionEmail({
        to: student.email,
        studentName: student.name,
      });
    } catch (emailError) {
      console.error("Email sending error:", emailError);
    }

    // If admin unsuspended the student before the original end date,
    // mark any related approved complaints as resolved.
    if (unsuspendedEarly) {
      try {
        await Complaint.updateMany(
          { student: student._id, status: "approved" },
          { $set: { status: "resolved", unsuspendReason: unsuspendReason || null } }
        );
      } catch (complaintErr) {
        console.error("Error updating related complaints on unsuspend:", complaintErr);
      }
    }

    res.json({
      message: "Student unsuspended successfully",
      student,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= SUSPEND INSTRUCTOR (ADMIN) ================= */
router.post("/instructors/:id/suspend", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { reason, duration } = req.body;

    if (!reason || !duration) {
      return res.status(400).json({ message: "Reason and duration are required" });
    }

    if (parseInt(duration) < 1 || parseInt(duration) > 10) {
      return res.status(400).json({ message: "Duration must be between 1 and 10 days" });
    }

    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) return res.status(404).json({ message: "Instructor not found" });

    const now = new Date();
    const suspensionUntil = new Date(now);
    suspensionUntil.setDate(suspensionUntil.getDate() + parseInt(duration));

    instructor.isSuspended = true;
    instructor.suspensionReason = reason;
    instructor.suspensionUntil = suspensionUntil;

    await instructor.save();

    // Send simple suspension email per spec
    try {
      const formattedDate = suspensionUntil.toLocaleDateString("en-US");
      const emailText = `Your account has been suspended.\n\nReason: ${reason}\nSuspended Until: ${formattedDate}\n\nYou will regain access automatically after the suspension period.`;
      await sendEmail({
        to: instructor.email,
        subject: "Account Suspension Notice",
        text: emailText,
      });
    } catch (emailErr) {
      console.error("Error sending instructor suspension email:", emailErr);
    }

    res.json({ message: "Instructor suspended successfully", instructor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= UNSUSPEND INSTRUCTOR (ADMIN) ================= */
router.post("/instructors/:id/unsuspend", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const instructor = await Instructor.findById(req.params.id);
    if (!instructor) return res.status(404).json({ message: "Instructor not found" });

    if (!instructor.isSuspended) {
      return res.status(400).json({ message: "Instructor is not suspended" });
    }

    instructor.isSuspended = false;
    instructor.suspensionReason = null;
    instructor.suspensionUntil = null;

    await instructor.save();

    try {
      await sendEmail({
        to: instructor.email,
        subject: "Account Reactivated - Welcome Back!",
        text: `Your account suspension has been lifted. You can now login again.`,
      });
    } catch (emailErr) {
      console.error("Error sending instructor unsuspend email:", emailErr);
    }

    res.json({ message: "Instructor unsuspended successfully", instructor });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= ADMIN COURSE APPROVAL SYSTEM ================= */

/* GET ALL COURSES (with approval status) */
router.get("/courses/approval/all", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const courses = await Course.find()
      .populate("instructor", "name email")
      .sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* GET SINGLE COURSE FOR REVIEW */
router.get("/courses/approval/:id", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id).populate("instructor", "name email");
    if (!course) return res.status(404).json({ message: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* APPROVE COURSE */
router.post("/courses/approval/:id/approve", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.status = "approved";
    course.approvedAt = new Date();
    course.approvedBy = req.user._id;
    course.rejectionReason = null;
    course.rejectedAt = null;
    course.rejectedBy = null;

    await course.save();

    res.json({ message: "Course approved successfully", course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* REJECT COURSE */
router.post("/courses/approval/:id/reject", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { rejectionReason } = req.body;

    if (!rejectionReason || rejectionReason.trim() === "") {
      return res.status(400).json({ message: "Rejection reason is required" });
    }

    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ message: "Course not found" });

    course.status = "rejected";
    course.rejectionReason = rejectionReason;
    course.rejectedAt = new Date();
    course.rejectedBy = req.user._id;
    course.approvedAt = null;
    course.approvedBy = null;

    await course.save();

    res.json({ message: "Course rejected successfully", course });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
