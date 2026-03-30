import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Shield } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole, useSwitchRole } from "@/hooks/use-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const switchRole = useSwitchRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [fullName, setFullName] = useState("");
const [newPassword, setNewPassword] = useState("");
const [confirmPassword, setConfirmPassword] = useState("");
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("*").eq("id", user!.id).single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  useEffect(() => {
    if (profile) setFullName(profile.full_name || "");
  }, [profile]);

  const updateProfile = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("profiles").update({ full_name: fullName, updated_at: new Date().toISOString() }).eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profil diperbarui!" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  const changePassword = useMutation({
  mutationFn: async () => {
    if (newPassword.length < 6) {
      throw new Error("Password minimal 6 karakter");
    }

    if (newPassword !== confirmPassword) {
      throw new Error("Konfirmasi password tidak cocok");
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) throw error;
  },
  onSuccess: () => {
    setNewPassword("");
    setConfirmPassword("");

    toast({
      title: "Password berhasil diganti",
      description: "Gunakan password baru saat login berikutnya.",
    });
  },
  onError: (err: any) => {
    toast({
      title: "Gagal mengganti password",
      description: err.message,
      variant: "destructive",
    });
  },
});

  const handleBecomeTeacher = () => {
    switchRole.mutate("teacher", {
      onSuccess: () => toast({ title: "Berhasil!", description: "Anda sekarang memiliki akses guru." }),
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Pengaturan</h1>
        <p className="text-muted-foreground font-body mt-1">Kelola profil dan preferensi akun Anda</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            Profil
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nama lengkap" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={user?.email || ""} disabled />
          </div>
          <Button onClick={() => updateProfile.mutate()} disabled={updateProfile.isPending}>
            {updateProfile.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Role / Peran
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 max-w-md">
          <div className="text-sm font-body">
            <p>Peran Anda saat ini: <strong>{userRole?.isTeacher ? "Guru" : "Siswa"}</strong></p>
          </div>
          {!userRole?.isTeacher && (
            <Button variant="outline" onClick={handleBecomeTeacher} disabled={switchRole.isPending}>
              {switchRole.isPending ? "Memproses..." : "Daftar sebagai Guru"}
            </Button>
          )}
          <Card>
  <CardHeader>
    <CardTitle className="font-heading text-lg flex items-center gap-2">
      <Shield className="h-5 w-5 text-accent" />
      Keamanan Akun
    </CardTitle>
  </CardHeader>

  <CardContent className="space-y-4 max-w-md">
    <div className="space-y-2">
      <Label>Password Baru</Label>
      <Input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="Masukkan password baru"
      />
    </div>

    <div className="space-y-2">
      <Label>Konfirmasi Password</Label>
      <Input
        type="password"
        value={confirmPassword}
        onChange={(e) => setConfirmPassword(e.target.value)}
        placeholder="Ulangi password"
      />
    </div>

    <Button
      onClick={() => changePassword.mutate()}
      disabled={changePassword.isPending}
    >
      {changePassword.isPending
        ? "Mengganti..."
        : "Ganti Password"}
    </Button>
  </CardContent>
</Card>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
