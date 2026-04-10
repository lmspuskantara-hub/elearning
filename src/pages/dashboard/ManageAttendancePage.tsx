import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  PlusCircle, UserCheck, Copy, Users, 
  QrCode as QrCodeIcon, Download, ArrowLeft 
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { QRCodeSVG } from "qrcode.react";

const ManageAttendancePage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [expiresInMinutes, setExpiresInMinutes] = useState(60);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  // --- Queries ---
  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("id, title")
        .eq("teacher_id", user!.id);
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

  // --- Realtime Subscription ---
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

  // --- Functions ---
  const generateCode = () => Math.random().toString(36).substring(2, 8).toUpperCase();

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
  });

  const toggleSession = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      await supabase.from("attendance_sessions").update({ is_active: !isActive }).eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-attendance-sessions"] }),
  });

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: "Kode disalin!" });
  };

  const downloadQRCode = (code: string) => {
    const svg = document.getElementById("qr-code-ui");
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `QR-Absensi-${code}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };
    img.src = "data:image/svg+xml;base64," + btoa(svgData);
  };

  // --- View: Detail Sesi (QR Mode) ---
  if (selectedSessionId) {
    const session = sessions?.find((s: any) => s.id === selectedSessionId);
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedSessionId(null)} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Kembali
        </Button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Kolom QR Code */}
          <div className="lg:col-span-1 space-y-4">
            <Card className="border-primary/20 shadow-sm overflow-hidden">
              <CardHeader className="bg-primary/5 pb-4">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <QrCodeIcon className="h-4 w-4 text-primary" />
                  QR Code Presensi
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col items-center pt-6 space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-inner border border-muted">
                  <QRCodeSVG
                    id="qr-code-ui"
                    value={session?.unique_code || ""}
                    size={220}
                    level={"H"}
                    includeMargin={false}
                  />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-xs text-muted-foreground uppercase tracking-widest font-medium">Kode Akses Manual</p>
                  <p className="text-3xl font-mono font-bold text-primary">{session?.unique_code}</p>
                </div>
                <div className="flex w-full gap-2">
                  <Button variant="outline" className="flex-1 gap-2" onClick={() => downloadQRCode(session?.unique_code)}>
                    <Download className="h-4 w-4" /> Unduh
                  </Button>
                  <Button variant="outline" className="h-10 w-10 p-0" onClick={() => copyCode(session?.unique_code)}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Kolom Daftar Hadir */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl font-bold text-primary">{session?.title}</h1>
                <p className="text-sm text-muted-foreground">Kelola kehadiran siswa secara real-time</p>
              </div>
              <Badge variant={session?.is_active ? "default" : "secondary"} className="w-fit h-7 px-4">
                {session?.is_active ? "Sesi Sedang Berjalan" : "Sesi Ditutup"}
              </Badge>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Siswa Hadir ({records?.length || 0})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {records?.length ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {records.map((r: any) => (
                      <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold">
                            {r.profiles?.full_name?.substring(0, 2).toUpperCase()}
                          </div>
                          <span className="text-sm font-medium">{r.profiles?.full_name || "Siswa"}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground">{new Date(r.checked_in_at).toLocaleTimeString("id-ID")}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p className="text-sm italic">Belum ada siswa yang melakukan check-in...</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // --- View: Daftar Sesi ---
  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary">Kelola Absensi</h1>
          <p className="text-muted-foreground">Buat dan pantau sesi kehadiran kelas Anda</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 h-11"><PlusCircle className="h-4 w-4" /> Buat Sesi Baru</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Konfigurasi Absensi</DialogTitle></DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Pertemuan / Sesi</Label>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Contoh: Pertemuan 5 - Logaritma" />
              </div>
              <div className="space-y-2">
                <Label>Kursus / Kelas</Label>
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                  <SelectTrigger><SelectValue placeholder="Pilih kelas" /></SelectTrigger>
                  <SelectContent>
                    {courses?.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Durasi Aktif (Menit)</Label>
                <Input type="number" value={expiresInMinutes} onChange={(e) => setExpiresInMinutes(parseInt(e.target.value) || 60)} />
              </div>
              <Button 
                onClick={() => createSession.mutate()} 
                disabled={!title.trim() || !selectedCourseId || createSession.isPending} 
                className="w-full"
              >
                {createSession.isPending ? "Sedang Memproses..." : "Terbitkan Sesi"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-32 w-full" /><Skeleton className="h-32 w-full" />
        </div>
      ) : sessions?.length ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {sessions.map((s: any) => (
            <Card key={s.id} className="hover:border-primary/50 transition-all cursor-pointer group" onClick={() => setSelectedSessionId(s.id)}>
              <CardContent className="p-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${s.is_active ? 'bg-green-100 text-green-600' : 'bg-muted text-muted-foreground'}`}>
                    <UserCheck className="h-6 w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-primary">{s.title}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-sm font-mono font-bold bg-muted px-2 py-0.5 rounded text-accent">{s.unique_code}</span>
                      <span className="text-xs text-muted-foreground">{s.attendance_records?.[0]?.count || 0} Siswa Hadir</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2" onClick={(e) => e.stopPropagation()}>
                  <Badge variant={s.is_active ? "default" : "secondary"}>
                    {s.is_active ? "Aktif" : "Tutup"}
                  </Badge>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => toggleSession.mutate({ id: s.id, isActive: s.is_active })}>
                      {s.is_active ? "🚫" : "🔓"}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyCode(s.unique_code)}>
                      <Copy className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-20 text-center text-muted-foreground">
            <UserCheck className="h-12 w-12 mx-auto mb-4 opacity-20" />
            <p>Belum ada riwayat absensi. Mulai dengan membuat sesi baru!</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageAttendancePage;