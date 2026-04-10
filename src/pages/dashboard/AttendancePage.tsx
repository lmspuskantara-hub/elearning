import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Key, CheckCircle, QrCode, CameraOff, History } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Html5Qrcode } from "html5-qrcode";

const AttendancePage = () => {
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Fetch Riwayat Kehadiran ---
  const { data: records, isLoading } = useQuery({
    queryKey: ["my-attendance", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("attendance_records")
        .select("*, attendance_sessions(title, course_id, courses(title))")
        .eq("user_id", user!.id)
        .order("checked_in_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // --- Fungsi Utama Check-in ---
  const checkIn = useMutation({
    mutationFn: async (targetCode: string) => {
      const activeCode = targetCode.toUpperCase().trim();
      
      const { data: session, error: sessionError } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("unique_code", activeCode)
        .eq("is_active", true)
        .single();

      if (sessionError || !session) throw new Error("Kode tidak valid atau sesi sudah ditutup.");
      
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        throw new Error("Sesi absensi sudah kadaluarsa.");
      }

      const { error } = await supabase.from("attendance_records").insert({
        session_id: session.id,
        user_id: user!.id,
      });

      if (error) {
        if (error.code === "23505") throw new Error("Anda sudah check-in di sesi ini.");
        throw error;
      }
    },
    onSuccess: () => {
      toast({ title: "Berhasil!", description: "Kehadiran Anda telah dicatat." });
      setCode("");
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => {
      toast({ variant: "destructive", title: "Gagal Check-in", description: e.message });
    },
  });

  // --- Logic Scanner (Kamera) ---
  useEffect(() => {
    let html5QrCode: Html5Qrcode | null = null;

    const startScanner = async () => {
      // Tunggu modal muncul sempurna
      await new Promise((resolve) => setTimeout(resolve, 400));
      
      const element = document.getElementById("reader");
      if (!element) return;

      html5QrCode = new Html5Qrcode("reader");

      try {
        await html5QrCode.start(
          { facingMode: "environment" }, // Kamera belakang
          {
            fps: 10,
            qrbox: { width: 250, height: 250 },
          },
          (decodedText) => {
            // Jika berhasil scan
            checkIn.mutate(decodedText);
            stopScanner();
          },
          () => { /* Ignored: scan failure is normal when no QR is in frame */ }
        );
      } catch (err) {
        console.error("Camera Error:", err);
        toast({
          variant: "destructive",
          title: "Kamera Gagal",
          description: "Pastikan izin kamera diberikan."
        });
        setIsScanning(false);
      }
    };

    const stopScanner = async () => {
      if (html5QrCode && html5QrCode.isScanning) {
        try {
          await html5QrCode.stop();
          html5QrCode.clear();
        } catch (err) {
          console.error("Stop Error:", err);
        }
      }
    };

    if (isScanning) {
      startScanner();
    }

    return () => {
      stopScanner();
    };
  }, [isScanning]);

  return (
    <div className="container mx-auto max-w-4xl py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-primary tracking-tight">Presensi Siswa</h1>
        <p className="text-muted-foreground mt-1">Silakan check-in untuk mencatat kehadiran Anda hari ini.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Bagian Input & Scan */}
        <div className="md:col-span-1 space-y-6">
          <Card className="border-primary/20 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Key className="h-5 w-5 text-primary" />
                Check-in
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Input
                  placeholder="Kode Manual"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  className="font-mono font-bold text-center text-xl tracking-[0.3em] h-12"
                  maxLength={6}
                />
                <Button 
                  className="w-full h-11" 
                  onClick={() => checkIn.mutate(code)}
                  disabled={!code.trim() || checkIn.isPending}
                >
                  {checkIn.isPending ? "Memproses..." : "Kirim Kode"}
                </Button>
              </div>

              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t" /></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-background px-2 text-muted-foreground">Atau</span></div>
              </div>

              <Dialog open={isScanning} onOpenChange={setIsScanning}>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full h-12 gap-2 border-primary/40 hover:bg-primary/5">
                    <QrCode className="h-5 w-5" /> Scan QR Code
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                    <DialogTitle>Arahkan Kamera ke QR Code</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-col items-center justify-center p-4">
                    <div 
                      id="reader" 
                      className="w-full bg-black rounded-xl overflow-hidden shadow-2xl"
                      style={{ minHeight: '300px' }}
                    ></div>
                    <Button 
                      variant="ghost" 
                      onClick={() => setIsScanning(false)} 
                      className="mt-6 gap-2 text-destructive hover:bg-destructive/10"
                    >
                      <CameraOff className="h-4 w-4" /> Matikan Kamera
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        </div>

        {/* Bagian Riwayat */}
        <div className="md:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-lg flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                Riwayat Kehadiran
              </CardTitle>
              <Badge variant="outline" className="font-normal">{records?.length || 0} Sesi</Badge>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full rounded-xl" />)}
                </div>
              ) : records?.length ? (
                <div className="space-y-4">
                  {records.map((r: any) => (
                    <div key={r.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:shadow-md transition-all">
                      <div className="space-y-1">
                        <p className="font-semibold text-primary leading-none">
                          {(r.attendance_sessions as any)?.title || "Pertemuan"}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(r.checked_in_at).toLocaleDateString("id-ID", { 
                            weekday: 'long', 
                            day: 'numeric', 
                            month: 'long' 
                          })} • {new Date(r.checked_in_at).toLocaleTimeString("id-ID", { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                         <div className="text-right hidden sm:block">
                            <p className="text-[10px] font-bold text-green-600 uppercase">Tercatat</p>
                         </div>
                         <CheckCircle className="h-6 w-6 text-green-500" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <UserCheck className="h-12 w-12 mx-auto mb-4 text-muted-foreground/30" />
                  <p className="text-muted-foreground font-medium">Belum ada riwayat check-in.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AttendancePage;