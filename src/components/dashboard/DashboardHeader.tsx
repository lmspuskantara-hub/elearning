import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Menu, X, LogOut } from "lucide-react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/use-role";
import logo from "@/assets/tut wuri handayani.png";

// ================= MENU CONFIG =================

// SISWA
const studentMenuItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Kursus", path: "/dashboard/courses" },
  { label: "Kuis", path: "/dashboard/quizzes" },
  { label: "Tugas", path: "/dashboard/assignments" },
  { label: "Progres", path: "/dashboard/progress" },
  { label: "Forum", path: "/dashboard/forum" },
  { label: "Absensi", path: "/dashboard/attendance" },
];

// GURU
const teacherMenuItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Kelola Kursus", path: "/dashboard/manage-courses" },
  { label: "Kelola Kuis", path: "/dashboard/manage-quizzes" },
  { label: "Tugas", path: "/dashboard/assignments" },
  { label: "Kelola Absensi", path: "/dashboard/manage-attendance" },
  { label: "Siswa", path: "/dashboard/students" },
  { label: "Forum", path: "/dashboard/forum" },
];

// ADMIN
const adminMenuItems = [
  { label: "Dashboard", path: "/dashboard" },
  { label: "Kelola Pengguna", path: "/dashboard/admin-users" },
  { label: "Kelola Kursus", path: "/dashboard/manage-courses" },
  { label: "Kelola Kuis", path: "/dashboard/manage-quizzes" },
  { label: "Tugas", path: "/dashboard/assignments" },
  { label: "Kelola Absensi", path: "/dashboard/manage-attendance" },
  { label: "Siswa", path: "/dashboard/students" },
  { label: "Kursus", path: "/dashboard/courses" },
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
