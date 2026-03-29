import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, Upload, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { format } from "date-fns";

const AssignmentsPage = () => {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isTeacherOrAdmin = roleData?.isTeacher || roleData?.isAdmin;

  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState("");
  const [courseId, setCourseId] = useState("");

  const [submitOpen, setSubmitOpen] = useState<string | null>(null);
  const [submitFile, setSubmitFile] = useState<File | null>(null);

  // Courses
  const { data: courses } = useQuery({
    queryKey: ["courses-for-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data || [];
    },
  });

  // Assignments
  const { data: assignments, isLoading } = useQuery({
    queryKey: ["assignments"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignments")
        .select("*, courses(title)")
        .order("deadline", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Submissions
  const { data: submissions } = useQuery({
    queryKey: ["my-submissions", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("user_id", user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Create
  const createAssignment = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("assignments").insert({
        title,
        description,
        deadline: deadline || null,
        course_id: courseId,
        created_by: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tugas berhasil dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
      setOpen(false);
      setTitle("");
      setDescription("");
      setDeadline("");
      setCourseId("");
    },
  });

  // Delete
  const deleteAssignment = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("assignments").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tugas dihapus" });
      queryClient.invalidateQueries({ queryKey: ["assignments"] });
    },
  });

  // Submit (UPLOAD FILE)
  const submitAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user) throw new Error("Not authenticated");
      if (!submitFile) throw new Error("File belum dipilih");

      const fileExt = submitFile.name.split(".").pop();
      const filePath = `${user.id}/${assignmentId}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("assignment-files")
        .upload(filePath, submitFile);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("assignment-files")
        .getPublicUrl(filePath);

      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: assignmentId,
        user_id: user.id,
        file_url: data.publicUrl,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tugas berhasil dikumpulkan!" });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      setSubmitOpen(null);
      setSubmitFile(null);
    },
    onError: (e: any) =>
      toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const getStatus = (assignmentId: string) => {
    const sub = submissions?.find((s) => s.assignment_id === assignmentId);
    if (!sub) return { label: "Belum Dikumpulkan", variant: "destructive" as const, score: null };
    if (sub.score !== null) return { label: "Dinilai", variant: "secondary" as const, score: sub.score };
    return { label: "Dikumpulkan", variant: "default" as const, score: null };
  };

  if (isLoading) {
    return <Skeleton className="h-24 w-full" />;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Tugas</h1>

        {isTeacherOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button><Plus /> Buat</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Tugas</DialogTitle></DialogHeader>

              <Input placeholder="Judul" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Deskripsi" value={description} onChange={(e) => setDescription(e.target.value)} />

              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Pilih kursus" /></SelectTrigger>
                <SelectContent>
                  {(courses || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />

              <Button onClick={() => createAssignment.mutate()}>
                Simpan
              </Button>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {assignments?.map((a: any) => {
        const s = getStatus(a.id);

        return (
          <Card key={a.id}>
            <CardContent className="flex justify-between items-center">
              <div>
                <h1>{a.title}</h1>
                <h1>{a.courses?.title}</h1>
                {a.deadline && <p>{format(new Date(a.deadline), "dd MMM yyyy HH:mm")}</p>}
              </div>

              <div className="flex gap-2">
                {!isTeacherOrAdmin && (
                  <Dialog open={submitOpen === a.id} onOpenChange={(o) => setSubmitOpen(o ? a.id : null)}>
                    <DialogTrigger asChild>
                      <Button size="lg"><Upload /> Upload</Button>
                    </DialogTrigger>

                    <DialogContent>
                      <DialogHeader><DialogTitle>Kumpulkan</DialogTitle></DialogHeader>

                      <Input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                      />

                      <Button
                        onClick={() => submitAssignment.mutate(a.id)}
                        disabled={!submitFile}
                      >
                        Kirim
                      </Button>
                    </DialogContent>
                  </Dialog>
                )}

                {isTeacherOrAdmin && (
                  <Button size="sm" onClick={() => deleteAssignment.mutate(a.id)}>
                    <Trash2 />
                  </Button>
                )}

                <Badge>{s.label}</Badge>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

export default AssignmentsPage;