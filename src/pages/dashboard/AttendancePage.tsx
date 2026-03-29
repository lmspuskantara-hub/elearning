import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserCheck, Key, CheckCircle, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const AttendancePage = () => {
  const [code, setCode] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

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

  const checkIn = useMutation({
    mutationFn: async () => {
      // Find session by code
      const { data: session, error: sessionError } = await supabase
        .from("attendance_sessions")
        .select("*")
        .eq("unique_code", code.toUpperCase())
        .eq("is_active", true)
        .single();

      if (sessionError || !session) throw new Error("Kode absensi tidak valid atau sudah ditutup.");

      // Check expiry
      if (session.expires_at && new Date(session.expires_at) < new Date()) {
        throw new Error("Sesi absensi sudah kadaluarsa.");
      }

      // Check-in
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
      queryClient.invalidateQueries({ queryKey: ["my-attendance"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Absensi</h1>
        <p className="text-muted-foreground font-body mt-1">Check-in kehadiran dan lihat riwayat absensi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Key className="h-5 w-5 text-accent" />
            Check-in Kehadiran
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 max-w-md">
            <Input
              placeholder="Masukkan kode absensi"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              className="font-mono font-bold tracking-wider"
              maxLength={6}
            />
            <Button onClick={() => checkIn.mutate()} disabled={!code.trim() || checkIn.isPending}>
              {checkIn.isPending ? "..." : "Check-in"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 font-body">Minta kode absensi dari guru Anda</p>
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
                <div key={r.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="font-body text-sm font-medium">
                      {(r.attendance_sessions as any)?.title || "Sesi"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(r.checked_in_at).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })} · {new Date(r.checked_in_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                  </div>
                  <Badge variant="default" className="gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Hadir
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-body">Belum ada riwayat kehadiran.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AttendancePage;
