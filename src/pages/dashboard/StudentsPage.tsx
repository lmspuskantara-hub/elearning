import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const StudentsPage = () => {
  const { user } = useAuth();

  const { data: students, isLoading } = useQuery({
    queryKey: ["teacher-students", user?.id],
    queryFn: async () => {
      // Get teacher's courses
      const { data: courses } = await supabase.from("courses").select("id, title").eq("teacher_id", user!.id);
      if (!courses?.length) return [];

      const courseIds = courses.map(c => c.id);

      // Get enrollments for these courses
      const { data: enrollments } = await supabase
        .from("enrollments")
        .select("user_id, course_id, enrolled_at")
        .in("course_id", courseIds);

      if (!enrollments?.length) return [];

      const userIds = [...new Set(enrollments.map(e => e.user_id))];

      // Get profiles
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", userIds);

      return (profiles || []).map(p => ({
        ...p,
        enrolledCourses: enrollments.filter(e => e.user_id === p.id).map(e => courses.find(c => c.id === e.course_id)?.title || ""),
      }));
    },
    enabled: !!user,
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Siswa</h1>
        <p className="text-muted-foreground font-body mt-1">Daftar siswa yang terdaftar di kursus Anda</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : students?.length ? (
        <div className="space-y-3">
          {students.map((s: any) => (
            <Card key={s.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-heading font-semibold">{s.full_name || "Siswa"}</p>
                      <div className="flex gap-1 flex-wrap mt-1">
                        {s.enrolledCourses.map((c: string, i: number) => (
                          <Badge key={i} variant="outline" className="text-xs">{c}</Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Siswa</h3>
            <p className="text-muted-foreground font-body">Belum ada siswa yang terdaftar di kursus Anda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default StudentsPage;
