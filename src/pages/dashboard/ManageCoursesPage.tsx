import { useState } from "react";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PlusCircle, Trash2, Users
} from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";

const ManageCoursesPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentId, setStudentId] = useState("");

  const isAdmin = userRole?.isAdmin;
  const isTeacher = userRole?.isTeacher;
  const isStudent = !isAdmin && !isTeacher;

  // ================= COURSES =================
  const { data: courses = [] } = useQuery({
    queryKey: ["courses", user?.id, userRole],
    queryFn: async () => {
      if (!user) return [];

      // ADMIN → semua kursus
      if (isAdmin) {
        const { data, error } = await supabase.from("courses").select("*");
        if (error) throw error;
        return data;
      }

      // GURU → kursus milik dia
      if (isTeacher) {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("teacher_id", user.id);

        if (error) throw error;
        return data;
      }

      // SISWA → kursus yang diikuti
      const { data, error } = await supabase
        .from("course_students")
        .select("courses(*)")
        .eq("student_id", user.id);

      if (error) throw error;

      return data.map((d) => d.courses);
    },
    enabled: !!user && !!userRole,
  });

  // ================= STUDENTS =================
  const { data: students = [] } = useQuery({
    queryKey: ["students", selectedCourse],
    queryFn: async () => {
      if (!selectedCourse) return [];

      const { data, error } = await supabase
        .from("course_students")
        .select("student_id, profiles(full_name)")
        .eq("course_id", selectedCourse);

      if (error) throw error;
      return data;
    },
    enabled: !!selectedCourse,
  });

  // ================= ADD =================
  const addStudent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("course_students").insert({
        course_id: selectedCourse,
        student_id: studentId,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Siswa ditambahkan" });
      setStudentId("");
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  // ================= REMOVE =================
  const removeStudent = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase
        .from("course_students")
        .delete()
        .eq("course_id", selectedCourse)
        .eq("student_id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Siswa dihapus" });
      queryClient.invalidateQueries({ queryKey: ["students"] });
    },
  });

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <h1 className="text-2xl font-bold">Kursus</h1>

      {/* LIST COURSE */}
      {courses.map((c) => (
        <Card key={c.id}>
          <CardContent className="flex justify-between items-center">

            <div onClick={() => setSelectedCourse(c.id)}>
              <h3 className="font-bold">{c.title}</h3>
              <p className="text-sm text-muted-foreground">{c.description}</p>
            </div>

            <Button size="icon" onClick={() => setSelectedCourse(c.id)}>
              <Users className="h-4 w-4" />
            </Button>

          </CardContent>
        </Card>
      ))}

      {/* STUDENT SECTION */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Siswa</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            {/* ADMIN ONLY */}
            {isAdmin && (
              <>
                <Input
                  placeholder="Masukkan ID siswa"
                  value={studentId}
                  onChange={(e) => setStudentId(e.target.value)}
                />

                <Button onClick={() => addStudent.mutate()}>
                  Tambah Siswa
                </Button>
              </>
            )}

            {/* LIST SISWA */}
            {students.map((s) => (
              <div key={s.student_id} className="flex justify-between">

                <span>{s.profiles?.full_name}</span>

                {/* HANYA ADMIN */}
                {isAdmin && (
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => removeStudent.mutate(s.student_id)}
                  >
                    Hapus
                  </Button>
                )}
              </div>
            ))}

          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default ManageCoursesPage;
