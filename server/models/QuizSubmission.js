const mongoose = require("mongoose");

const quizSubmissionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: [true, "Student ID is required"],
      index: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: [true, "Course ID is required"],
      index: true,
    },
    // Store student answers as a plain object
    // Keys are question IDs, values are selected option IDs (string or array)
    answers: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    score: {
      type: Number,
      required: [true, "Score is required"],
      min: 0,
    },
    totalPoints: {
      type: Number,
      required: [true, "Total points is required"],
      min: 1,
    },
    percentage: {
      type: Number,
      required: [true, "Percentage is required"],
      min: 0,
      max: 100,
    },
    status: {
      type: String,
      enum: {
        values: ["submitted", "graded", "auto_submitted"],
        message: "Status must be one of submitted, graded or auto_submitted",
      },
      default: "submitted",
      index: true,
    },
    autoSubmitted: {
      type: Boolean,
      default: false,
      index: true,
    },
    isCompleted: {
      type: Boolean,
      default: true,
      index: true,
    },
    submittedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  { 
    timestamps: true,
    strict: false,
  }
);

// quizSubmissionSchema.index({ course: 1, student: 1 });
quizSubmissionSchema.index(
  { course: 1, student: 1 },
  { unique: true }
);
quizSubmissionSchema.index({ course: 1, submittedAt: -1 });
quizSubmissionSchema.index({ student: 1, submittedAt: -1 });

module.exports = mongoose.model("QuizSubmission", quizSubmissionSchema);
