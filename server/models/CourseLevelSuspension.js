const mongoose = require("mongoose");

const courseLevelSuspensionSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    courseId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    instructorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    reason: {
      type: String,
      required: true,
    },
    suspensionStatus: {
      type: String,
      enum: ["active", "lifted"],
      default: "active",
    },
    suspensionStartDate: {
      type: Date,
      default: Date.now,
    },
    suspensionEndDate: {
      type: Date,
      default: null,
    },
    suspensionDuration: {
      type: Number, // in days
      default: null,
    },
    liftedAt: {
      type: Date,
      default: null,
    },
    liftedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      default: null,
    },
    liftReason: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate course suspensions
courseLevelSuspensionSchema.index({ studentId: 1, courseId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model("CourseLevelSuspension", courseLevelSuspensionSchema);
