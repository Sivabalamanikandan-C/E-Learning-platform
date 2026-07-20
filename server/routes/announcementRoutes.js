const express = require("express");
const router = express.Router();
const Announcement = require("../models/Announcement");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const { protect, instructorOnly } = require("../middleware/authMiddleware");

// Create a new announcement
router.post("/", protect, instructorOnly, async (req, res) => {
  try {
    const { title, message, courses, isAllCourses, scheduledDate, status } = req.body;

    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const announcement = new Announcement({
      instructor: req.user.id,
      title,
      message,
      courses: isAllCourses ? [] : courses,
      isAllCourses,
      scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
      status: scheduledDate ? "Scheduled" : status || "Draft",
    });

    await announcement.save();
    await announcement.populate("courses", "title");

    if (announcement.scheduledDate) {
      console.log(`Announcement scheduled: id=${announcement._id} scheduledDate=${announcement.scheduledDate.toISOString()}`);
    }

    res.status(201).json({
      message: "Announcement created successfully",
      announcement,
    });
  } catch (error) {
    console.error("Error creating announcement:", error);
    res.status(500).json({ message: "Error creating announcement", error: error.message });
  }
});

// Get announcements for student (in their enrolled courses)
router.get("/student/my-announcements", protect, async (req, res) => {
  try {
    const studentId = req.user.id;

    // Get all courses the student is enrolled in
    const enrollments = await Enrollment.find({ student: studentId }).select("course");
    const courseIds = enrollments.map((e) => e.course);

    // Get announcements for these courses
    const announcements = await Announcement.find({
      $or: [
        { courses: { $in: courseIds }, isAllCourses: false },
        { isAllCourses: true, courses: { $in: courseIds } },
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

// Get all announcements for instructor
router.get("/", protect, instructorOnly, async (req, res) => {
  try {
    const instructorId = req.user.id;

    const announcements = await Announcement.find({ instructor: instructorId })
      .populate("courses", "title")
      .sort({ createdAt: -1 });

    res.json(announcements);
  } catch (error) {
    console.error("Error fetching announcements:", error);
    res.status(500).json({ message: "Error fetching announcements", error: error.message });
  }
});

// Helper to get instructor id string from announcement (handles populated or raw ObjectId)
const getAnnouncementInstructorId = (announcement) => {
  if (!announcement) return null;
  if (announcement.instructor && announcement.instructor._id) return announcement.instructor._id.toString();
  return announcement.instructor ? announcement.instructor.toString() : null;
};

// Get single announcement
router.get("/:id", protect, instructorOnly, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate("courses", "title")
      .populate("instructor", "name email");

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Check if instructor owns this announcement
    const instrId = getAnnouncementInstructorId(announcement);
    if (instrId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    res.json(announcement);
  } catch (error) {
    console.error("Error fetching announcement:", error);
    res.status(500).json({ message: "Error fetching announcement", error: error.message });
  }
});

// Update announcement
router.put("/:id", protect, instructorOnly, async (req, res) => {
  try {
    const { title, message, courses, isAllCourses, scheduledDate, status } = req.body;

    // Validate required fields
    if (!title || !message) {
      return res.status(400).json({ message: "Title and message are required" });
    }

    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Check if instructor owns this announcement
    const instrId = getAnnouncementInstructorId(announcement);
    if (instrId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Can only edit if status is Draft or Scheduled
    if (announcement.status === "Sent") {
      return res.status(400).json({ message: "Cannot edit sent announcements" });
    }

    announcement.title = title;
    announcement.message = message;
    announcement.isAllCourses = isAllCourses !== undefined ? isAllCourses : announcement.isAllCourses;
    
    // Update courses based on isAllCourses
    if (isAllCourses) {
      announcement.courses = [];
    } else if (courses && Array.isArray(courses) && courses.length > 0) {
      announcement.courses = courses;
    } else if (!isAllCourses && (!courses || courses.length === 0)) {
      return res.status(400).json({ message: "Please select at least one course or select all courses" });
    }
    
    // Handle scheduledDate
    if (scheduledDate) {
      try {
        const newDate = new Date(scheduledDate);
        if (isNaN(newDate.getTime())) {
          return res.status(400).json({ message: "Invalid scheduled date format" });
        }
        announcement.scheduledDate = newDate;
        announcement.status = "Scheduled";
      } catch (dateError) {
        return res.status(400).json({ message: "Invalid scheduled date" });
      }
    } else if (announcement.scheduledDate) {
      // Clear scheduledDate and reset status if no date provided
      announcement.scheduledDate = null;
      announcement.status = "Draft";
    }
    
    // Apply status override if explicitly provided
    if (status && ["Draft", "Scheduled", "Sent"].includes(status)) {
      announcement.status = status;
    }

    await announcement.save();
    await announcement.populate("courses", "title");

    if (announcement.scheduledDate) {
      console.log(`Announcement updated: id=${announcement._id} scheduledDate=${announcement.scheduledDate.toISOString()}`);
    }

    res.json({
      message: "Announcement updated successfully",
      announcement,
    });
  } catch (error) {
    console.error("Error updating announcement:", error);
    res.status(500).json({ message: "Error updating announcement", error: error.message });
  }
});

// Protected route to manually trigger processing due announcements (for debugging)
router.post("/process-due", protect, instructorOnly, async (req, res) => {
  try {
    const { processDueAnnouncements } = require("../utils/scheduler");
    await processDueAnnouncements();
    return res.json({ message: "Triggered processing of due announcements" });
  } catch (err) {
    console.error("Error triggering processDueAnnouncements:", err);
    return res.status(500).json({ message: "Error triggering scheduler", error: err.message });
  }
});

// Delete announcement
router.delete("/:id", protect, instructorOnly, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id);

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Check if instructor owns this announcement
    if (announcement.instructor.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Debug log for deletion attempt
    console.log(`Delete request by user=${req.user.id} for announcement=${announcement._id} owner=${getAnnouncementInstructorId(announcement)}`);

    // Check ownership
    const instrId = getAnnouncementInstructorId(announcement);
    if (instrId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Can only delete if status is Draft or Scheduled
    if (announcement.status === "Sent") {
      return res.status(400).json({ message: "Cannot delete sent announcements" });
    }

    await Announcement.findByIdAndDelete(req.params.id);

    res.json({ message: "Announcement deleted successfully" });
  } catch (error) {
    console.error("Error deleting announcement:", error);
    res.status(500).json({ message: "Error deleting announcement", error: error.message });
  }
});

// Send announcement immediately
router.post("/:id/send", protect, instructorOnly, async (req, res) => {
  try {
    const announcement = await Announcement.findById(req.params.id)
      .populate("courses")
      .populate("instructor", "name email");

    if (!announcement) {
      return res.status(404).json({ message: "Announcement not found" });
    }

    // Check if instructor owns this announcement
    const instrId = getAnnouncementInstructorId(announcement);
    if (instrId !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    announcement.status = "Sent";
    announcement.sentAt = new Date();

    await announcement.save();

    res.json({
      message: "Announcement sent successfully",
      announcement,
    });
  } catch (error) {
    console.error("Error sending announcement:", error);
    res.status(500).json({ message: "Error sending announcement", error: error.message });
  }
});

module.exports = router;
