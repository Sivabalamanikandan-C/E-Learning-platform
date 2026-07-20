const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const instructorSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["instructor"],
      default: "instructor",
      required: true,
    },

    // Profile Information
    profilePicture: {
      type: String,
      default: null,
    },
    bio: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    experience: {
      type: Number,
      default: 0,
    },

    // Teaching Categories
    categories: {
      type: [String],
      default: [],
    },

    // Social Links
    socialLinks: {
      linkedin: { type: String, default: "" },
      github: { type: String, default: "" },
      portfolio: { type: String, default: "" },
    },
    // Suspension fields
    isSuspended: {
      type: Boolean,
      default: false,
    },
    suspensionReason: {
      type: String,
      default: null,
    },
    suspensionUntil: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

instructorSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("Instructor", instructorSchema);
