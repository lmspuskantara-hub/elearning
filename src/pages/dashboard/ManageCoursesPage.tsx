import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, BookOpen, Edit, Trash2, User, ShieldCheck } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const ManageCoursesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // State untuk Modal & Form
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  // 1. Ambil Profil & Role secara paralel (Source of truth: user_roles)
  const { data: userData, isLoading: isLoadingUser } = useQuery({
    queryKey: ["user-metadata", user?.id],
    queryFn: async () => {
      const [profileRes, roleRes] = await Promise.all([
        supabase.from("profiles").select("full_name").eq("id", user!.id).single(),
        supabase.from("user_roles").select("role").eq("user_id", user!.id).single()
      ]);

      if (roleRes.error) console.error("Error fetching role:", roleRes.error);

      return {
        profile: profileRes.data,
        role: roleRes.data?.role || "teacher", // Default ke teacher jika tidak ditemukan
      };
    },
    enabled: !!user,
  });

  const isAdmin = userData?.role === "admin";
  const fullName = userData?.profile?.full_name || "Teacher";

  // 2. Query Data Kursus (Logika Admin vs Teacher)
  const { data: courses, isLoading: isLoadingCourses } = useQuery({
    queryKey: ["manage-courses", user?.id, isAdmin],
    queryFn: async () => {
      let query = supabase.from("courses").select("*");

      // JIKA BUKAN ADMIN: Hanya ambil kursus miliknya sendiri
      if (!isAdmin) {
        query = query.eq("teacher_id", user!.id);
      }

      const { data, error } = await query.order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && userData !== undefined,
  });

  // 3. Mutasi: Simpan/Update Kursus
  const saveCourse = useMutation({
    mutationFn: async () => {
      const courseData = {
        title,
        description,
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase
          .from("courses")
          .update(courseData)
          .eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert({
          ...courseData,
          teacher_id: user!.id,
          teacher_name: fullName,
          status: "draft",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Kursus diperbarui!" : "Kursus berhasil dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["manage-courses"] });
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  // 4. Mutasi: Publish/Draft Toggle
  const publishCourse = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "published" ? "draft" : "published";
      const { error } = await supabase.from("courses").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["manage-courses"] }),
  });

  // 5. Mutasi: Hapus Kursus
  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kursus berhasil dihapus!" });
      queryClient.invalidateQueries({ queryKey: ["manage-courses"] });
    },
  });

  const resetForm = () => {
    setTitle("");
    setDescription("");
    setEditingId(null);
    setOpen(false);
  };

  const handleEdit = (course: any) => {
    setTitle(course.title);
    setDescription(course.description || "");
    setEditingId(course.id);
    setOpen(true);
  };

  const isLoading = isLoadingUser || isLoadingCourses;

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
              {isAdmin ? "Manajemen Kursus Global" : "Kursus Saya"}
            </h1>
            {isAdmin && <Badge className="bg-orange-500 hover:bg-orange-600 gap-1"><ShieldCheck className="h-3 w-3"/> Admin Mode</Badge>}
          </div>
          <p className="text-muted-foreground font-body mt-1">
            {isAdmin 
              ? "Anda memiliki akses penuh untuk mengelola semua kursus di sistem." 
              : "Kelola materi dan publikasikan kursus Anda di sini."}
          </p>
        </div>

        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gap-2 shadow-sm">
              <PlusCircle className="h-4 w-4" /> 
              Buat Kursus
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">
                {editingId ? "Edit Detail Kursus" : "Tambah Kursus Baru"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Judul Kursus</Label>
                <Input 
                  id="title"
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  placeholder="Misal: Biologi Dasar Kelas X" 
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="desc">Deskripsi</Label>
                <Textarea 
                  id="desc"
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  placeholder="Jelaskan apa yang akan dipelajari siswa..."
                  rows={4}
                />
              </div>
              <Button 
                onClick={() => saveCourse.mutate()} 
                disabled={!title.trim() || saveCourse.isPending} 
                className="w-full"
              >
                {saveCourse.isPending ? "Sedang Menyimpan..." : editingId ? "Simpan Perubahan" : "Buat Kursus Sekarang"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-28 w-full rounded-xl" />)}
        </div>
      ) : courses && courses.length > 0 ? (
        <div className="grid gap-4">
          {courses.map((course: any) => (
            <Card 
              key={course.id} 
              className="group hover:border-primary/50 transition-all cursor-pointer overflow-hidden"
              onClick={() => navigate(`/dashboard/manage-courses/${course.id}`)}
            >
              <CardContent className="p-0">
                <div className="flex flex-col md:flex-row md:items-center justify-between p-5 gap-4">
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-white transition-colors">
                      <BookOpen className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <h3 className="font-heading font-bold text-lg leading-none">{course.title}</h3>
                      <p className="text-sm text-muted-foreground font-body line-clamp-1">
                        {course.description || "Tidak ada deskripsi tersedia."}
                      </p>
                      {isAdmin && (
                        <div className="flex items-center gap-1.5 text-xs font-medium text-amber-600 pt-1">
                          <User className="h-3 w-3" />
                          <span>Pengajar: {course.teacher_name || "N/A"}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center bg-muted/50 md:bg-transparent p-2 md:p-0 rounded-lg">
                    <Badge variant={course.status === "published" ? "default" : "secondary"} className="h-7">
                      {course.status === "published" ? "Published" : "Draft"}
                    </Badge>
                    
                    <div className="flex items-center border-l ml-2 pl-2 gap-1">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        title={course.status === "published" ? "Kembalikan ke Draft" : "Publikasikan"}
                        onClick={(e) => { e.stopPropagation(); publishCourse.mutate({ id: course.id, status: course.status }); }}
                      >
                        {course.status === "published" ? "📝" : "🚀"}
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={(e) => { e.stopPropagation(); handleEdit(course); }}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="hover:bg-destructive/10 hover:text-destructive"
                        onClick={(e) => { e.stopPropagation(); deleteCourse.mutate(course.id); }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed shadow-none">
          <CardContent className="py-20 text-center">
            <div className="bg-muted w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="font-heading font-semibold text-xl mb-2">Daftar Kursus Kosong</h3>
            <p className="text-muted-foreground font-body max-w-xs mx-auto">
              {isAdmin ? "Belum ada pengajar yang membuat kursus." : "Anda belum membuat kursus apapun. Klik tombol di atas untuk memulai."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageCoursesPage;