const express = require("express");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");
const Instructor = require("../models/Instructor");
const { protect, instructorOnly } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/dashboard", protect, instructorOnly, async (req, res) => {
    const instructorId = req.user.id;

    const courses = await Course.find({ instructor: instructorId });
    const courseIds = courses.map(c => c._id);

    const enrollments = await Enrollment.find({
        course: { $in: courseIds },
    })
        .populate("student", "name email")
        .populate("course", "title price");

    // Filter out enrollments with null student or course references
    const validEnrollments = enrollments.filter(
        (e) => e.student !== null && e.course !== null
    );

    const totalRevenue = validEnrollments.reduce(
        (sum, e) => sum + (e.course?.price || 0),
        0
    );

    // Get course-level suspensions for this instructor
    const CourseLevelSuspension = require("../models/CourseLevelSuspension");
    const suspensions = await CourseLevelSuspension.find({
        courseId: { $in: courseIds },
    });

    res.json({
        instructorName: req.user.name,
        totalCourses: courses.length,
        totalStudents: validEnrollments.length,
        totalRevenue,
        students: validEnrollments.map(e => {
            const suspension = suspensions.find(
                (s) =>
                    s.studentId.toString() === e.student._id.toString() &&
                    s.courseId.toString() === e.course._id.toString()
            );
            return {
                _id: e.student._id,
                name: e.student.name,
                email: e.student.email,
                course: e.course.title,
                courseId: e.course._id,
                isSuspended: !!suspension && !suspension.lifted,
                suspensionReason: suspension?.reason || null,
                suspensionEndDate: suspension?.suspensionEndDate || null,
            };
        }),
    });

});

// GET Instructor Profile
router.get("/profile", protect, instructorOnly, async (req, res) => {
    try {
        const instructor = await Instructor.findById(req.user.id).select("-password");

        if (!instructor) {
            return res.status(404).json({ message: "Instructor not found" });
        }

        // Get professional details
        const courses = await Course.find({ instructor: req.user.id });
        const courseIds = courses.map(c => c._id);
        const enrollments = await Enrollment.find({
            course: { $in: courseIds },
        }).countDocuments();

        res.json({
            profile: instructor,
            totalCoursesCreated: courses.length,
            totalStudentsEnrolled: enrollments,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// UPDATE Instructor Profile
router.put("/profile", protect, instructorOnly, async (req, res) => {
    try {
        const { name, bio, skills, experience, categories, socialLinks, profilePicture } = req.body;

        const instructor = await Instructor.findByIdAndUpdate(
            req.user.id,
            {
                name,
                bio,
                skills,
                experience,
                categories,
                socialLinks,
                profilePicture,
            },
            { new: true, runValidators: true }
        ).select("-password");

        res.json({
            message: "Profile updated successfully",
            profile: instructor,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// GET Public Instructor Profile by ID (for students to view)
router.get("/:instructorId/profile", async (req, res) => {
    try {
        const { instructorId } = req.params;

        const instructor = await Instructor.findById(instructorId).select("-password");

        if (!instructor) {
            return res.status(404).json({ message: "Instructor not found" });
        }

        res.json(instructor);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
