const express = require("express");
const router = express.Router();
const SuspensionInquiry = require("../models/SuspensionInquiry");
const Student = require("../models/Student");
const Instructor = require("../models/Instructor");
const { authenticate, authorizeAdmin } = require("../middleware/auth");

// Public: create a suspension inquiry by email (student OR instructor)
router.post("/", async (req, res) => {
  try {
    const { email, message } = req.body;
    if (!email) return res.status(400).json({ message: "Email is required" });

    const lower = email.toLowerCase();
    let student = await Student.findOne({ email: lower });
    let instructor = await Instructor.findOne({ email: lower });

    if (!student && !instructor) return res.status(404).json({ message: "User not found" });

    let userId, userRole;
    if (student) {
      userId = student._id;
      userRole = "Student";
    } else if (instructor) {
      userId = instructor._id;
      userRole = "Instructor";
    }

    // Validate before creating
    if (!userId || !userRole) {
      return res.status(400).json({ message: "Failed to determine user information" });
    }

    const inquiry = await SuspensionInquiry.create({
      userId,
      userRole,
      message: message || "",
    });

    // Manually populate userId based on userRole
    let populatedInquiry = inquiry.toObject();
    try {
      if (userRole === "Student") {
        const user = await Student.findById(userId).select("name email role").lean();
        if (user) {
          populatedInquiry.userId = user;
        }
      } else if (userRole === "Instructor") {
        const user = await Instructor.findById(userId).select("name email role").lean();
        if (user) {
          populatedInquiry.userId = user;
        }
      }
    } catch (popErr) {
      console.warn(`Warning: Failed to populate user data:`, popErr.message);
    }

    res.status(201).json({ message: "Inquiry submitted", inquiry: populatedInquiry });
  } catch (err) {
    console.error("Error creating suspension inquiry:", err);
    res.status(500).json({ message: err.message });
  }
});

// Public: get a user's inquiries and replies by email (student OR instructor)
router.get("/user/:email", async (req, res) => {
  try {
    const { email } = req.params;
    const lower = email.toLowerCase();
    let student = await Student.findOne({ email: lower });
    let instructor = await Instructor.findOne({ email: lower });

    if (!student && !instructor) return res.status(404).json({ message: "User not found" });

    let userId;
    if (student) userId = student._id;
    if (instructor) userId = instructor._id;

    let inquiries = await SuspensionInquiry.find({ userId: userId })
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate userId based on userRole
    for (let i = 0; i < inquiries.length; i++) {
      try {
        if (inquiries[i].userRole === "Student") {
          const user = await Student.findById(inquiries[i].userId).select("name email role").lean();
          if (user) {
            inquiries[i].userId = user;
          }
        } else if (inquiries[i].userRole === "Instructor") {
          const user = await Instructor.findById(inquiries[i].userId).select("name email role").lean();
          if (user) {
            inquiries[i].userId = user;
          }
        }
      } catch (popErr) {
        console.warn(`Warning: Failed to populate user for inquiry ${inquiries[i]._id}:`, popErr.message);
      }
    }

    res.json(inquiries);
  } catch (err) {
    console.error("Error fetching user inquiries:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: list all inquiries with user details populated
router.get("/admin", authenticate, authorizeAdmin, async (req, res) => {
  try {
    let inquiries = await SuspensionInquiry.find()
      .sort({ createdAt: -1 })
      .lean();

    // Manually populate userId based on userRole
    for (let i = 0; i < inquiries.length; i++) {
      try {
        if (inquiries[i].userRole === "Student") {
          const user = await Student.findById(inquiries[i].userId).select("name email role").lean();
          if (user) {
            inquiries[i].userId = user;
          }
        } else if (inquiries[i].userRole === "Instructor") {
          const user = await Instructor.findById(inquiries[i].userId).select("name email role").lean();
          if (user) {
            inquiries[i].userId = user;
          }
        }
      } catch (popErr) {
        console.warn(`Warning: Failed to populate user for inquiry ${inquiries[i]._id}:`, popErr.message);
      }
    }

    res.json(inquiries);
  } catch (err) {
    console.error("Error fetching suspension inquiries:", err);
    res.status(500).json({ message: err.message });
  }
});

// Admin: reply to an inquiry and mark replied
router.post("/:id/reply", authenticate, authorizeAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { adminReply } = req.body;

    // Use findByIdAndUpdate to avoid validation issues with missing fields
    const inquiry = await SuspensionInquiry.findByIdAndUpdate(
      id,
      {
        adminReply: adminReply || "",
        status: "replied"
      },
      { new: true }
    );

    if (!inquiry) return res.status(404).json({ message: "Inquiry not found" });

    // Manually populate userId based on userRole
    let populatedInquiry = inquiry.toObject ? inquiry.toObject() : inquiry;
    
    if (!inquiry.userId || !inquiry.userRole) {
      console.warn(`Warning: Inquiry ${id} has missing userId or userRole`);
      res.json({ message: "Replied", inquiry: populatedInquiry });
      return;
    }

    try {
      if (inquiry.userRole === "Student") {
        const user = await Student.findById(inquiry.userId).select("name email role").lean();
        if (user) {
          populatedInquiry.userId = user;
        }
      } else if (inquiry.userRole === "Instructor") {
        const user = await Instructor.findById(inquiry.userId).select("name email role").lean();
        if (user) {
          populatedInquiry.userId = user;
        }
      }
    } catch (popErr) {
      console.warn(`Warning: Failed to populate user for inquiry ${id}:`, popErr.message);
    }

    res.json({ message: "Replied", inquiry: populatedInquiry });
  } catch (err) {
    console.error("Error replying to inquiry:", err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
