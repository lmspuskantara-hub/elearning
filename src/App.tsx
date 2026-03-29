import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Login from "./pages/Login.tsx";
import Register from "./pages/Register.tsx";
import DashboardLayout from "./layouts/DashboardLayout.tsx";
import DashboardHome from "./pages/dashboard/DashboardHome.tsx";
import CoursesPage from "./pages/dashboard/CoursesPage.tsx";
import CourseDetailPage from "./pages/dashboard/CourseDetailPage.tsx";
import QuizzesPage from "./pages/dashboard/QuizzesPage.tsx";
import AssignmentsPage from "./pages/dashboard/AssignmentsPage.tsx";
import ProgressPage from "./pages/dashboard/ProgressPage.tsx";
import ForumPage from "./pages/dashboard/ForumPage.tsx";
import AttendancePage from "./pages/dashboard/AttendancePage.tsx";
import ExportPage from "./pages/dashboard/ExportPage.tsx";
import SettingsPage from "./pages/dashboard/SettingsPage.tsx";
import ManageCoursesPage from "./pages/dashboard/ManageCoursesPage.tsx";
import ManageQuizzesPage from "./pages/dashboard/ManageQuizzesPage.tsx";
import ManageAttendancePage from "./pages/dashboard/ManageAttendancePage.tsx";
import StudentsPage from "./pages/dashboard/StudentsPage.tsx";
import AdminUsersPage from "./pages/dashboard/AdminUsersPage.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/dashboard" element={<DashboardLayout />}>
            <Route index element={<DashboardHome />} />
            <Route path="courses" element={<CoursesPage />} />
            <Route path="courses/:courseId" element={<CourseDetailPage />} />
            <Route path="quizzes" element={<QuizzesPage />} />
            <Route path="assignments" element={<AssignmentsPage />} />
            <Route path="progress" element={<ProgressPage />} />
            <Route path="forum" element={<ForumPage />} />
            <Route path="attendance" element={<AttendancePage />} />
            <Route path="export" element={<ExportPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route path="manage-courses" element={<ManageCoursesPage />} />
            <Route path="manage-courses/:courseId" element={<CourseDetailPage />} />
            <Route path="manage-quizzes" element={<ManageQuizzesPage />} />
            <Route path="manage-attendance" element={<ManageAttendancePage />} />
            <Route path="students" element={<StudentsPage />} />
            <Route path="admin-users" element={<AdminUsersPage />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
