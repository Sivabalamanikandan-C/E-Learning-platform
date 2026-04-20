const mongoose = require("mongoose");

const announcementSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    courses: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Course",
      },
    ],
    isAllCourses: {
      type: Boolean,
      default: false,
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  
    status: {
      type: String,
      enum: ["Draft", "Scheduled", "Sent"],
      default: "Draft",
    },
    scheduledDate: {
      type: Date,
      default: null,
    },
    sentAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Announcement", announcementSchema);
