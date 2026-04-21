const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const authRoutes = require("./routes/authRoutes");
const instructorCourseRoutes = require("./routes/instructorCourse.routes");
const studentRoutes = require("./routes/studentRoutes");
const paymentRoutes = require("./routes/paymentRoutes");
const announcementRoutes = require("./routes/announcementRoutes");
const quizRoutes = require("./routes/quizRoutes");
const assignmentRoutes = require("./routes/assignmentRoutes");
const questionRoutes = require("./routes/questionRoutes");
const adminRoutes = require("./routes/adminRoutes");
const complaintRoutes = require("./routes/complaintRoutes");

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'http://localhost:5173',
      'https://elearningplatform-hazel.vercel.app'
    ];
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
};

app.use(cors(corsOptions));



app.use(express.json());

// Serve uploaded files
app.use("/uploads", require("express").static("uploads"));

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/instructor/announcements", announcementRoutes);
app.use("/api/instructor", require("./routes/instructorRoutes"));
app.use("/api/instructor", instructorCourseRoutes);
app.use("/api/student", studentRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/quiz", quizRoutes);
app.use("/api/assignment", assignmentRoutes);
app.use("/api/questions", questionRoutes);
// Suspension inquiries (public creation, admin management)
app.use("/api/suspension-inquiries", require("./routes/suspensionInquiry.routes"));
// Complaints (instructor submit + admin review)
app.use("/api/complaints", complaintRoutes);


mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    // Start background scheduler for announcements
    try {
      const { startAnnouncementScheduler } = require("./utils/scheduler");
      startAnnouncementScheduler();
      console.log("Announcement scheduler started (polling every 60s)");
    } catch (err) {
      console.error("Failed to start announcement scheduler:", err);
    }

    const PORT = 5000 || 5000;
    app.listen(PORT, () => console.log(`Server running on ${PORT}`));
  })
  .catch((err) => {
    console.error("MongoDB connection failed:", err.message || err);
    process.exit(1);
  });
