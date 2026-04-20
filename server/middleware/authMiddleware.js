const jwt = require("jsonwebtoken");

exports.protect = (req, res, next) => {
  let token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ message: "No token" });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ message: "Invalid token" });
  }
};

exports.instructorOnly = (req, res, next) => {
  if (req.user.role !== "instructor") {
    return res.status(403).json({ message: "Instructor access only" });
  }
  next();
};
