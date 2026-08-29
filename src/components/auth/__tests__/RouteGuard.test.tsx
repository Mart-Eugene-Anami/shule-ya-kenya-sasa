/**
 * RouteGuard Unit Tests
 *
 * Tests the authentication/authorization state machine that protects routes:
 * - Public path handling (login, register, landing)
 * - Redirect logic for authenticated users on auth pages
 * - Unauthenticated users blocked from protected routes
 * - Role-based access control (allowedRoles enforcement)
 * - Super admin bypass for all role checks
 * - School access checking for non-super-admin users
 * - Teacher/student dashboard redirects from /dashboard
 * - School-specific route guarding (requires schoolId)
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import RouteGuard from "../RouteGuard";

// ---------------------------------------------------------------------------
// Mock Dependencies
// ---------------------------------------------------------------------------

// Mock the school access check — defaults to allowing access
const mockCheckSchoolAccess = vi.fn().mockResolvedValue(true);
const mockClearAccessCache = vi.fn();
vi.mock("@/services/accessControlService", () => ({
  checkSchoolAccess: (...args: any[]) => mockCheckSchoolAccess(...args),
  clearAccessCache: (...args: any[]) => mockClearAccessCache(...args),
}));

// Mock toast so we can assert on access-denied messages
const mockToast = vi.fn();
vi.mock("@/hooks/use-toast", () => ({
  useToast: () => ({ toast: mockToast }),
}));

// Auth context values that individual tests will override
let mockAuthValues: {
  user: any;
  session: any;
  loading: boolean;
  isAuthorized: (roles?: string[]) => boolean;
};

vi.mock("../../../contexts/AuthContext", () => ({
  useAuth: () => mockAuthValues,
}));

// Track navigation calls
const mockNavigate = vi.fn();
vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Render RouteGuard at a given path with optional allowedRoles */
const renderGuard = (
  path: string,
  allowedRoles?: Array<"super_admin" | "school_admin" | "teacher" | "student">,
  childText = "Protected Content"
) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route
          path="*"
          element={
            <RouteGuard allowedRoles={allowedRoles}>
              <div>{childText}</div>
            </RouteGuard>
          }
        />
      </Routes>
    </MemoryRouter>
  );
};

/** Factory to build a mock user */
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

