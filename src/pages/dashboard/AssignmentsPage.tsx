import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Calendar, Upload, Plus, Trash2, FileText, Paperclip } from "lucide-react";
import GradeSubmissionsDialog from "@/components/assignments/GradeSubmissionsDialog";
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
import { useState, useRef } from "react";
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
  const [submitContent, setSubmitContent] = useState("");
  const [submitFile, setSubmitFile] = useState<File | null>(null);
  const [detailOpen, setDetailOpen] = useState<string | null>(null);
  const [detailContent, setDetailContent] = useState("");
  const [detailFile, setDetailFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const detailFileRef = useRef<HTMLInputElement>(null);

  const { data: courses } = useQuery({
    queryKey: ["courses-for-assignments"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data || [];
    },
  });

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

  const { data: assignmentDetails } = useQuery({
    queryKey: ["assignment-details"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_details")
        .select("*")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
  });

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
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

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

  const addDetail = useMutation({
    mutationFn: async (assignmentId: string) => {
      setUploading(true);
      let fileUrl: string | null = null;
      if (detailFile) {
        const path = `details/${assignmentId}/${Date.now()}_${detailFile.name}`;
        const { error: upErr } = await supabase.storage.from("assignments").upload(path, detailFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("assignments").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
      const existing = (assignmentDetails || []).filter(d => d.assignment_id === assignmentId);
      const { error } = await supabase.from("assignment_details").insert({
        assignment_id: assignmentId,
        content: detailContent || null,
        file_url: fileUrl,
        content_type: detailFile ? "file" : "text",
        sort_order: existing.length,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Detail tugas ditambahkan!" });
      queryClient.invalidateQueries({ queryKey: ["assignment-details"] });
      setDetailOpen(null);
      setDetailContent("");
      setDetailFile(null);
      setUploading(false);
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Gagal", description: e.message });
      setUploading(false);
    },
  });

  const submitAssignment = useMutation({
    mutationFn: async (assignmentId: string) => {
      if (!user) throw new Error("Not authenticated");
      setUploading(true);
      let fileUrl: string | null = null;
      if (submitFile) {
        const path = `submissions/${user.id}/${assignmentId}/${Date.now()}_${submitFile.name}`;
        const { error: upErr } = await supabase.storage.from("assignments").upload(path, submitFile);
        if (upErr) throw upErr;
        const { data: urlData } = supabase.storage.from("assignments").getPublicUrl(path);
        fileUrl = urlData.publicUrl;
      }
      const { error } = await supabase.from("assignment_submissions").insert({
        assignment_id: assignmentId,
        user_id: user.id,
        content: submitContent || null,
        file_url: fileUrl,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Tugas berhasil dikumpulkan!" });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      setSubmitOpen(null);
      setSubmitContent("");
      setSubmitFile(null);
      setUploading(false);
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Gagal", description: e.message });
      setUploading(false);
    },
  });

  const getStatus = (assignmentId: string) => {
    const sub = submissions?.find((s) => s.assignment_id === assignmentId);
    if (!sub) return { label: "Belum Dikumpulkan", variant: "destructive" as const, score: null };
    if (sub.score !== null) return { label: "Dinilai", variant: "secondary" as const, score: sub.score };
    return { label: "Dikumpulkan", variant: "default" as const, score: null };
  };

  const getDetails = (assignmentId: string) => {
    return (assignmentDetails || []).filter(d => d.assignment_id === assignmentId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Tugas</h1>
          <p className="text-muted-foreground font-body mt-1">
            {isTeacherOrAdmin ? "Kelola tugas untuk siswa" : "Kelola dan kumpulkan tugas Anda"}
          </p>
        </div>
        {isTeacherOrAdmin && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Buat Tugas</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Buat Tugas Baru</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <Input placeholder="Judul tugas" value={title} onChange={(e) => setTitle(e.target.value)} />
                <Textarea placeholder="Deskripsi tugas" value={description} onChange={(e) => setDescription(e.target.value)} />
                <Select value={courseId} onValueChange={setCourseId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kursus" /></SelectTrigger>
                  <SelectContent>
                    {(courses || []).map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input type="datetime-local" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <Button onClick={() => createAssignment.mutate()} disabled={!title || !courseId || createAssignment.isPending} className="w-full">
                  Buat Tugas
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!assignments?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Tugas</h3>
            <p className="text-muted-foreground font-body">
              {isTeacherOrAdmin ? "Buat tugas pertama untuk siswa." : "Belum ada tugas yang tersedia."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {assignments.map((a: any) => {
            const s = getStatus(a.id);
            const details = getDetails(a.id);
            return (
              <Card key={a.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <ClipboardCheck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <h3 className="font-heading font-semibold">{a.title}</h3>
                        <p className="text-sm text-muted-foreground font-body">{a.courses?.title}</p>
                        {a.description && <p className="text-xs text-muted-foreground mt-1">{a.description}</p>}
                        {a.deadline && (
                          <p className="text-xs text-muted-foreground font-body flex items-center gap-1 mt-1">
                            <Calendar className="h-3 w-3" /> Deadline: {format(new Date(a.deadline), "dd MMM yyyy HH:mm")}
                          </p>
                        )}
                        {/* Assignment details/questions */}
                        {details.length > 0 && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            <p className="text-xs font-semibold text-foreground">Detail Soal:</p>
                            {details.map((d: any, idx: number) => (
                              <div key={d.id} className="text-sm bg-muted/50 rounded-md p-2">
                                {d.content && <p className="whitespace-pre-wrap">{idx + 1}. {d.content}</p>}
                                {d.file_url && (
                                  <a href={d.file_url} target="_blank" rel="noopener noreferrer" className="text-primary text-xs flex items-center gap-1 mt-1 hover:underline">
                                    <Paperclip className="h-3 w-3" /> Lampiran
                                  </a>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.score !== null && (
                        <span className="font-heading font-bold text-lg text-accent">{s.score}</span>
                      )}
                      {!isTeacherOrAdmin && <Badge variant={s.variant}>{s.label}</Badge>}
                      {!isTeacherOrAdmin && s.label === "Belum Dikumpulkan" && (
                        <Dialog open={submitOpen === a.id} onOpenChange={(o) => setSubmitOpen(o ? a.id : null)}>
                          <DialogTrigger asChild>
                            <Button size="sm" className="gap-2"><Upload className="h-4 w-4" /> Kumpulkan</Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader><DialogTitle>Kumpulkan Tugas</DialogTitle></DialogHeader>
                            <div className="space-y-4">
                              <Textarea placeholder="Tulis jawaban..." value={submitContent} onChange={(e) => setSubmitContent(e.target.value)} rows={6} />
                              <div>
                                <label className="text-sm font-medium mb-1 block">Upload File (opsional)</label>
                                <Input
                                  type="file"
                                  ref={fileInputRef}
                                  onChange={(e) => setSubmitFile(e.target.files?.[0] || null)}
                                />
                                {submitFile && <p className="text-xs text-muted-foreground mt-1">{submitFile.name}</p>}
                              </div>
                              <Button
                                onClick={() => submitAssignment.mutate(a.id)}
                                disabled={(!submitContent && !submitFile) || uploading}
                                className="w-full"
                              >
                                {uploading ? "Mengunggah..." : "Kirim"}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      )}
                      {isTeacherOrAdmin && (
                        <>
                          <GradeSubmissionsDialog assignmentId={a.id} assignmentTitle={a.title} />
                          <Dialog open={detailOpen === a.id} onOpenChange={(o) => setDetailOpen(o ? a.id : null)}>
                            <DialogTrigger asChild>
                              <Button size="sm" variant="outline" className="gap-1">
                                <FileText className="h-4 w-4" /> Tambah Soal
                              </Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader><DialogTitle>Tambah Detail/Soal</DialogTitle></DialogHeader>
                              <div className="space-y-4">
                                <Textarea placeholder="Tulis soal atau instruksi..." value={detailContent} onChange={(e) => setDetailContent(e.target.value)} rows={4} />
                                <div>
                                  <label className="text-sm font-medium mb-1 block">Lampiran (opsional)</label>
                                  <Input
                                    type="file"
                                    ref={detailFileRef}
                                    onChange={(e) => setDetailFile(e.target.files?.[0] || null)}
                                  />
                                </div>
                                <Button
                                  onClick={() => addDetail.mutate(a.id)}
                                  disabled={(!detailContent && !detailFile) || uploading}
                                  className="w-full"
                                >
                                  {uploading ? "Mengunggah..." : "Tambahkan"}
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                          <Button size="sm" variant="destructive" onClick={() => deleteAssignment.mutate(a.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AssignmentsPage;