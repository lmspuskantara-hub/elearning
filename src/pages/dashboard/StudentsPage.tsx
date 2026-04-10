import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, GraduationCap, Search, ShieldCheck } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { useState } from "react";

const StudentsPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const [searchQuery, setSearchQuery] = useState("");

  const isTeacherOrAdmin = userRole?.isTeacher || userRole?.isAdmin;

  const { data: students, isLoading } = useQuery({
    queryKey: ["students-list", user?.id, userRole],
    queryFn: async () => {
      if (!user || !userRole) return [];

      let profilesData: any[] = [];
      let enrollmentsData: any[] = [];
      let coursesData: any[] = [];

      // --- 1. LOGIKA ADMIN: LIHAT SEMUA SISWA DI PLATFORM ---
      if (userRole.isAdmin) {
        const { data: allStudents } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .eq("role", "student"); // Mengambil semua user dengan role student
        
        profilesData = allStudents || [];

        const { data: allEnroll } = await supabase.from("enrollments").select("user_id, course_id");
        const { data: allCourses } = await supabase.from("courses").select("id, title");
        
        enrollmentsData = allEnroll || [];
        coursesData = allCourses || [];
      } 

      // --- 2. LOGIKA GURU: HANYA SISWA DI KURSUSNYA ---
      else if (userRole.isTeacher) {
        const { data: myCourses } = await supabase
          .from("courses")
          .select("id, title")
          .eq("teacher_id", user.id);
        
        coursesData = myCourses || [];
        const courseIds = coursesData.map(c => c.id);

        const { data: myEnroll } = await supabase
          .from("enrollments")
          .select("user_id, course_id")
          .in("course_id", courseIds);
        
        enrollmentsData = myEnroll || [];
        
        const userIds = [...new Set(enrollmentsData.map(e => e.user_id))];
        const { data: myProfiles } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url")
          .in("id", userIds);
        
        profilesData = myProfiles || [];
      }

      // --- 3. LOGIKA SISWA: TEMAN SEKELAS ---
      else {
        const { data: myEnroll } = await supabase
          .from("enrollments")
          .select("course_id")
          .eq("user_id", user.id);
        
        const myCourseIds = myEnroll?.map(e => e.course_id) || [];
        
        const { data: courses } = await supabase.from("courses").select("id, title").in("id", myCourseIds);
        coursesData = courses || [];

        const { data: peerEnroll } = await supabase.from("enrollments").select("user_id, course_id").in("course_id", myCourseIds);
        enrollmentsData = peerEnroll || [];

        const peerIds = [...new Set(enrollmentsData.map(e => e.user_id))];
        const { data: peerProfiles } = await supabase.from("profiles").select("id, full_name, avatar_url").in("id", peerIds);
        
        profilesData = peerProfiles || [];
      }

      // Gabungkan data profil dengan kursus yang mereka ikuti
      return profilesData.map(p => ({
        ...p,
        enrolledCourses: enrollmentsData
          .filter(e => e.user_id === p.id)
          .map(e => coursesData.find(c => c.id === e.course_id)?.title)
          .filter(Boolean),
      }));
    },
    enabled: !!user && !!userRole,
  });

  // Filter pencarian sederhana di sisi client
  const filteredStudents = students?.filter(s => 
    s.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
              {userRole?.isAdmin ? "Database Siswa" : userRole?.isTeacher ? "Siswa Saya" : "Teman Kursus"}
            </h1>
            {userRole?.isAdmin && <ShieldCheck className="h-5 w-5 text-blue-500" />}
          </div>
          <p className="text-muted-foreground font-body mt-1">
            {userRole?.isAdmin 
              ? "Seluruh data siswa yang terdaftar di PKBM Puspa Loka Nusantara." 
              : "Daftar pengguna yang berinteraksi dalam lingkungan belajar Anda."}
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Cari nama siswa..." 
            className="pl-9"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {isLoading ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-24 w-full rounded-xl" />)}
        </div>
      ) : filteredStudents?.length ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredStudents.map((s: any) => (
            <Card key={s.id} className="hover:shadow-md transition-all border-muted group">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="w-12 h-12 rounded-full bg-primary/5 flex-shrink-0 flex items-center justify-center border border-primary/10 group-hover:border-primary/30 transition-colors">
                    {s.avatar_url ? (
                      <img src={s.avatar_url} alt={s.full_name} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <GraduationCap className="h-6 w-6 text-primary/70" />
                    )}
                  </div>
                  
                  <div className="space-y-1 flex-1 min-w-0">
                    <p className="font-heading font-bold text-base truncate">
                      {s.full_name || "Siswa"}
                    </p>
                    <div className="flex gap-1 flex-wrap">
                      {s.enrolledCourses.length > 0 ? (
                        s.enrolledCourses.slice(0, 2).map((title: string, idx: number) => (
                          <Badge key={idx} variant="secondary" className="text-[10px] font-normal py-0 px-1.5">
                            {title}
                          </Badge>
                        ))
                      ) : (
                        <span className="text-[10px] text-muted-foreground italic">Belum ada kursus</span>
                      )}
                      {s.enrolledCourses.length > 2 && (
                        <Badge variant="outline" className="text-[10px] py-0 px-1.5">+{s.enrolledCourses.length - 2}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed py-20">
          <CardContent className="text-center">
            <Users className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg">Tidak Ada Siswa Ditemukan</h3>
            <p className="text-muted-foreground text-sm">Coba kata kunci lain atau pastikan role user sudah benar.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentsPage;