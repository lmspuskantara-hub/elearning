import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Key, CheckCircle, QrCode, CameraOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Html5QrcodeScanner } from "html5-qrcode";

const AttendancePage = () => {
  const [code, setCode] = useState("");
  const [isScanning, setIsScanning] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // --- Query Riwayat Kehadiran ---
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

  // --- Mutation Check-in ---
  const checkIn = useMutation({
    mutationFn: async (targetCode: string) => {
      const activeCode = targetCode.toUpperCase();
      
      const { data: session, error: sessionError } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("unique_code", activeCode)
        .eq("is_active", true)
        .single();

      if (sessionError || !session) throw new Error("Kode tidak valid atau sesi ditutup.");
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
      toast({ title: "Berhasil check-in!" });
      setCode("");
      setIsScanning(false);
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  // --- Logic Scanner ---
useEffect(() => {
  let scanner: Html5QrcodeScanner | null = null;

  if (isScanning) {
    // Memberikan jeda sangat singkat agar Dialog selesai merender elemen "reader"
    const timer = setTimeout(() => {
      const element = document.getElementById("reader");
      
      if (element) {
        scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0 
          },
          /* verbose= */ false
        );

        scanner.render(
          (decodedText) => {
            checkIn.mutate(decodedText);
            // Tutup scanner setelah berhasil
            setIsScanning(false);
          },
          (error) => {
            // Abaikan error scanning rutin
          }
        );
      }
    }, 300); // Jeda 300ms untuk memastikan modal terbuka sempurna

    return () => {
      clearTimeout(timer);
      if (scanner) {
        scanner.clear().catch((error) => console.error("Failed to clear scanner:", error));
      }
    };
  }
}, [isScanning]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Absensi</h1>
        <p className="text-muted-foreground font-body mt-1">Check-in kehadiran dan lihat riwayat absensi</p>
      </div>

      <Card className="border-accent/20">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-accent" />
            Check-in Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col md:flex-row gap-3 max-w-xl">
            {/* Input Manual */}
            <div className="flex-1 flex gap-2">
              <Input
                placeholder="Masukkan kode"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="font-mono font-bold tracking-widest text-lg"
                maxLength={6}
              />
              <Button 
                onClick={() => checkIn.mutate(code)} 
                disabled={!code.trim() || checkIn.isPending}
                className="px-8"
              >
                {checkIn.isPending ? "..." : "Check-in"}
              </Button>
            </div>

            <div className="hidden md:flex items-center text-muted-foreground">atau</div>

            {/* Tombol Scan QR */}
            <Dialog open={isScanning} onOpenChange={setIsScanning}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2 border-accent text-accent hover:bg-accent/10">
                  <QrCode className="h-4 w-4" /> Scan QR
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>Scan QR Absensi</DialogTitle>
                </DialogHeader>
                <div className="flex flex-col items-center justify-center space-y-4">
                  <div id="reader" className="w-full overflow-hidden rounded-lg border-2 border-dashed border-muted"></div>
                  <Button variant="ghost" onClick={() => setIsScanning(false)} className="gap-2">
                    <CameraOff className="h-4 w-4" /> Batal
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
          <p className="text-xs text-muted-foreground font-body italic">Minta kode absensi atau QR Code dari guru Anda.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-accent" />
            Riwayat Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : records?.length ? (
            <div className="space-y-3">
              {records.map((r: any) => (
                <div key={r.id} className="flex items-center justify-between p-3 rounded-lg border bg-muted/10 hover:bg-muted/20 transition-colors">
                  <div>
                    <p className="font-body text-sm font-semibold text-primary">
                      {(r.attendance_sessions as any)?.title || "Sesi"}
                    </p>
                    <p className="text-[10px] md:text-xs text-muted-foreground">
                      {new Date(r.checked_in_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })} · {new Date(r.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge className="bg-green-600 gap-1">
                    <CheckCircle className="h-3 w-3" /> Hadir
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-muted-foreground">
               <UserCheck className="h-12 w-12 mx-auto mb-2 opacity-20" />
               <p className="text-sm italic">Belum ada riwayat kehadiran.</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;