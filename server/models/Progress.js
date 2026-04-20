const mongoose = require("mongoose");

const progressSchema = new mongoose.Schema(
  {
    // Reference to student
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },

    // Reference to course
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },

    // Reference to lecture (using index within lectures array)
    lectureIndex: {
      type: Number,
      required: true,
    },

    // Lecture title for quick reference
    lectureTitle: String,

    // Completion status
    isCompleted: {
      type: Boolean,
      default: false,
    },

    // When the lecture was completed
    completedAt: {
      type: Date,
      default: null,
    },

    // Watch duration (in seconds)
    watchDuration: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true }
);

// Compound index to ensure unique progress record per student-course-lecture combo
progressSchema.index({ student: 1, course: 1, lectureIndex: 1 }, { unique: true });

module.exports = mongoose.model("Progress", progressSchema);
