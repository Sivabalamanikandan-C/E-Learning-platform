import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";

import Home from "./pages/Home";
import Login from "./pages/Login";
import Register from "./pages/Register";

import InstructorLayout from "./layouts/InstructorLayout";
import InstructorDashboard from "./pages/InstructorDashboard";
import CreateCourse from "./pages/CreateCourse";
import EditCourse from "./pages/EditCourse";
import MyCourses from "./pages/MyCourses";
import InstructorMyProfile from "./pages/InstructorMyProfile";
import Announcements from "./pages/Announcements"; // instructor announcements management
import AnnouncementsModule from "./pages/AnnouncementsModule"; // student announcements module
import InstructorAssignments from "./pages/InstructorAssignments";
import InstructorAssignmentDashboard from "./pages/InstructorAssignmentDashboard";
import SubmissionGrading from "./pages/SubmissionGrading";
import InstructorQuestionsPage from "./pages/InstructorQuestionsPage";
import InstructorRaiseComplaint from "./pages/InstructorRaiseComplaint";

import StudentLayout from "./layouts/StudentLayout";
import StudentDashboard from "./pages/StudentDashboard";
import CoursesList from "./pages/CoursesList";
import StudentCourse from "./pages/StudentCourse";
import StudentMyCourses from "./pages/StudentMyCourses";
import Quiz from "./pages/Quiz";
import QuizResults from "./pages/QuizResults";
import StudentAssignments from "./pages/StudentAssignments";
import CourseTrackerPage from "./pages/CourseTrackerPage";
import CourseTrack from "./modules/CourseTrack";

import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/AdminDashboard";
import AdminStudents from "./pages/AdminStudents";
import AdminInstructors from "./pages/AdminInstructors";
import AdminCourses from "./pages/AdminCourses";
import AdminPayments from "./pages/AdminPayments";
import AdminSuspensionInquiries from "./pages/AdminSuspensionInquiries";
import AdminComplaints from "./pages/AdminComplaints";
import AdminManageCourses from "./pages/AdminManageCourses";
import AdminCourseReview from "./pages/AdminCourseReview";

import InstructorRoute from "./components/InstructorRoute";
import StudentRoute from "./components/StudentRoute";
import AdminRoute from "./components/AdminRoute";

export default function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />

        {/* Admin Layout */}
        <Route
          path="/admin"
          element={
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          }
        >
          <Route index element={<AdminDashboard />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="instructors" element={<AdminInstructors />} />
          <Route path="courses" element={<AdminCourses />} />
          <Route path="manage-courses" element={<AdminManageCourses />} />
          <Route path="courses/review/:id" element={<AdminCourseReview />} />
          <Route path="payments" element={<AdminPayments />} />
          <Route path="suspension-inquiries" element={<AdminSuspensionInquiries />} />
          <Route path="complaints" element={<AdminComplaints />} />
        </Route>

        {/* Instructor Layout */}
        <Route
          path="/instructor"
          element={
            <InstructorRoute>
              <InstructorLayout />
            </InstructorRoute>
          }
        >
          <Route index element={<InstructorDashboard />} />
          <Route path="create-course" element={<CreateCourse />} />
          <Route path="edit-course/:courseId" element={<EditCourse />} />
          <Route path="my-courses" element={<MyCourses />} />
          <Route path="my-profile" element={<InstructorMyProfile />} />
          <Route path="announcements" element={<Announcements />} />
          <Route path="assignments" element={<InstructorAssignmentDashboard />} />
          <Route path="course/:courseId/assignments" element={<InstructorAssignments />} />
          <Route path="assignment/:assignmentId/submissions" element={<SubmissionGrading />} />
          <Route path="questions" element={<InstructorQuestionsPage />} />
          <Route path="raise-complaint" element={<InstructorRaiseComplaint />} />
        </Route>

        {/* Student Layout */}
        <Route
          path="/student"
          element={
            <StudentRoute>
              <StudentLayout />
            </StudentRoute>
          }
        >
          <Route index element={<StudentDashboard />} />
          <Route path="announcements" element={<AnnouncementsModule />} />
          <Route path="my-courses" element={<StudentMyCourses />} />
          <Route path="courses" element={<CoursesList />} />
          <Route path="course-tracker" element={<CourseTrackerPage />} />
          <Route path="course/:courseId" element={<StudentCourse />} />
          <Route path="course/:courseId/quiz" element={<Quiz />} />
          <Route path="course/:courseId/quiz-results" element={<QuizResults />} />
          <Route path="assignments" element={<StudentAssignments />} />
          <Route path="course-track/:courseId" element={<CourseTrack />} />
        </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}
