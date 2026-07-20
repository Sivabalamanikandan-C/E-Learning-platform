const mongoose = require("mongoose");

const lectureSchema = new mongoose.Schema({
  title: String,
  videoUrl: String,
  freePreview: Boolean,
});

// Quiz Schema
const optionSchema = new mongoose.Schema({
  optionText: String,
  isCorrect: Boolean,
}, { _id: false });

const questionSchema = new mongoose.Schema({
  questionText: String,
  points: Number,
  questionType: {
    type: String,
    enum: ["single", "multiple"],
  },
  options: [optionSchema],
}, { _id: false });

const quizSchema = new mongoose.Schema({
  title: String,
  description: String,
  timeLimit: Number, // in minutes
  questions: [questionSchema],
}, { _id: false });

const courseSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },

    // Landing Page
    title: String,
    category: String,
    level: String,
    language: String,
    subtitle: String,
    description: String,
    price: Number,
    thumbnail: String,

    // Curriculum
    lectures: [lectureSchema],
    
    // Quiz (optional)
    quiz: quizSchema,

    // Availability Status
    isAvailable: {
      type: Boolean,
      default: true,
    },

    // Admin Approval Workflow
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
    rejectionReason: { type: String, default: null },
    approvedAt: { type: Date, default: null },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
    rejectedAt: { type: Date, default: null },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Course", courseSchema);
