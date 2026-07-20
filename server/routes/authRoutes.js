const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Instructor = require("../models/Instructor");
const Admin = require("../models/Admin");

const router = express.Router();

/* ================= REGISTER ================= */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!role || !["student", "instructor"].includes(role)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    // validate email domain and password length
    // if (!email || typeof email !== "string" || !email.toLowerCase().endsWith("@gmail.com")) {
    //   return res.status(400).json({ message: "Email must end with @gmail.com" });
    // }

    // validate email domain and password length
    if (
      !email ||
      typeof email !== "string" ||
      !(
        email.toLowerCase().endsWith("@gmail.com") ||
        email.toLowerCase().endsWith("@maduracollege.edu.in")
      )
    ) {
      return res.status(400).json({
        message: "Email must end with @gmail.com or @maduracollege.edu.in",
      });
    }
    if (!password || typeof password !== "string" || password.length <= 5) {
      return res.status(400).json({ message: "Password must be more than 5 characters" });
    }



    // ensure email is not already used by either model
    const existingStudent = await Student.findOne({ email });
    const existingInstructor = await Instructor.findOne({ email });
    if (existingStudent || existingInstructor) {
      return res.status(400).json({ message: "Email already exists" });
    }

    let user;
    if (role === "student") {
      user = await Student.create({ name, email, password });
    } else {
      user = await Instructor.create({ name, email, password });
    }

    res.status(201).json({
      message: "Registered successfully",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ================= LOGIN ================= */
router.post("/login", async (req, res) => {
  try {
    const { email, password, role } = req.body;

    // Look up user in the requested role's collection FIRST
    let user = null;

    if (role === "student") {
      user = await Student.findOne({ email });
    } else if (role === "instructor") {
      user = await Instructor.findOne({ email });
    } else if (role === "admin") {
      user = await Admin.findOne({ email });
    } else {
      // Fallback: try all collections if no role specified
      user = await Student.findOne({ email });
      if (!user) user = await Instructor.findOne({ email });
      if (!user) user = await Admin.findOne({ email });
    }

    if (!user) return res.status(400).json({ message: "User not found" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid password" });

    // Check if student is suspended
    if (user.role === "student" && user.suspensionStatus === "suspended") {
      // Check if suspension has expired
      const now = new Date();
      if (user.suspensionEndDate && now < user.suspensionEndDate) {
        // Suspension is still active
        return res.status(403).json({
          message: "Your account is suspended",
          suspensionEndDate: user.suspensionEndDate,
          suspensionReason: user.suspensionReason,
          error: "ACCOUNT_SUSPENDED",
        });
      } else if (user.suspensionEndDate && now >= user.suspensionEndDate) {
        // Auto-lift suspension
        user.suspensionStatus = "active";
        user.suspensionReason = null;
        user.suspensionStartDate = null;
        user.suspensionEndDate = null;
        user.suspensionDuration = null;
        user.suspendedBy = null;
        await user.save();
      }
    }

    // Check if instructor is suspended
    if (user.role === "instructor" && user.isSuspended) {
      const now = new Date();
      if (user.suspensionUntil && now < new Date(user.suspensionUntil)) {
        // still suspended
        return res.status(403).json({
          message: "Your account is suspended.",
          reason: user.suspensionReason,
          suspendedUntil: new Date(user.suspensionUntil).toISOString().split("T")[0],
        });
      } else if (user.suspensionUntil && now >= new Date(user.suspensionUntil)) {
        // auto-reactivate
        user.isSuspended = false;
        user.suspensionReason = null;
        user.suspensionUntil = null;
        await user.save();
      }
    }

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        name: user.name,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

/* ===== GET /me - verify token and return user info ===== */
router.get("/me", (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // return minimal user info present in token
    return res.status(200).json({
      id: decoded.id,
      role: decoded.role,
      name: decoded.name,
      exp: decoded.exp,
    });
  } catch (err) {
    return res.status(401).json({ message: "Invalid token" });
  }
});

module.exports = router;
