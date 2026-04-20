const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const studentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["student"],
      default: "student",
      required: true,
    },

    // Suspension Fields (Admin Level)
    suspensionStatus: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
    },
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    suspensionStartDate: {
      type: Date,
      default: null,
    },
    suspensionEndDate: {
      type: Date,
      default: null,
    },
    suspensionDuration: {
      type: Number, // in days
      default: null,
    },
    suspendedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Admin",
      default: null,
    },
  },
  { timestamps: true }
);

studentSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("Student", studentSchema);
