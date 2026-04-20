const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, unique: true, required: true },
    password: { type: String, required: true },

    role: {
      type: String,
      enum: ["admin"],
      default: "admin",
      required: true,
    },

    permissions: {
      type: [String],
      default: ["manage_users", "manage_courses", "view_analytics", "manage_payments"],
    },
  },
  { timestamps: true }
);

adminSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

module.exports = mongoose.model("Admin", adminSchema);
