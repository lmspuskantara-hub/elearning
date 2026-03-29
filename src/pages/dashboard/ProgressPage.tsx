import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BarChart3, TrendingUp, Award, Target } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";

const ProgressPage = () => {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const isTeacherOrAdmin = roleData?.isTeacher || roleData?.isAdmin;

  // Fetch enrolled courses with lesson counts and progress
  const { data: courseProgress, isLoading } = useQuery({
    queryKey: ["progress-data", user?.id, isTeacherOrAdmin],
    queryFn: async () => {
      if (!user) return [];

      if (isTeacherOrAdmin) {
        // Teachers/admins: show all courses with total lesson count
        const { data: courses, error } = await supabase.from("courses").select("id, title");
        if (error) throw error;

        const results = await Promise.all(
          (courses || []).map(async (course) => {
            const { data: chapters } = await supabase.from("chapters").select("id").eq("course_id", course.id);
            const chapterIds = (chapters || []).map((c) => c.id);
            let totalLessons = 0;
            if (chapterIds.length > 0) {
              const { count } = await supabase.from("lessons").select("id", { count: "exact", head: true }).in("chapter_id", chapterIds);
              totalLessons = count || 0;
            }
            // Count enrollments
            const { count: enrolled } = await supabase.from("enrollments").select("id", { count: "exact", head: true }).eq("course_id", course.id);
            return { name: course.title, totalLessons, enrolled: enrolled || 0, completed: 0, percentage: 0 };
          })
        );
        return results;
      } else {
        // Students: show enrolled courses with their progress
        const { data: enrollments, error } = await supabase
          .from("enrollments")
          .select("course_id, courses(id, title)")
          .eq("user_id", user.id);
        if (error) throw error;

        const results = await Promise.all(
          (enrollments || []).map(async (e: any) => {
            const course = e.courses;
            const { data: chapters } = await supabase.from("chapters").select("id").eq("course_id", course.id);
            const chapterIds = (chapters || []).map((c: any) => c.id);
            let totalLessons = 0;
            let completedLessons = 0;
            if (chapterIds.length > 0) {
              const { count: total } = await supabase.from("lessons").select("id", { count: "exact", head: true }).in("chapter_id", chapterIds);
              totalLessons = total || 0;

              const { data: lessonRows } = await supabase.from("lessons").select("id").in("chapter_id", chapterIds);
              const lessonIds = (lessonRows || []).map((l: any) => l.id);
              if (lessonIds.length > 0) {
                const { count: done } = await supabase
                  .from("lesson_progress")
                  .select("id", { count: "exact", head: true })
                  .eq("user_id", user.id)
                  .eq("completed", true)
                  .in("lesson_id", lessonIds);
                completedLessons = done || 0;
              }
            }
            const percentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;
            return { name: course.title, totalLessons, completed: completedLessons, percentage };
          })
        );
        return results;
      }
    },
    enabled: !!user,
  });

  // Quiz scores for students
  const { data: quizScores } = useQuery({
    queryKey: ["quiz-scores", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("score")
        .eq("user_id", user.id)
        .eq("status", "completed");
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !isTeacherOrAdmin,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24" />)}
        </div>
      </div>
    );
  }

  const data = courseProgress || [];
  const overallProgress = data.length > 0 ? Math.round(data.reduce((a, c) => a + c.percentage, 0) / data.length) : 0;
  const avgScore = quizScores && quizScores.length > 0
    ? Math.round(quizScores.reduce((a, s) => a + (Number(s.score) || 0), 0) / quizScores.length)
    : 0;
  const completedCourses = data.filter((c) => c.percentage === 100).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
          {isTeacherOrAdmin ? "Progres & Statistik" : "Progres Belajar"}
        </h1>
        <p className="text-muted-foreground font-body mt-1">
          {isTeacherOrAdmin ? "Lihat statistik kursus dan siswa" : "Pantau kemajuan belajar Anda"}
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {(isTeacherOrAdmin
          ? [
              { icon: BarChart3, label: "Total Kursus", value: `${data.length}`, color: "text-primary" },
              { icon: TrendingUp, label: "Total Pelajaran", value: `${data.reduce((a, c) => a + c.totalLessons, 0)}`, color: "text-accent" },
              { icon: Target, label: "Total Siswa Terdaftar", value: `${data.reduce((a, c: any) => a + (c.enrolled || 0), 0)}`, color: "text-primary" },
              { icon: Award, label: "Kursus dengan Materi", value: `${data.filter((c) => c.totalLessons > 0).length}`, color: "text-accent" },
            ]
          : [
              { icon: TrendingUp, label: "Progres Keseluruhan", value: `${overallProgress}%`, color: "text-accent" },
              { icon: Award, label: "Rata-rata Nilai Kuis", value: `${avgScore || "-"}`, color: "text-accent" },
              { icon: Target, label: "KKM", value: "75", color: "text-primary" },
              { icon: BarChart3, label: "Kursus Selesai", value: `${completedCourses}/${data.length}`, color: "text-primary" },
            ]
        ).map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6 flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                <s.icon className={`h-5 w-5 ${s.color}`} />
              </div>
              <div>
                <p className="text-xl font-heading font-bold">{s.value}</p>
                <p className="text-xs text-muted-foreground font-body">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading">
            {isTeacherOrAdmin ? "Detail per Kursus" : "Progres per Kursus"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {data.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              {isTeacherOrAdmin ? "Belum ada kursus." : "Anda belum terdaftar di kursus apapun."}
            </p>
          ) : (
            data.map((c: any) => (
              <div key={c.name} className="space-y-2">
                <div className="flex justify-between items-end">
                  <div>
                    <p className="font-heading font-semibold">{c.name}</p>
                    <p className="text-xs text-muted-foreground font-body">
                      {isTeacherOrAdmin
                        ? `${c.totalLessons} pelajaran · ${c.enrolled || 0} siswa terdaftar`
                        : `${c.completed}/${c.totalLessons} pelajaran selesai`}
                    </p>
                  </div>
                  {!isTeacherOrAdmin && (
                    <p className="text-xs text-muted-foreground">{c.percentage}%</p>
                  )}
                </div>
                {!isTeacherOrAdmin && <Progress value={c.percentage} className="h-2" />}
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ProgressPage;
