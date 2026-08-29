import { useEffect, lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Routes, Route } from "react-router-dom";
import RouteGuard from "@/components/auth/RouteGuard";
import LazyLoadErrorBoundary from "@/components/common/LazyLoadErrorBoundary";

// Lightweight loading fallback
const PageLoader = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// Public pages — keep Index lightweight for fast LCP
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import AccessRestrictedPage from "./components/access/AccessRestrictedPage";

// Lazy-load everything else
const Login = lazy(() => import("./pages/auth/Login"));
const MultiStepRegister = lazy(() => import("./pages/auth/MultiStepRegister"));
const SuperAdminRegister = lazy(() => import("./pages/auth/SuperAdminRegister"));
const InviteRegistration = lazy(() => import("./pages/auth/InviteRegistration"));
const RegisterConfirm = lazy(() => import("./pages/auth/RegisterConfirm"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const Students = lazy(() => import("./pages/Students"));
const Teachers = lazy(() => import("./pages/Teachers"));
const Grades = lazy(() => import("./pages/Grades"));
const Streams = lazy(() => import("./pages/Streams"));
const Attendance = lazy(() => import("./pages/Attendance"));
const Exams = lazy(() => import("./pages/Exams"));
const ExamMarks = lazy(() => import("./pages/ExamMarks"));
const ExamMarksList = lazy(() => import("./pages/ExamMarksList"));
const Marklists = lazy(() => import("./pages/Marklists"));
const TeacherDashboard = lazy(() => import("./pages/TeacherDashboard"));
const TeacherAttendance = lazy(() => import("./pages/TeacherAttendance"));
const ExamAnalytics = lazy(() => import("./pages/ExamAnalytics"));
const Analytics = lazy(() => import("./pages/Analytics"));
const GradeAnalytics = lazy(() => import("./pages/GradeAnalytics"));
const GradeStreamAnalytics = lazy(() => import("./pages/GradeStreamAnalytics"));
const StudentAnalyticsPage = lazy(() => import("./pages/StudentAnalyticsPage"));
const Settings = lazy(() => import("./pages/Settings"));
const AcademicSettings = lazy(() => import("./pages/AcademicSettings"));
const AcademicSetup = lazy(() => import("./pages/AcademicSetup"));
const CurriculumSetup = lazy(() => import("./pages/CurriculumSetup"));
const SuperAdminDashboard = lazy(() => import("./pages/SuperAdminDashboard"));
const CreateSchool = lazy(() => import("./pages/schools/CreateSchool"));
const SchoolView = lazy(() => import("./pages/schools/SchoolView"));
const MarkEntry = lazy(() => import("./pages/MarkEntry"));
const StudentHistory = lazy(() => import("./pages/StudentHistory"));
const ReportGenerator = lazy(() => import("./pages/ReportGenerator"));
const Timetables = lazy(() => import("./pages/Timetables"));
const ExamTimetable = lazy(() => import("./pages/ExamTimetable"));
const SchoolInfo = lazy(() => import("./pages/SchoolInfo"));
const StreamManagement = lazy(() => import("./pages/StreamManagement"));
const Divisions = lazy(() => import("./pages/Divisions"));
const Subjects = lazy(() => import("./pages/Subjects"));
const PaymentInfo = lazy(() => import("./pages/PaymentInfo"));
const FeeManagement = lazy(() => import("./pages/FeeManagement"));

// Student Portal Pages
const StudentDashboard = lazy(() => import("./pages/StudentDashboard"));
const StudentAttendance = lazy(() => import("./pages/student/StudentAttendance"));
const StudentPerformance = lazy(() => import("./pages/student/StudentPerformance"));
const StudentReports = lazy(() => import("./pages/student/StudentReports"));
const StudentSubjects = lazy(() => import("./pages/student/StudentSubjects"));

// Lazy-load global status panels — only render when active
const BulkUploadProgressPanel = lazy(() => import("./components/students/BulkUploadProgressPanel"));
const TimetableGenerationStatus = lazy(() => import("./components/timetable/TimetableGenerationStatus").then(m => ({ default: m.TimetableGenerationStatus })));

const App = () => {
  useEffect(() => {
    const releaseStaleUiLocks = () => {
      const hasOpenOverlay = Boolean(
        document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="listbox"], [data-state="open"][role="menu"], [data-radix-popper-content-wrapper]'
        )
      );

      if (hasOpenOverlay) return;

      const computed = window.getComputedStyle(document.body);
      const isPointerLocked = computed.pointerEvents === "none" || document.body.style.pointerEvents === "none";
      const isScrollLocked = document.body.style.overflow === "hidden";

      if (isPointerLocked || isScrollLocked) {
        document.body.style.pointerEvents = "";
        document.body.style.overflow = "";
        document.body.style.paddingRight = "";
      }
    };

    const observer = new MutationObserver(releaseStaleUiLocks);
    observer.observe(document.body, {
      attributes: true,
      childList: true,
      subtree: false, // Reduced from true — only watch body-level changes
      attributeFilter: ["style"],
    });

    const interval = window.setInterval(releaseStaleUiLocks, 2000); // Reduced frequency from 1.2s

    return () => {
      observer.disconnect();
      window.clearInterval(interval);
    };
  }, []);

  return (
    <>
      <Toaster />
      <Sonner />
      <Suspense fallback={null}>
        <BulkUploadProgressPanel />
        <TimetableGenerationStatus />
      </Suspense>
      <LazyLoadErrorBoundary>
      <Suspense fallback={<PageLoader />}>
        <Routes>
                {/* Public routes */}
                <Route path="/" element={<Index />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<MultiStepRegister />} />
                <Route path="/super-admin-register" element={<SuperAdminRegister />} />
                <Route path="/invite/:token" element={<InviteRegistration />} />
                <Route path="/confirm" element={<RegisterConfirm />} />
                <Route path="/forgot-password" element={<ForgotPassword />} />
                <Route path="/reset-password" element={<ResetPassword />} />
                <Route path="/unauthorized" element={<Unauthorized />} />
                <Route path="/access-restricted" element={<AccessRestrictedPage />} />

                {/* Payment info - accessible to school admins */}
                <Route 
                  path="/payment-info" 
                  element={
                    <RouteGuard allowedRoles={["school_admin"]}>
                      <PaymentInfo />
                    </RouteGuard>
                  } 
                />

                {/* Protected routes */}
                <Route 
                  path="/dashboard" 
                  element={
                    <RouteGuard>
                      <Dashboard />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/school-info" 
                  element={
                    <RouteGuard allowedRoles={["school_admin", "super_admin"]}>
                      <SchoolInfo />
                    </RouteGuard>
                  } 
                />
                
                <Route 
                  path="/academic-setup" 
                  element={
                    <RouteGuard>
                      <AcademicSetup />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/curriculum-setup" 
                  element={
                    <RouteGuard>
                      <CurriculumSetup />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/students" 
                  element={
                    <RouteGuard>
                      <Students />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/teachers" 
                  element={
                    <RouteGuard>
                      <Teachers />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/grades" 
                  element={
                    <RouteGuard>
                      <Grades />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/grades/:id/streams" 
                  element={
                    <RouteGuard>
                      <Streams />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/streams" 
                  element={
                    <RouteGuard>
                      <StreamManagement />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/divisions" 
                  element={
                    <RouteGuard allowedRoles={["school_admin", "super_admin"]}>
                      <Divisions />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/subjects" 
                  element={
                    <RouteGuard allowedRoles={["school_admin", "super_admin", "teacher"]}>
                      <Subjects />
                    </RouteGuard>
                  } 
                />

                <Route
                  path="/attendance"
                  element={
                    <RouteGuard>
                      <Attendance />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/exams" 
                  element={
                    <RouteGuard>
                      <Exams />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/marklists" 
                  element={
                    <RouteGuard>
                      <Marklists />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/exam-timetable/:examId" 
                  element={
                    <RouteGuard allowedRoles={["school_admin", "super_admin", "teacher"]}>
                      <ExamTimetable />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/teacher-dashboard" 
                  element={
                    <RouteGuard allowedRoles={["teacher"]}>
                      <TeacherDashboard />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/teacher-attendance" 
                  element={
                    <RouteGuard allowedRoles={["teacher"]}>
                      <TeacherAttendance />
                    </RouteGuard>
                  } 
                />

                {/* Student Portal Routes */}
                <Route 
                  path="/student-dashboard" 
                  element={
                    <RouteGuard allowedRoles={["student"]}>
                      <StudentDashboard />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/student/attendance" 
                  element={
                    <RouteGuard allowedRoles={["student"]}>
                      <StudentAttendance />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/student/performance" 
                  element={
                    <RouteGuard allowedRoles={["student"]}>
                      <StudentPerformance />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/student/reports" 
                  element={
                    <RouteGuard allowedRoles={["student"]}>
                      <StudentReports />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/student/subjects" 
                  element={
                    <RouteGuard allowedRoles={["student"]}>
                      <StudentSubjects />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/exam-marks/:id" 
                  element={
                    <RouteGuard>
                      <ExamMarks />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/exam-marks-list/:id" 
                  element={
                    <RouteGuard>
                      <ExamMarksList />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/analytics" 
                  element={
                    <RouteGuard>
                      <Analytics />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/exam-analytics/:examId" 
                  element={
                    <RouteGuard>
                      <ExamAnalytics />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/grade-analytics/:gradeId" 
                  element={
                    <RouteGuard>
                      <GradeAnalytics />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/stream-analytics/:gradeId/:streamId" 
                  element={
                    <RouteGuard>
                      <GradeStreamAnalytics />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/student-analytics/:studentId" 
                  element={
                    <RouteGuard>
                      <StudentAnalyticsPage />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/mark-entry" 
                  element={
                    <RouteGuard>
                      <MarkEntry />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/student-history" 
                  element={
                    <RouteGuard>
                      <StudentHistory />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/reports" 
                  element={
                    <RouteGuard>
                      <ReportGenerator />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/timetables" 
                  element={
                    <RouteGuard>
                      <Timetables />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/settings" 
                  element={
                    <RouteGuard>
                      <Settings />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/academic-settings" 
                  element={
                    <RouteGuard>
                      <AcademicSettings />
                    </RouteGuard>
                  } 
                />

                {/* Super admin routes */}
                <Route 
                  path="/super-admin" 
                  element={
                    <RouteGuard allowedRoles={["super_admin"]}>
                      <SuperAdminDashboard />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/create-school" 
                  element={
                    <RouteGuard>
                      <CreateSchool />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/schools/:schoolId" 
                  element={
                    <RouteGuard allowedRoles={["super_admin"]}>
                      <SchoolView />
                    </RouteGuard>
                  } 
                />

                <Route 
                  path="/fee-management" 
                  element={
                    <RouteGuard allowedRoles={["school_admin", "super_admin"]}>
                      <FeeManagement />
                    </RouteGuard>
                  } 
                />

                {/* Catch all route */}
                <Route path="*" element={<NotFound />} />
              </Routes>
      </Suspense>
      </LazyLoadErrorBoundary>
    </>
  );
};

export default App;
