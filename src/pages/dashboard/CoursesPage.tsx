import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Play, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEnrolledCourses } from "@/hooks/use-courses";
import { useUserRole } from "@/hooks/use-role";
import { useAuth } from "@/hooks/use-auth";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

const CoursesPage = () => {
  const { data: enrolledCourses, isLoading: enrolledLoading } = useEnrolledCourses();
  const { data: roleData, isLoading: roleLoading } = useUserRole();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const isTeacherOrAdmin = roleData?.isTeacher || roleData?.isAdmin;

  // All published courses (for students to browse & enroll)
  const { data: allCourses, isLoading: allLoading } = useQuery({
    queryKey: ["all-courses", isTeacherOrAdmin],
    queryFn: async () => {
      if (isTeacherOrAdmin) {
        // Admin/teacher sees all courses
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      } else {
        // Student sees published courses they can enroll in
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("status", "published")
          .order("created_at", { ascending: false });
        if (error) throw error;
        return data || [];
      }
    },
    enabled: !roleLoading,
  });

  const enroll = useMutation({
    mutationFn: async (courseId: string) => {
      if (!user) throw new Error("Login dulu");
      const { error } = await supabase.from("enrollments").insert({ user_id: user.id, course_id: courseId });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Berhasil mendaftar ke kursus!" });
      queryClient.invalidateQueries({ queryKey: ["enrolled-courses"] });
      queryClient.invalidateQueries({ queryKey: ["all-courses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const isLoading = enrolledLoading || roleLoading || allLoading;
  const enrolledIds = new Set((enrolledCourses || []).map((c) => c.id));

  // For teacher/admin: show all courses. For student: show enrolled first, then browse.
  const unenrolledCourses = (allCourses || []).filter((c) => !enrolledIds.has(c.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
          {isTeacherOrAdmin ? "Semua Kursus" : "Kursus Saya"}
        </h1>
        <p className="text-muted-foreground font-body mt-1">
          {isTeacherOrAdmin ? "Daftar semua kursus di platform" : "Kursus yang Anda ikuti dan kursus tersedia"}
        </p>
      </div>

      {isLoading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-4">
                <Skeleton className="h-12 w-12 rounded-lg" />
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <>
          {/* Enrolled courses (for students) */}
          {!isTeacherOrAdmin && enrolledCourses && enrolledCourses.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-heading font-semibold text-lg">Kursus yang Diikuti</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledCourses.map((c) => (
                  <Card key={c.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => navigate(`/dashboard/courses/${c.id}`)}>
                    <CardContent className="pt-6 space-y-4">
                      <div className="flex items-start justify-between">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="default">Terdaftar</Badge>
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold">{c.title}</h3>
                        <p className="text-sm text-muted-foreground font-body">{c.teacher_name}</p>
                      </div>
                      {c.progress > 0 && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs font-body">
                            <span>Progres</span>
                            <span className="font-semibold">{c.progress}%</span>
                          </div>
                          <Progress value={c.progress} className="h-1.5" />
                        </div>
                      )}
                      <Button variant="ghost" size="sm" className="w-full gap-2">
                        <Play className="h-4 w-4" />
                        {c.progress > 0 ? "Lanjutkan" : "Mulai"}
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* All/available courses */}
          {isTeacherOrAdmin ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {(allCourses || []).map((c) => (
                <Card key={c.id} className="hover:shadow-md transition-shadow group cursor-pointer" onClick={() => navigate(isTeacherOrAdmin ? `/dashboard/manage-courses/${c.id}` : `/dashboard/courses/${c.id}`)}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                        <BookOpen className="h-6 w-6 text-primary" />
                      </div>
                      <Badge variant={c.status === "published" ? "default" : "secondary"}>
                        {c.status === "published" ? "Published" : "Draft"}
                      </Badge>
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{c.title}</h3>
                      <p className="text-sm text-muted-foreground font-body">{c.teacher_name}</p>
                    </div>
                    {c.description && (
                      <p className="text-xs text-muted-foreground font-body line-clamp-2">{c.description}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
              {!(allCourses || []).length && (
                <Card className="col-span-full">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Kursus</h3>
                    <p className="text-muted-foreground font-body">Belum ada kursus yang dibuat.</p>
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <>
              {unenrolledCourses.length > 0 && (
                <div className="space-y-3">
                  <h2 className="font-heading font-semibold text-lg">Kursus Tersedia</h2>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {unenrolledCourses.map((c) => (
                      <Card key={c.id} className="hover:shadow-md transition-shadow">
                        <CardContent className="pt-6 space-y-4">
                          <div className="flex items-start justify-between">
                            <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center">
                              <BookOpen className="h-6 w-6 text-accent" />
                            </div>
                            <Badge variant="outline">Tersedia</Badge>
                          </div>
                          <div>
                            <h3 className="font-heading font-semibold">{c.title}</h3>
                            <p className="text-sm text-muted-foreground font-body">{c.teacher_name}</p>
                          </div>
                          {c.description && (
                            <p className="text-xs text-muted-foreground font-body line-clamp-2">{c.description}</p>
                          )}
                          <Button
                            size="sm"
                            className="w-full gap-2"
                            onClick={(e) => { e.stopPropagation(); enroll.mutate(c.id); }}
                            disabled={enroll.isPending}
                          >
                            <Plus className="h-4 w-4" />
                            Daftar Kursus
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}

              {!enrolledCourses?.length && !unenrolledCourses.length && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Kursus</h3>
                    <p className="text-muted-foreground font-body">Belum ada kursus yang tersedia saat ini.</p>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
};

export default CoursesPage;