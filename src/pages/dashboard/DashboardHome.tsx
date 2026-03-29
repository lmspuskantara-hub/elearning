import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen, FileQuestion, ClipboardCheck, Users, TrendingUp, Clock } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEnrolledCourses, useDashboardStats } from "@/hooks/use-courses";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardHome = () => {
  const { data: enrolledCourses, isLoading: coursesLoading } = useEnrolledCourses();
  const { data: stats, isLoading: statsLoading } = useDashboardStats();

  const statItems = [
    { icon: BookOpen, label: "Kursus Aktif", value: String(stats?.activeCourses || 0), color: "text-primary" },
    { icon: FileQuestion, label: "Kuis Selesai", value: String(stats?.completedQuizzes || 0), color: "text-accent" },
    { icon: ClipboardCheck, label: "Tugas Pending", value: String(stats?.pendingAssignments || 0), color: "text-warning" },
    { icon: Users, label: "Forum Aktif", value: String(stats?.activeForums || 0), color: "text-success" },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Dashboard</h1>
        <p className="text-muted-foreground font-body mt-1">Selamat datang kembali! Berikut ringkasan aktivitas Anda.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statItems.map((s) => (
          <Card key={s.label}>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                  <s.icon className={`h-5 w-5 ${s.color}`} />
                </div>
                <div>
                  {statsLoading ? (
                    <Skeleton className="h-8 w-12" />
                  ) : (
                    <p className="text-2xl font-heading font-bold">{s.value}</p>
                  )}
                  <p className="text-xs text-muted-foreground font-body">{s.label}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-accent" />
              Progres Kursus
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {coursesLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
              ))
            ) : enrolledCourses?.length ? (
              enrolledCourses.map((c) => (
                <div key={c.id} className="space-y-2">
                  <div className="flex justify-between text-sm font-body">
                    <span className="font-medium">{c.title}</span>
                    <span className="text-muted-foreground">{c.completedLessons}/{c.totalLessons} pelajaran</span>
                  </div>
                  <Progress value={c.progress} className="h-2" />
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground font-body">Belum ada kursus yang diikuti. Mulai daftar kursus!</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Clock className="h-5 w-5 text-accent" />
              Aktivitas Terbaru
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground font-body">Belum ada aktivitas terbaru.</p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default DashboardHome;
