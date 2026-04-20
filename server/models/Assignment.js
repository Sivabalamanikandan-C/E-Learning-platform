const mongoose = require("mongoose");

const assignmentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },
    instructions: {
      type: String,
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    maxMarks: {
      type: Number,
      required: true,
      min: 0,
    },
    submissionType: {
      type: String,
      enum: ["file", "text", "both"],
      required: true,
    },
    referenceFile: {
      fileName: String,
      fileUrl: String,
    },
    isPublished: {
      type: Boolean,
      default: false,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Assignment", assignmentSchema);
