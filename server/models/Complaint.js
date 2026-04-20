const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema(
  {
    instructor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Instructor",
      required: true,
    },
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      required: true,
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "resolved"],
      default: "pending",
    },
    rejectionReason: { type: String, default: null },
    unsuspendReason: { type: String, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Complaint", complaintSchema);
