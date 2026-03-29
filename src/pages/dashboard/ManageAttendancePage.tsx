import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PlusCircle, UserCheck, Copy, Users } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useEffect } from "react";

const ManageAttendancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").eq("teacher_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: sessions, isLoading } = useQuery({
    queryKey: ["teacher-attendance-sessions", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_sessions")
        .select("*, attendance_records(count)")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const { data: records } = useQuery({
    queryKey: ["attendance-records", selectedSessionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, profiles:user_id(full_name)")
        .eq("session_id", selectedSessionId!);
      if (error) throw error;
      return data;
    },
    enabled: !!selectedSessionId,
  });

  // Realtime subscription for attendance records
  useEffect(() => {
    if (!selectedSessionId) return;
    const channel = supabase
      .channel(`attendance-${selectedSessionId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "attendance_records",
        filter: `session_id=eq.${selectedSessionId}`,
      }, () => {
        queryClient.invalidateQueries({ queryKey: ["attendance-records", selectedSessionId] });
        queryClient.invalidateQueries({ queryKey: ["teacher-attendance-sessions"] });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedSessionId, queryClient]);

  const generateCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };

  const createSession = useMutation({
    mutationFn: async () => {
      const code = generateCode();
      const expiresAt = new Date(Date.now() + expiresInMinutes * 60 * 1000).toISOString();
      const { error } = await supabase.from("attendance_sessions").insert({
        course_id: selectedCourseId,
        title,
        unique_code: code,
        created_by: user!.id,
        expires_at: expiresAt,
      });
      if (error) throw error;
      return code;
    },
    onSuccess: (code) => {
      toast({ title: "Sesi absensi dibuat!", description: `Kode: ${code}` });
      queryClient.invalidateQueries({ queryKey: ["teacher-attendance-sessions"] });
      setOpen(false);
      setTitle("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const toggleSession = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      const { error } = await supabase.from("attendance_sessions").update({ is_active: !isActive }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-attendance-sessions"] }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Kode disalin!" });
  };

  if (selectedSessionId) {
    const session = sessions?.find((s: any) => s.id === selectedSessionId);
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedSessionId(null)}>← Kembali</Button>
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">{session?.title}</h1>
          <div className="flex items-center gap-3 mt-2">
            <Badge variant={session?.is_active ? "default" : "secondary"}>
              {session?.is_active ? "Aktif" : "Selesai"}
            </Badge>
            <span className="text-lg font-mono font-bold text-accent">{session?.unique_code}</span>
            <Button variant="ghost" size="icon" onClick={() => copyCode(session?.unique_code || "")}>
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="font-heading text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-accent" />
              Siswa Hadir ({records?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {records?.length ? (
              <div className="space-y-2">
                {records.map((r: any) => (
                  <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                    <span className="font-body text-sm">{(r.profiles as any)?.full_name || "Siswa"}</span>
                    <span className="text-xs text-muted-foreground">{new Date(r.checked_in_at).toLocaleTimeString("id-ID")}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground font-body">Belum ada siswa yang check-in.</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Kelola Absensi</h1>
          <p className="text-muted-foreground font-body mt-1">Buat sesi absensi dengan kode unik</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Buat Sesi</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Buat Sesi Absensi</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Judul Sesi</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Pertemuan 1 - Bahasa Indonesia" />
              </div>
              {courses?.length ? (
                <div className="space-y-2">
                  <Label>Kursus</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger><SelectValue placeholder="Pilih kursus" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="space-y-2">
                <Label>Berlaku (menit)</Label>
                <Input type="number" value={expiresInMinutes} onChange={(e) => setExpiresInMinutes(parseInt(e.target.value) || 60)} />
              </div>
              <Button onClick={() => createSession.mutate()} disabled={!title.trim() || !selectedCourseId || createSession.isPending} className="w-full">
                {createSession.isPending ? "Membuat..." : "Buat & Generate Kode"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : sessions?.length ? (
        <div className="space-y-3">
          {sessions.map((s: any) => (
            <Card key={s.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedSessionId(s.id)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <UserCheck className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{s.title}</h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-mono font-bold text-accent">{s.unique_code}</span>
                        <span className="text-xs text-muted-foreground">{s.attendance_records?.[0]?.count || 0} hadir</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={s.is_active ? "default" : "secondary"}>
                      {s.is_active ? "Aktif" : "Selesai"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => toggleSession.mutate({ id: s.id, isActive: s.is_active })}>
                      {s.is_active ? "Tutup" : "Buka"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => copyCode(s.unique_code)}>
                      <Copy className="h-4 w-4" />
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
            <UserCheck className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Sesi</h3>
            <p className="text-muted-foreground font-body">Buat sesi absensi pertama Anda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageAttendancePage;
