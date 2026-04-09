import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-role";
import logo from "@/assets/tut wuri handayani.png";

// ================= MENU CONFIG =================

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
// ================= COMPONENT =================

const DashboardHeader = () => {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const { data: userRole } = useUserRole();

  // ⛔ loading guard (PENTING)
  if (!userRole) return null;

  // 🎯 tentukan menu berdasarkan role
  let mobileMenuItems = [];

  if (userRole.isAdmin) {
    mobileMenuItems = adminMenuItems;
  } else if (userRole.isTeacher) {
    mobileMenuItems = teacherMenuItems;
  } else {
    mobileMenuItems = studentMenuItems;
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  return (
    <header className="lg:hidden sticky top-0 z-50 bg-sidebar border-b border-sidebar-border">
      
      {/* TOP BAR */}
      <div className="flex items-center justify-between px-4 h-14">
        <Link to="/dashboard" className="flex items-center gap-2">
          <img
            src={logo}
            alt="Logo PKBM"
            className="h-9 w-9 object-contain"
          />
          <span className="font-heading text-lg font-bold text-sidebar-foreground">
            PKBM PUSPA LOKA NUSANTARA
          </span>
        </Link>

        <button
          onClick={() => setOpen(!open)}
          className="text-sidebar-foreground"
        >
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {/* DROPDOWN MENU */}
      {open && (
        <div className="bg-sidebar border-t border-sidebar-border p-4 space-y-1">
          
          {mobileMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              onClick={() => setOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-body transition-colors ${
                location.pathname === item.path
                  ? "bg-sidebar-accent text-sidebar-primary font-semibold"
                  : "text-sidebar-foreground/70"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* LOGOUT */}
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 px-3 py-2 text-sm text-sidebar-foreground/70 w-full hover:bg-sidebar-accent/50 rounded-lg"
          >
            <LogOut className="h-4 w-4" /> Keluar
          </button>
        </div>
      )}
    </header>
  );
};

export default DashboardHeader;