describe("RouteGuard", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default: unauthenticated, not loading
    mockAuthValues = {
      user: null,
      session: null,
      loading: false,
      isAuthorized: () => false,
    };
  });

  // =========================================================================
  // Loading state
  // =========================================================================
  describe("Loading state", () => {
    it("shows a loading spinner while auth is initialising", () => {
      mockAuthValues.loading = true;
      renderGuard("/dashboard");

      expect(screen.getByText("Loading...")).toBeInTheDocument();
    });

    it("does not render children while loading", () => {
      mockAuthValues.loading = true;
      renderGuard("/dashboard");

      expect(screen.queryByText("Protected Content")).not.toBeInTheDocument();
    });
  });

  // =========================================================================
  // Public paths
  // =========================================================================
  describe("Public paths", () => {
    const publicPaths = ["/", "/login", "/register", "/register/confirm", "/register/super-admin", "/access-restricted"];

    publicPaths.forEach((path) => {
      it(`renders children on public path "${path}" without authentication`, async () => {
        renderGuard(path);

        await waitFor(() => {
          expect(screen.getByText("Protected Content")).toBeInTheDocument();
        });
      });
    });

    it("redirects authenticated user from /login to the correct dashboard", async () => {
      const user = makeUser("school_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/login");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/dashboard", { replace: true });
      });
    });

    it("redirects authenticated super_admin from /login to /super-admin", async () => {
      const user = makeUser("super_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/login");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/super-admin", { replace: true });
      });
    });

    it("redirects authenticated teacher from /login to /teacher-dashboard", async () => {
      const user = makeUser("teacher");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/login");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/teacher-dashboard", { replace: true });
      });
    });

    it("redirects authenticated student from /login to /student-dashboard", async () => {
      const user = makeUser("student");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/login");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/student-dashboard", { replace: true });
      });
    });
  });

  // =========================================================================
  // Unauthenticated on protected routes
  // =========================================================================
  describe("Unauthenticated access to protected routes", () => {
    it("redirects to /login when accessing /dashboard without a session", async () => {
      renderGuard("/dashboard");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login", expect.objectContaining({ replace: true }));
      });
    });

    it("passes the current path in location state for post-login redirect", async () => {
      renderGuard("/students");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/login", {
          replace: true,
          state: { from: "/students" },
        });
      });
    });
  });

  // =========================================================================
  // Role-based access control
  // =========================================================================
  describe("Role-based access control", () => {
    it("grants access when user has a required role", async () => {
      const user = makeUser("school_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) =>
          !roles || roles.length === 0 || roles.includes(user.role),
      };

      renderGuard("/fee-management", ["school_admin", "super_admin"]);

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });

    it("denies access and redirects to /unauthorized when role is not allowed", async () => {
      const user = makeUser("teacher");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) =>
          !roles || roles.length === 0 || roles.includes(user.role),
      };

      renderGuard("/fee-management", ["school_admin", "super_admin"]);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/unauthorized", { replace: true });
      });
    });

    it("shows a destructive toast when access is denied", async () => {
      const user = makeUser("student");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) =>
          !roles || roles.length === 0 || roles.includes(user.role),
      };

      renderGuard("/fee-management", ["school_admin"]);

      await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
          expect.objectContaining({ variant: "destructive" })
        );
      });
    });

    it("super_admin bypasses all role restrictions", async () => {
      const user = makeUser("super_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true, // super_admin always returns true
      };

      renderGuard("/fee-management", ["school_admin"]);

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });

    it("grants access when no allowedRoles are specified (any authenticated user)", async () => {
      const user = makeUser("teacher");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) => !roles || roles.length === 0 || roles.includes(user.role),
      };

      renderGuard("/analytics");

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // School access control
  // =========================================================================
  describe("School access check", () => {
    it("allows access when school has access", async () => {
      mockCheckSchoolAccess.mockResolvedValue(true);
      const user = makeUser("school_admin", "school-1");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
      expect(mockCheckSchoolAccess).toHaveBeenCalledWith("school-1");
    });

    it("redirects to /access-restricted when school access is denied", async () => {
      mockCheckSchoolAccess.mockResolvedValue(false);
      const user = makeUser("school_admin", "school-1");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/access-restricted", { replace: true });
      });
    });

    it("skips school access check for super_admin users", async () => {
      const user = makeUser("super_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
      expect(mockCheckSchoolAccess).not.toHaveBeenCalled();
    });

    it("skips school access check on access-exempt paths (/payment-info)", async () => {
      const user = makeUser("school_admin", "school-1");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: (roles?: string[]) => !roles || roles.includes(user.role),
      };

      renderGuard("/payment-info", ["school_admin"]);

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
      expect(mockCheckSchoolAccess).not.toHaveBeenCalled();
    });

    it("allows access gracefully when school access check throws an error", async () => {
      mockCheckSchoolAccess.mockRejectedValue(new Error("Network error"));
      const user = makeUser("school_admin", "school-1");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      // Should still render children because error = allow access
      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // Dashboard redirects per role
  // =========================================================================
  describe("Role-based dashboard redirects", () => {
    it("redirects teachers from /dashboard to /teacher-dashboard", async () => {
      const user = makeUser("teacher");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/teacher-dashboard", { replace: true });
      });
    });

    it("redirects students from /dashboard to /student-dashboard", async () => {
      const user = makeUser("student");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/student-dashboard", { replace: true });
      });
    });

    it("allows school_admin to stay on /dashboard", async () => {
      const user = makeUser("school_admin");
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/dashboard");

      await waitFor(() => {
        expect(screen.getByText("Protected Content")).toBeInTheDocument();
      });
    });
  });

  // =========================================================================
  // School-specific route enforcement
  // =========================================================================
  describe("School-specific route enforcement", () => {
    it("denies access to /students when user has no schoolId", async () => {
      const user = { ...makeUser("school_admin"), schoolId: undefined };
      mockAuthValues = {
        user,
        session: { user: { id: user.id } } as any,
        loading: false,
        isAuthorized: () => true,
      };

      renderGuard("/students");

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith("/unauthorized", { replace: true });
      });
    });

    const schoolRoutes = ["/students", "/teachers", "/grades", "/streams", "/attendance", "/exams", "/mark-entry"];
    schoolRoutes.forEach((path) => {
      it(`requires schoolId for school-specific path "${path}"`, async () => {
        const user = { ...makeUser("school_admin"), schoolId: undefined };
        mockAuthValues = {
          user,
          session: { user: { id: user.id } } as any,
          loading: false,
          isAuthorized: () => true,
        };

        renderGuard(path);

        await waitFor(() => {
          expect(mockNavigate).toHaveBeenCalledWith("/unauthorized", { replace: true });
        });
      });
    });
  });

  // =========================================================================
  // Cache clearing on logout
  // =========================================================================
  describe("Cache management", () => {
    it("clears access cache when session is null and not loading", () => {
      // Render with no session, not loading → cache should be cleared
      mockAuthValues = {
        user: null,
        session: null,
        loading: false,
        isAuthorized: () => false,
      };

      renderGuard("/");

      // The cache-clearing useEffect fires when session is null and not loading
      expect(mockClearAccessCache).toHaveBeenCalled();
    });
  });
});
