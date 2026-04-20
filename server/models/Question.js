const mongoose = require("mongoose");

const answerSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: true,
    },
    answeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const questionSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Course",
      required: true,
    },
    lecture: {
      lectureIndex: {
        type: Number,
        required: true,
      },
      lectureTitle: {
        type: String,
        required: true,
      },
    },
    content: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "answered"],
      default: "pending",
    },
    answer: {
      type: answerSchema,
      default: null,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Question", questionSchema);
