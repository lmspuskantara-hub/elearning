import { Link, useLocation } from "react-router-dom";
import {
  BookOpen, LayoutDashboard, GraduationCap, FileQuestion,
  ClipboardCheck, BarChart3, MessageSquare, UserCheck,
  Download, Settings, LogOut, PlusCircle, Users, Shield
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/use-role";
import logo from "@/assets/tut wuri handayani.png";

const studentMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: GraduationCap, label: "Kursus Saya", path: "/dashboard/courses" },
  { icon: FileQuestion, label: "Kuis & Ujian", path: "/dashboard/quizzes" },
  { icon: ClipboardCheck, label: "Tugas", path: "/dashboard/assignments" },
  { icon: BarChart3, label: "Progres", path: "/dashboard/progress" },
  { icon: MessageSquare, label: "Forum", path: "/dashboard/forum" },
  { icon: UserCheck, label: "Absensi", path: "/dashboard/attendance" },
  { icon: Download, label: "Export Data", path: "/dashboard/export" },
  { icon: Settings, label: "Pengaturan", path: "/dashboard/settings" },
];

const teacherMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: PlusCircle, label: "Kelola Kursus", path: "/dashboard/manage-courses" },
  { icon: FileQuestion, label: "Kelola Kuis", path: "/dashboard/manage-quizzes" },
  { icon: ClipboardCheck, label: "Tugas", path: "/dashboard/assignments" },
  { icon: UserCheck, label: "Kelola Absensi", path: "/dashboard/manage-attendance" },
  { icon: Users, label: "Siswa", path: "/dashboard/students" },
  { icon: MessageSquare, label: "Forum", path: "/dashboard/forum" },
  { icon: BarChart3, label: "Progres Siswa", path: "/dashboard/progress" },
  { icon: Download, label: "Export Data", path: "/dashboard/export" },
  { icon: Settings, label: "Pengaturan", path: "/dashboard/settings" },
];

const adminMenuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Shield, label: "Kelola Pengguna", path: "/dashboard/admin-users" },
  { icon: PlusCircle, label: "Kelola Kursus", path: "/dashboard/manage-courses" },
  { icon: FileQuestion, label: "Kelola Kuis", path: "/dashboard/manage-quizzes" },
  { icon: ClipboardCheck, label: "Tugas", path: "/dashboard/assignments" },
  { icon: UserCheck, label: "Kelola Absensi", path: "/dashboard/manage-attendance" },
  { icon: Users, label: "Siswa", path: "/dashboard/students" },
  { icon: GraduationCap, label: "Kursus", path: "/dashboard/courses" },
  { icon: BarChart3, label: "Progres", path: "/dashboard/progress" },
  { icon: MessageSquare, label: "Forum", path: "/dashboard/forum" },
  { icon: Download, label: "Export Data", path: "/dashboard/export" },
  { icon: Settings, label: "Pengaturan", path: "/dashboard/settings" },
];

const DashboardSidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole();

  const menuItems = userRole?.isAdmin ? adminMenuItems : userRole?.isTeacher ? teacherMenuItems : studentMenuItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <aside className="hidden lg:flex flex-col w-64 min-h-screen bg-sidebar border-r border-sidebar-border">
      <div className="p-5 border-b border-sidebar-border">
        <Link to="/dashboard" className="flex items-center gap-2">
  <img
    src={logo}
    alt="Logo PKBM"
    className="h-12 w-12 object-contain"
  />
  <span className="font-heading text-l font-bold text-sidebar-foreground">
    PKBM PUSPA LOKA NUSANTARA
  </span>
</Link>
        {userRole && (
          <span className="text-xs font-body text-sidebar-foreground/60 mt-1 block">
            {userRole.isAdmin ? "🛡️ Admin" : userRole.isTeacher ? "👨‍🏫 Guru" : "👨‍🎓 Siswa"}
          </span>
        )}
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body transition-colors ${
                isActive
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-body text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground transition-colors w-full"
        >
          <LogOut className="h-5 w-5" />
          Keluar
        </button>
      </div>
    </aside>
  );
};

export default DashboardSidebar;
