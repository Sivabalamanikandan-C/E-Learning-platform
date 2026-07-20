const mongoose = require("mongoose");

const noteSchema = new mongoose.Schema(
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
    lectureIndex: {
      type: Number,
      required: true,
    },
    lectureTitle: {
      type: String,
      default: "",
    },
    content: {
      type: String,
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Note", noteSchema);
