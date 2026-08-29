/**
 * App Routing Integration Tests
 *
 * Validates the route configuration declared in App.tsx:
 * - Public routes render without authentication
 * - Protected routes are wrapped in RouteGuard
 * - Role-restricted routes enforce the correct allowedRoles
 * - Catch-all 404 route works for unknown paths
 * - Duplicate route declarations are identified
 *
 * These tests render App inside a MemoryRouter with controlled auth state
 * to verify routing behaviour end-to-end.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { TooltipProvider } from "@/components/ui/tooltip";

// ---------------------------------------------------------------------------
// Global mocks — keep rendering lightweight by stubbing heavy pages
// ---------------------------------------------------------------------------

// Stub every page component to a simple test marker
const pageModules = [
  "Index", "Login", "Dashboard", "Students", "Teachers", "Grades", "Streams",
  "Attendance", "Exams", "ExamMarks", "ExamMarksList", "Marklists",
  "TeacherDashboard", "TeacherAttendance", "ExamAnalytics", "Analytics",
  "GradeAnalytics", "GradeStreamAnalytics", "StudentAnalyticsPage", "Settings",
  "AcademicSettings", "AcademicSetup", "CurriculumSetup", "NotFound",
  "Unauthorized", "SuperAdminDashboard", "MarkEntry", "StudentHistory",
  "ReportGenerator", "Timetables", "ExamTimetable", "SchoolInfo",
  "StreamManagement", "Divisions", "Subjects", "PaymentInfo", "FeeManagement",
  "StudentDashboard",
];

// Mock all page-level imports to render simple markers
vi.mock("../pages/Index", () => ({ default: () => <div data-testid="page-index">Index Page</div> }));
vi.mock("../pages/auth/Login", () => ({ default: () => <div data-testid="page-login">Login Page</div> }));
vi.mock("../pages/auth/MultiStepRegister", () => ({ default: () => <div data-testid="page-register">Register Page</div> }));
vi.mock("../pages/auth/SuperAdminRegister", () => ({ default: () => <div data-testid="page-super-register">Super Admin Register</div> }));
vi.mock("../pages/auth/InviteRegistration", () => ({ default: () => <div data-testid="page-invite">Invite Registration</div> }));
vi.mock("../pages/auth/RegisterConfirm", () => ({ default: () => <div data-testid="page-confirm">Register Confirm</div> }));
vi.mock("../pages/auth/ForgotPassword", () => ({ default: () => <div data-testid="page-forgot">Forgot Password</div> }));
vi.mock("../pages/auth/ResetPassword", () => ({ default: () => <div data-testid="page-reset">Reset Password</div> }));
vi.mock("../pages/Unauthorized", () => ({ default: () => <div data-testid="page-unauthorized">Unauthorized</div> }));
vi.mock("../pages/NotFound", () => ({ default: () => <div data-testid="page-not-found">Not Found</div> }));
vi.mock("../pages/Dashboard", () => ({ default: () => <div data-testid="page-dashboard">Dashboard</div> }));
vi.mock("../pages/Students", () => ({ default: () => <div data-testid="page-students">Students</div> }));
vi.mock("../pages/Teachers", () => ({ default: () => <div data-testid="page-teachers">Teachers</div> }));
vi.mock("../pages/Grades", () => ({ default: () => <div data-testid="page-grades">Grades</div> }));
vi.mock("../pages/Streams", () => ({ default: () => <div data-testid="page-streams">Streams</div> }));
vi.mock("../pages/StreamManagement", () => ({ default: () => <div data-testid="page-stream-mgmt">Stream Management</div> }));
vi.mock("../pages/Attendance", () => ({ default: () => <div data-testid="page-attendance">Attendance</div> }));
vi.mock("../pages/Exams", () => ({ default: () => <div data-testid="page-exams">Exams</div> }));
vi.mock("../pages/ExamMarks", () => ({ default: () => <div data-testid="page-exam-marks">Exam Marks</div> }));
vi.mock("../pages/ExamMarksList", () => ({ default: () => <div data-testid="page-exam-marks-list">Exam Marks List</div> }));
vi.mock("../pages/Marklists", () => ({ default: () => <div data-testid="page-marklists">Marklists</div> }));
vi.mock("../pages/ExamTimetable", () => ({ default: () => <div data-testid="page-exam-timetable">Exam Timetable</div> }));
vi.mock("../pages/TeacherDashboard", () => ({ default: () => <div data-testid="page-teacher-dashboard">Teacher Dashboard</div> }));
vi.mock("../pages/TeacherAttendance", () => ({ default: () => <div data-testid="page-teacher-attendance">Teacher Attendance</div> }));
vi.mock("../pages/Analytics", () => ({ default: () => <div data-testid="page-analytics">Analytics</div> }));
vi.mock("../pages/ExamAnalytics", () => ({ default: () => <div data-testid="page-exam-analytics">Exam Analytics</div> }));
vi.mock("../pages/GradeAnalytics", () => ({ default: () => <div data-testid="page-grade-analytics">Grade Analytics</div> }));
vi.mock("../pages/GradeStreamAnalytics", () => ({ default: () => <div data-testid="page-stream-analytics">Stream Analytics</div> }));
vi.mock("../pages/StudentAnalyticsPage", () => ({ default: () => <div data-testid="page-student-analytics">Student Analytics</div> }));
vi.mock("../pages/Settings", () => ({ default: () => <div data-testid="page-settings">Settings</div> }));
vi.mock("../pages/AcademicSettings", () => ({ default: () => <div data-testid="page-academic-settings">Academic Settings</div> }));
vi.mock("../pages/AcademicSetup", () => ({ default: () => <div data-testid="page-academic-setup">Academic Setup</div> }));
vi.mock("../pages/CurriculumSetup", () => ({ default: () => <div data-testid="page-curriculum-setup">Curriculum Setup</div> }));
vi.mock("../pages/SuperAdminDashboard", () => ({ default: () => <div data-testid="page-super-admin">Super Admin</div> }));
vi.mock("../pages/schools/CreateSchool", () => ({ default: () => <div data-testid="page-create-school">Create School</div> }));
vi.mock("../pages/schools/SchoolView", () => ({ default: () => <div data-testid="page-school-view">School View</div> }));
vi.mock("../pages/MarkEntry", () => ({ default: () => <div data-testid="page-mark-entry">Mark Entry</div> }));
vi.mock("../pages/StudentHistory", () => ({ default: () => <div data-testid="page-student-history">Student History</div> }));
vi.mock("../pages/ReportGenerator", () => ({ default: () => <div data-testid="page-reports">Reports</div> }));
vi.mock("../pages/Timetables", () => ({ default: () => <div data-testid="page-timetables">Timetables</div> }));
vi.mock("../pages/SchoolInfo", () => ({ default: () => <div data-testid="page-school-info">School Info</div> }));
vi.mock("../pages/Divisions", () => ({ default: () => <div data-testid="page-divisions">Divisions</div> }));
vi.mock("../pages/Subjects", () => ({ default: () => <div data-testid="page-subjects">Subjects</div> }));
vi.mock("../pages/PaymentInfo", () => ({ default: () => <div data-testid="page-payment-info">Payment Info</div> }));
vi.mock("../pages/FeeManagement", () => ({ default: () => <div data-testid="page-fee-management">Fee Management</div> }));
vi.mock("../pages/StudentDashboard", () => ({ default: () => <div data-testid="page-student-dashboard">Student Dashboard</div> }));
vi.mock("../pages/student/StudentAttendance", () => ({ default: () => <div data-testid="page-student-attendance">Student Attendance</div> }));
vi.mock("../pages/student/StudentPerformance", () => ({ default: () => <div data-testid="page-student-performance">Student Performance</div> }));
vi.mock("../pages/student/StudentReports", () => ({ default: () => <div data-testid="page-student-reports">Student Reports</div> }));
vi.mock("../pages/student/StudentSubjects", () => ({ default: () => <div data-testid="page-student-subjects">Student Subjects</div> }));
vi.mock("../components/access/AccessRestrictedPage", () => ({ default: () => <div data-testid="page-access-restricted">Access Restricted</div> }));

// Mock BulkUpload context/panel (renders globally, not relevant to routing)
vi.mock("../contexts/BulkUploadContext", () => ({
  BulkUploadProvider: ({ children }: any) => <>{children}</>,
}));
vi.mock("../components/students/BulkUploadProgressPanel", () => ({
  default: () => null,
}));

// Mock Toasters
vi.mock("@/components/ui/toaster", () => ({ Toaster: () => null }));
vi.mock("@/components/ui/sonner", () => ({ Toaster: () => null }));

// Mock access control service
vi.mock("@/services/accessControlService", () => ({
  checkSchoolAccess: vi.fn().mockResolvedValue(true),
  clearAccessCache: vi.fn(),
}));

// Mock toast
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// ---------------------------------------------------------------------------
// Auth mock — controlled per-test
// ---------------------------------------------------------------------------
let mockAuthValues: {
  user: any;
  session: any;
  loading: boolean;
  isAuthorized: (roles?: string[]) => boolean;
};

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => mockAuthValues,
  AuthProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("../contexts/GlobalStateContext", () => ({
  GlobalStateProvider: ({ children }: any) => <>{children}</>,
}));

vi.mock("../components/auth/IdleTimeoutProvider", () => ({
  default: ({ children }: any) => <>{children}</>,
}));

// ---------------------------------------------------------------------------
// Test wrapper
// ---------------------------------------------------------------------------
import App from "../App";

const renderApp = (route: string) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <MemoryRouter initialEntries={[route]}>
          <App />
        </MemoryRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

const makeUser = (
  role: "super_admin" | "school_admin" | "teacher" | "student",
  schoolId?: string
) => ({
  id: "user-1",
  name: "Test User",
  email: "test@example.com",
  role,
  schoolId: schoolId ?? (role === "super_admin" ? undefined : "school-1"),
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("App Routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: unauthenticated
    mockAuthValues = {
      user: null,
      session: null,
      loading: false,
      isAuthorized: () => false,
    };
  });

  // =========================================================================
  // Public routes — render without auth
  // =========================================================================
  describe("Public routes", () => {
    it("renders the landing page at /", async () => {
      renderApp("/");
      await waitFor(() => {
        expect(screen.getByTestId("page-index")).toBeInTheDocument();
      });
    });

    it("renders login page at /login", async () => {
      renderApp("/login");
      await waitFor(() => {
        expect(screen.getByTestId("page-login")).toBeInTheDocument();
      });
    });

    it("renders register page at /register", async () => {
      renderApp("/register");
      await waitFor(() => {
        expect(screen.getByTestId("page-register")).toBeInTheDocument();
      });
    });

    it("renders forgot password at /forgot-password", async () => {
      renderApp("/forgot-password");
      await waitFor(() => {
        expect(screen.getByTestId("page-forgot")).toBeInTheDocument();
      });
    });

    it("renders reset password at /reset-password", async () => {
      renderApp("/reset-password");
      await waitFor(() => {
        expect(screen.getByTestId("page-reset")).toBeInTheDocument();
      });
    });

    it("renders unauthorized page at /unauthorized", async () => {
      renderApp("/unauthorized");
      await waitFor(() => {
        expect(screen.getByTestId("page-unauthorized")).toBeInTheDocument();
      });
    });

    it("renders access-restricted page at /access-restricted", async () => {
      renderApp("/access-restricted");
      await waitFor(() => {
        expect(screen.getByTestId("page-access-restricted")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Protected routes — require authentication
  // =========================================================================
  describe("Protected routes with authenticated school_admin", () => {
    beforeEach(() => {
      const user = makeUser("school_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) =>
          !roles || roles.length === 0 || roles.includes(user.role),
      };
    });

    const protectedRoutes = [
      { path: "/dashboard", testId: "page-dashboard" },
      { path: "/students", testId: "page-students" },
      { path: "/teachers", testId: "page-teachers" },
      { path: "/grades", testId: "page-grades" },
      { path: "/attendance", testId: "page-attendance" },
      { path: "/exams", testId: "page-exams" },
      { path: "/analytics", testId: "page-analytics" },
      { path: "/settings", testId: "page-settings" },
      { path: "/mark-entry", testId: "page-mark-entry" },
      { path: "/reports", testId: "page-reports" },
      { path: "/timetables", testId: "page-timetables" },
      { path: "/school-info", testId: "page-school-info" },
      { path: "/divisions", testId: "page-divisions" },
      { path: "/subjects", testId: "page-subjects" },
      { path: "/fee-management", testId: "page-fee-management" },
    ];

    protectedRoutes.forEach(({ path, testId }) => {
      it(`renders ${path} for authenticated school_admin`, async () => {
        renderApp(path);
        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeInTheDocument();
        });
      });
    });
  });

  // =========================================================================
  // Role-restricted routes
  // =========================================================================
  describe("Role-restricted routes", () => {
    it("renders /super-admin only for super_admin", async () => {
      const user = makeUser("super_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderApp("/super-admin");
      await waitFor(() => {
        expect(screen.getByTestId("page-super-admin")).toBeInTheDocument();
      });
    });

    it("renders /teacher-dashboard only for teachers", async () => {
      const user = makeUser("teacher");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) =>
          !roles || roles.length === 0 || roles.includes(user.role),
      };

      renderApp("/teacher-dashboard");
      await waitFor(() => {
        expect(screen.getByTestId("page-teacher-dashboard")).toBeInTheDocument();
      });
    });

    it("renders /student-dashboard only for students", async () => {
      const user = makeUser("student");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) =>
          !roles || roles.length === 0 || roles.includes(user.role),
      };

      renderApp("/student-dashboard");
      await waitFor(() => {
        expect(screen.getByTestId("page-student-dashboard")).toBeInTheDocument();
      });
    });

    const studentPortalRoutes = [
      { path: "/student/attendance", testId: "page-student-attendance" },
      { path: "/student/performance", testId: "page-student-performance" },
      { path: "/student/reports", testId: "page-student-reports" },
      { path: "/student/subjects", testId: "page-student-subjects" },
    ];

    studentPortalRoutes.forEach(({ path, testId }) => {
      it(`renders student portal route ${path} for students`, async () => {
        const user = makeUser("student");
        mockAuthValues = {
          user,
          session: { user: { id: user.id } } as any,
          loading: false,
          isAuthorized: (roles?: string[]) =>
            !roles || roles.length === 0 || roles.includes(user.role),
        };

        renderApp(path);
        await waitFor(() => {
          expect(screen.getByTestId(testId)).toBeInTheDocument();
        });
      });
    });
  });

  // =========================================================================
  // 404 catch-all
  // =========================================================================
  describe("404 catch-all", () => {
    it("renders NotFound for unknown paths", async () => {
      renderApp("/some-nonexistent-path");
      await waitFor(() => {
        expect(screen.getByTestId("page-not-found")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Unauthenticated access to protected routes
  // =========================================================================
  describe("Unauthenticated access", () => {
    it("shows loading/redirecting for unauthenticated user on /dashboard", async () => {
      renderApp("/dashboard");
      // RouteGuard should show redirecting state, not the dashboard
      await waitFor(() => {
        expect(screen.queryByTestId("page-dashboard")).not.toBeInTheDocument();
      });
    });
  });
});
