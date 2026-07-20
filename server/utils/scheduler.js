const Announcement = require("../models/Announcement");
const Student = require("../models/Student");
const CourseLevelSuspension = require("../models/CourseLevelSuspension");
const { sendUnsuspensionEmail } = require("./emailService");

// Auto-lift expired student account suspensions
const processExpiredSuspensions = async () => {
  try {
    const now = new Date();
    const expiredSuspensions = await Student.find({
      suspensionStatus: "suspended",
      suspensionEndDate: { $lte: now },
    });

    if (expiredSuspensions.length === 0) return;

    for (const student of expiredSuspensions) {
      try {
        const studentName = student.name;
        const studentEmail = student.email;

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
            to: studentEmail,
            studentName: studentName,
          });
        } catch (emailError) {
          console.error(`Failed to send unsuspension email to ${studentEmail}:`, emailError);
        }

        console.log(`Account suspension lifted (scheduler): ${student._id} - ${studentName}`);
      } catch (err) {
        console.error(`Failed to lift suspension for student ${student._id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error processing expired suspensions:", err);
  }
};

// Auto-lift expired course-level suspensions
const processExpiredCourseSuspensions = async () => {
  try {
    const now = new Date();
    const expiredSuspensions = await CourseLevelSuspension.find({
      suspensionStatus: "active",
      suspensionEndDate: { $lte: now },
    });

    if (expiredSuspensions.length === 0) return;

    for (const suspension of expiredSuspensions) {
      try {
        suspension.suspensionStatus = "lifted";
        suspension.liftedAt = new Date();
        await suspension.save();
        console.log(
          `Course suspension lifted (scheduler): ${suspension._id} - Student ${suspension.studentId}`
        );
      } catch (err) {
        console.error(`Failed to lift course suspension ${suspension._id}:`, err);
      }
    }
  } catch (err) {
    console.error("Error processing expired course suspensions:", err);
  }
};

// Combined function to process all suspension-related tasks
const processSuspensions = async () => {
  await processExpiredSuspensions();
  await processExpiredCourseSuspensions();
};

// Mark scheduled announcements as Sent when their scheduledDate has arrived
const processDueAnnouncements = async () => {
  try {
    const now = new Date();
    const dueAnnouncements = await Announcement.find({
      status: "Scheduled",
      scheduledDate: { $lte: now },
    });

    if (dueAnnouncements.length === 0) return;

    for (const ann of dueAnnouncements) {
      try {
        ann.status = "Sent";
        ann.sentAt = new Date();
        await ann.save();
        console.log(`Announcement sent (scheduler): ${ann._id} - ${ann.title}`);
      } catch (err) {
        console.error(`Failed to mark announcement ${ann._id} as sent:`, err);
      }
    }
  } catch (err) {
    console.error("Error processing due announcements:", err);
  }
};

// Start polling scheduler. intervalMs defaults to 60s (60000ms)
const startAnnouncementScheduler = (intervalMs = 60000) => {
  // Run once immediately then on interval
  processDueAnnouncements();
  processSuspensions();
  const id = setInterval(() => {
    processDueAnnouncements();
    processSuspensions();
  }, intervalMs);
  return id;
};

module.exports = {
  startAnnouncementScheduler,
  processDueAnnouncements,
  processSuspensions,
  processExpiredSuspensions,
  processExpiredCourseSuspensions,
};
