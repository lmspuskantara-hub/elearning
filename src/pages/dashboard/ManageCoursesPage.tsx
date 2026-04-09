import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, BookOpen, Edit, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserRole } from "@/hooks/use-role";

const ManageCoursesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: userRole } = useUserRole();

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);

  const [selectedCourse, setSelectedCourse] = useState(null);
  const [selectedStudent, setSelectedStudent] = useState("");
  const [searchStudent, setSearchStudent] = useState("");

  // ================= COURSES =================
  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses", user?.id, userRole],
    queryFn: async () => {
      if (!user) return [];

      if (userRole?.isAdmin) {
        const { data, error } = await supabase.from("courses").select("*").order("created_at", { ascending: false });
        if (error) throw error;
        return data;
      }

      if (userRole?.isTeacher) {
        const { data, error } = await supabase
          .from("courses")
          .select("*")
          .eq("teacher_id", user.id)
          .order("created_at", { ascending: false });

        if (error) throw error;
        return data;
      }

      const { data, error } = await supabase
        .from("course_students")
        .select("courses(*)")
        .eq("student_id", user.id);

      if (error) throw error;
      return data.map((d) => d.courses);
    },
    enabled: !!user && !!userRole,
  });

  // ================= PROFILE =================
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("full_name")
        .eq("id", user.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  // ================= ALL STUDENTS =================
  const { data: allStudents } = useQuery({
    queryKey: ["all-students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("role", "student");

      if (error) throw error;
      return data;
    },
  });

  // ================= FILTER SEARCH =================
  const filteredStudents = allStudents?.filter((s) =>
    s.full_name.toLowerCase().includes(searchStudent.toLowerCase())
  );

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
          teacher_name: profile?.full_name || "",
          status: "draft",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Berhasil disimpan" });
      queryClient.invalidateQueries({ queryKey: ["courses"] });
      resetForm();
    },
  });

  // ================= ADD STUDENT =================
  const addStudent = useMutation({
    mutationFn: async () => {
      const exists = students?.some((s) => s.student_id === selectedStudent);
      if (exists) throw new Error("Siswa sudah ada di kursus");

      const { error } = await supabase.from("course_students").insert({
        course_id: selectedCourse,
        student_id: selectedStudent,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setSelectedStudent("");
      setSearchStudent("");
      queryClient.invalidateQueries({ queryKey: ["course-students"] });
    },
    onError: (e) => {
      toast({ variant: "destructive", title: "Error", description: e.message });
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
      queryClient.invalidateQueries({ queryKey: ["course-students"] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (course) => {
    setTitle(course.title);
    setDescription(course.description || "");
    setEditingId(course.id);
    setOpen(true);
  };

  return (
    <div className="space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Kelola Kursus</h1>
        </div>

        {(userRole?.isAdmin || userRole?.isTeacher) && (
          <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
            <DialogTrigger asChild>
              <Button><PlusCircle className="h-4 w-4" /> Buat Kursus</Button>
            </DialogTrigger>

            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingId ? "Edit" : "Buat"} Kursus</DialogTitle>
              </DialogHeader>

              <div className="space-y-2">
                <Label>Judul</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>

              <Button onClick={() => saveCourse.mutate()}>
                Simpan
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* COURSES */}
      {isLoading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        courses?.map((c) => (
          <Card key={c.id} onClick={() => setSelectedCourse(c.id)}>
            <CardContent className="flex justify-between">
              <div>
                <h3>{c.title}</h3>
                <p>{c.description}</p>
              </div>
            </CardContent>
          </Card>
        ))
      )}

      {/* STUDENTS */}
      {selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle>Daftar Siswa</CardTitle>
          </CardHeader>

          <CardContent className="space-y-3">

            {userRole?.isAdmin && (
              <div className="space-y-2">
                <Input
                  placeholder="Cari siswa..."
                  value={searchStudent}
                  onChange={(e) => setSearchStudent(e.target.value)}
                />

                <div className="border rounded max-h-40 overflow-y-auto">
                  {filteredStudents?.map((s) => (
                    <div
                      key={s.id}
                      onClick={() => {
                        setSelectedStudent(s.id);
                        setSearchStudent(s.full_name);
                      }}
                      className={`p-2 cursor-pointer hover:bg-gray-100 ${
                        selectedStudent === s.id ? "bg-gray-200" : ""
                      }`}
                    >
                      {s.full_name}
                    </div>
                  ))}
                </div>

                <Button onClick={() => addStudent.mutate()} disabled={!selectedStudent}>
                  Tambah Siswa
                </Button>
              </div>
            )}

            {students?.map((s) => (
              <div key={s.student_id} className="flex justify-between">
                <span>{s.profiles?.full_name}</span>

                {userRole?.isAdmin && (
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
