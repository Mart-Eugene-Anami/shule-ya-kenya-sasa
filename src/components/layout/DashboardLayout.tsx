
import { ReactNode, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useCurriculumTerminology } from "@/hooks/useCurriculumTerminology";
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  BookOpen,
  Calendar,
  ClipboardList,
  BarChart3,
  FileText,
  Settings,
  LogOut,
  Menu,
  X,
  School,
  UserPlus,
  Clock,
  ChevronDown,
  Building,
  CreditCard,
  DollarSign,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import scoreLogo from "@/assets/score-logo.svg";

interface DashboardLayoutProps {
  children: ReactNode;
  title?: string;
}

const DashboardLayout = ({ children, title }: DashboardLayoutProps) => {
  const { user, logout } = useAuth();
  const { terminology } = useCurriculumTerminology();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleSignOut = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  const adminNavigationItems = [
    { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
    { name: "School Info", href: "/school-info", icon: Building },
    { name: "Students", href: "/students", icon: Users },
    { name: "Teachers", href: "/teachers", icon: UserPlus },
    { name: terminology.gradePlural, href: "/grades", icon: GraduationCap },
    { name: "Streams", href: "/streams", icon: BookOpen },
    { name: "Divisions", href: "/divisions", icon: School },
    { name: "Subjects", href: "/subjects", icon: BookOpen },
    { name: "Attendance", href: "/attendance", icon: ClipboardList },
    { name: "Exams", href: "/exams", icon: FileText },
    { name: "Mark Entry", href: "/mark-entry", icon: ClipboardList },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Fee Management", href: "/fee-management", icon: DollarSign },
    { name: "Timetables", href: "/timetables", icon: Calendar },
    { name: "Payment Info", href: "/payment-info", icon: CreditCard },
    { name: "Settings", href: "/settings", icon: Settings },
    { name: "Academic Settings", href: "/academic-settings", icon: Settings },
  ];

  const teacherNavigationItems = [
    { name: "Dashboard", href: "/teacher-dashboard", icon: LayoutDashboard },
    { name: "Mark Entry", href: "/mark-entry", icon: ClipboardList },
    { name: "Exams", href: "/exams", icon: FileText },
    { name: "Attendance", href: "/attendance", icon: ClipboardList },
    { name: "Attendance Records", href: "/teacher-attendance", icon: Clock },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Reports", href: "/reports", icon: FileText },
    { name: "Subjects", href: "/subjects", icon: BookOpen },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const studentNavigationItems = [
    { name: "Dashboard", href: "/student-dashboard", icon: LayoutDashboard },
    { name: "Attendance", href: "/student/attendance", icon: ClipboardList },
    { name: "Performance", href: "/student/performance", icon: BarChart3 },
    { name: "Reports", href: "/student/reports", icon: FileText },
    { name: "Subjects", href: "/student/subjects", icon: BookOpen },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  const navigationItems = user?.role === 'super_admin' 
    ? [
        { name: "Super Admin", href: "/super-admin", icon: Building },
      ] 
    : user?.role === 'teacher'
    ? teacherNavigationItems
    : user?.role === 'student'
    ? studentNavigationItems
    : adminNavigationItems;

  return (
    <div className="h-dvh min-h-dvh bg-background flex overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity lg:hidden z-40"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border shadow-lg transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 lg:flex-shrink-0 flex flex-col",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Sidebar Header */}
        <div className="flex items-center justify-between h-16 px-4 border-b border-border flex-shrink-0">
          <div className="flex items-center">
            <img src={scoreLogo} alt="Sabby Score logo" className="h-8 w-8" />
            <span className="ml-2 text-xl font-bold text-foreground">
              SABBY SCORE
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Sidebar Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-thin">
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.href;
            return (
              <Button
                key={item.name}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start text-sm",
                  isActive && "bg-primary/10 text-primary font-medium"
                )}
                onClick={() => {
                  navigate(item.href);
                  setSidebarOpen(false);
                }}
              >
                <Icon className="mr-3 h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.name}</span>
              </Button>
            );
          })}
        </nav>
      </aside>

      {/* Main content wrapper */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header */}
        <header className="bg-card border-b border-border flex-shrink-0 z-30">
          <div className="flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4 lg:px-6">
            <div className="flex items-center min-w-0">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden flex-shrink-0 mr-2"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <h1 className="text-lg sm:text-xl lg:text-2xl font-semibold text-foreground truncate">
                {title || "Dashboard"}
              </h1>
            </div>

            <div className="flex items-center space-x-2 sm:space-x-4 flex-shrink-0">
              <NotificationCenter />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 px-2 sm:px-3">
                    <Avatar className="h-7 w-7 sm:h-8 sm:w-8">
                      <AvatarFallback className="text-xs sm:text-sm">
                        {user?.name?.charAt(0)?.toUpperCase() || "U"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="hidden md:block text-left max-w-[120px]">
                      <p className="text-sm font-medium truncate">{user?.name}</p>
                      <p className="text-xs text-muted-foreground capitalize truncate">
                        {user?.role?.replace("_", " ")}
                      </p>
                    </div>
                    <ChevronDown className="h-4 w-4 hidden sm:block" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-popover border border-border shadow-lg z-50">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/settings")}>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut}>
                    <LogOut className="mr-2 h-4 w-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </header>

        {/* Page content - Scrollable */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden">
          <div className="p-3 sm:p-4 lg:p-6 xl:p-8 min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;

