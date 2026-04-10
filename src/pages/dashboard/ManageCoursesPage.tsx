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

const ManageCoursesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data: courses, isLoading } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("teacher_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("full_name").eq("id", user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const saveCourse = useMutation({
    mutationFn: async () => {
      if (editingId) {
        const { error } = await supabase.from("courses").update({ title, description, updated_at: new Date().toISOString() }).eq("id", editingId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("courses").insert({
          title,
          description,
          teacher_id: user!.id,
          teacher_name: profile?.full_name || "",
          status: "draft",
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editingId ? "Kursus diperbarui!" : "Kursus dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const publishCourse = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const newStatus = status === "published" ? "draft" : "published";
      const { error } = await supabase.from("courses").update({ status: newStatus }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-courses"] }),
  });

  const deleteCourse = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("courses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kursus dihapus!" });
      queryClient.invalidateQueries({ queryKey: ["teacher-courses"] });
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Kelola Kursus</h1>
          <p className="text-muted-foreground font-body mt-1">Buat dan kelola kursus Anda</p>
        </div>
        <Dialog open={open} onOpenChange={(v) => { if (!v) resetForm(); setOpen(v); }}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Buat Kursus</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">{editingId ? "Edit Kursus" : "Buat Kursus Baru"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Judul Kursus</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Matematika Paket B" />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Deskripsi singkat kursus..." />
              </div>
              <Button onClick={() => saveCourse.mutate()} disabled={!title.trim() || saveCourse.isPending} className="w-full">
                {saveCourse.isPending ? "Menyimpan..." : editingId ? "Perbarui" : "Buat Kursus"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      ) : courses?.length ? (
        <div className="space-y-3">
          {courses.map((c: any) => (
            <Card key={c.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/manage-courses/${c.id}`)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <BookOpen className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{c.title}</h3>
                      <p className="text-sm text-muted-foreground font-body line-clamp-1">{c.description || "Belum ada deskripsi"}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={c.status === "published" ? "default" : "secondary"}>
                      {c.status === "published" ? "Publik" : "Draft"}
                    </Badge>
                    <Button variant="ghost" size="icon" onClick={() => publishCourse.mutate({ id: c.id, status: c.status })}>
                      {c.status === "published" ? "📝" : "🚀"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEdit(c)}>
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteCourse.mutate(c.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Kursus</h3>
            <p className="text-muted-foreground font-body">Mulai buat kursus pertama Anda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageCoursesPage;