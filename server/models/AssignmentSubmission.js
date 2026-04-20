const mongoose = require("mongoose");

const assignmentSubmissionSchema = new mongoose.Schema(
  {
    assignment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    submissionText: {
      type: String,
      default: null,
    },
    submissionFile: {
      fileName: String,
      fileUrl: String,
    },
    submissionDate: {
      type: Date,
      default: Date.now,
    },
    isLate: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["submitted", "graded", "not-submitted"],
      default: "submitted",
    },
    obtainedMarks: {
      type: Number,
      default: null,
      min: 0,
    },
    feedback: {
      type: String,
      default: null,
    },
    gradedAt: {
      type: Date,
      default: null,
    },
    gradedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      default: null,
    },
  },
  { timestamps: true }
);

// Compound unique index to prevent duplicate submissions
assignmentSubmissionSchema.index({ assignment: 1, student: 1 }, { unique: true });

module.exports = mongoose.model("AssignmentSubmission", assignmentSubmissionSchema);
