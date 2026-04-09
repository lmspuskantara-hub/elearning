import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  PlusCircle, BookOpen, Edit, Trash2, Users
} from "lucide-react";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ManageCoursesPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [studentId, setStudentId] = useState("");

  // ================= COURSES =================
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", user?.id, userRole],
    queryFn: async () => {
      if (!user) return [];

      let query = supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });

      if (!userRole?.isAdmin) {
        query = query.eq("teacher_id", user.id);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data;
    },
    enabled: !!user && !!userRole,
  });

  // ================= STUDENTS IN COURSE =================
  const { data: students } = useQuery({
    queryKey: ["course-students", selectedCourse],
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

  // ================= ADD STUDENT =================
  const addStudent = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("course_students")
        .insert({
          course_id: selectedCourse,
          student_id: studentId,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Siswa ditambahkan" });
      setStudentId("");
      queryClient.invalidateQueries({ queryKey: ["course-students"] });
    },
  });

  // ================= REMOVE STUDENT =================
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
      queryClient.invalidateQueries({ queryKey: ["course-students"] });
    },
  });

  // ================= SAVE COURSE =================
  const saveCourse = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase
          .from("courses")
          .update({ title, description })
          .eq("id", editingId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert({
          title,
          description,
          teacher_id: user.id,
          status: "draft",
        });

        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Berhasil disimpan" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setEditingId(null);
    },
  });

  // ================= DELETE COURSE =================
  const deleteCourse = useMutation({
    mutationFn: async (id) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kursus dihapus" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
    },
  });

  const canManage = userRole?.isAdmin || userRole?.isTeacher;

  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Kelola Kursus</h1>

        {canManage && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="h-4 w-4 mr-2" /> Buat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat / Edit Kursus</DialogTitle>
              </DialogHeader>

              <Input
                placeholder="Judul"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <Textarea
                placeholder="Deskripsi"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />

              <Button onClick={() => saveCourse.mutate()}>
                Simpan
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* LIST COURSE */}
      {isLoading ? (
        <Skeleton className="h-20 w-full" />
      ) : (
        courses?.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex justify-between items-center">
              
              <div onClick={() => setSelectedCourse(c.id)}>
                <h3 className="font-bold">{c.title}</h3>
                <p className="text-sm">{c.description}</p>
              </div>

              <div className="flex gap-2">
                <Button size="icon" onClick={() => deleteCourse.mutate(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>

                <Button size="icon" onClick={() => setSelectedCourse(c.id)}>
                  <Users className="h-4 w-4" />
                </Button>
              </div>

            </CardContent>
          </Card>
        ))
      )}

      {/* MANAGE STUDENTS */}
      {selectedCourse && canManage && (
        <Card>
          <CardHeader>
            <CardTitle>Kelola Siswa</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            <Input
              placeholder="Masukkan ID siswa"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
            />

            <Button onClick={() => addStudent.mutate()}>
              Tambah Siswa
            </Button>

            {/* LIST */}
            {students?.map((s) => (
              <div key={s.student_id} className="flex justify-between">
                <span>{s.profiles?.full_name}</span>

                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => removeStudent.mutate(s.student_id)}
                >
                  Hapus
                </Button>
              </div>
            ))}

          </CardContent>
        </Card>
      )}

    </div>
  );
};

export default ManageCoursesPage;
