const jwt = require("jsonwebtoken");
const Student = require("../models/Student");
const Instructor = require("../models/Instructor");
const Admin = require("../models/Admin");

exports.authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("Auth middleware - decoded token:", { id: decoded.id, role: decoded.role });

    // resolve user from respective collection using role from token
    if (decoded.role === "student") {
      req.user = await Student.findById(decoded.id).select("-password");
      // Ensure role is set on req.user
      if (req.user) {
        req.user.role = "student";
      }

      // Check if student is suspended
      if (req.user && req.user.suspensionStatus === "suspended") {
        // Check if suspension period has ended
        const now = new Date();
        if (req.user.suspensionEndDate && now >= req.user.suspensionEndDate) {
          // Auto-lift suspension
          req.user.suspensionStatus = "active";
          req.user.suspensionReason = null;
          req.user.suspensionStartDate = null;
          req.user.suspensionEndDate = null;
          req.user.suspensionDuration = null;
          req.user.suspendedBy = null;
          await req.user.save();
        } else {
          // Suspension is still active
          return res.status(403).json({
            message: "Your account is suspended",
            suspensionEndDate: req.user.suspensionEndDate,
            suspensionReason: req.user.suspensionReason,
          });
        }
      }
    } else if (decoded.role === "instructor") {
      req.user = await Instructor.findById(decoded.id).select("-password");
      // Ensure role is set on req.user
      if (req.user) {
        req.user.role = "instructor";
      }
      // Check if instructor is suspended
      if (req.user && req.user.isSuspended) {
        const now = new Date();
        if (req.user.suspensionUntil && now >= new Date(req.user.suspensionUntil)) {
          // Auto-lift suspension
          req.user.isSuspended = false;
          req.user.suspensionReason = null;
          req.user.suspensionUntil = null;
          await req.user.save();
        } else {
          // Suspension still active -> block access
          return res.status(403).json({
            message: "Your account is suspended.",
            reason: req.user.suspensionReason,
            suspendedUntil: req.user.suspensionUntil ? new Date(req.user.suspensionUntil).toISOString().split("T")[0] : null,
          });
        }
      }
    } else if (decoded.role === "admin") {
      req.user = await Admin.findById(decoded.id).select("-password");
      // Ensure role is set on req.user
      if (req.user) {
        req.user.role = "admin";
      }
    }

    console.log("Auth middleware - req.user:", { id: req.user?._id, role: req.user?.role });

    if (!req.user) {
      return res.status(401).json({ message: "User not found" });
    }

    next();
  } catch (err) {
    console.error("Auth error:", err);
    res.status(401).json({ message: "Invalid token" });
  }
};

exports.authorizeInstructor = (req, res, next) => {
  if (req.user.role !== "instructor") {
    return res.status(403).json({ message: "Instructor access only" });
  }
  next();
};

exports.authorizeStudent = (req, res, next) => {
  console.log("Authorize Student middleware - req.user:", { id: req.user?._id, role: req.user?.role });
  
  if (!req.user) {
    console.error("Authorize Student: User not found in request");
    return res.status(401).json({ message: "User not found in request" });
  }
  
  if (req.user.role !== "student") {
    console.error("Authorize Student: User role is not student, it's:", req.user.role);
    return res.status(403).json({ 
      message: "Student access only",
      userRole: req.user.role 
    });
  }
  
  console.log("Authorize Student: Authorization successful for student:", req.user._id);
  next();
};

exports.authorizeAdmin = (req, res, next) => {
  console.log("Authorize Admin middleware - req.user:", { id: req.user?._id, role: req.user?.role });
  
  if (!req.user) {
    console.error("Authorize Admin: User not found in request");
    return res.status(401).json({ message: "User not found in request" });
  }
  
  if (req.user.role !== "admin") {
    console.error("Authorize Admin: User role is not admin, it's:", req.user.role);
    return res.status(403).json({ 
      message: "Admin access only",
      userRole: req.user.role 
    });
  }
  
  console.log("Authorize Admin: Authorization successful for admin:", req.user._id);
  next();
};
