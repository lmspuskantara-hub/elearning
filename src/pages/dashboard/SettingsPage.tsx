import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Settings, Shield, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";

const SettingsPage = () => {
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [fullName, setFullName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // 👁️ show/hide password
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // ================= PROFILE =================
  const { data: profile } = useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

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
      if (!user) throw new Error("User tidak ditemukan");

      const { error } = await supabase
        .from("profiles")
        .update({
          full_name: fullName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Profil diperbarui!" });
      queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  // ================= PASSWORD =================
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
    onError: (err) => {
      toast({
        title: "Gagal mengganti password",
        description: err.message,
        variant: "destructive",
      });
    },
  });

  // ================= UI =================
  return (
    <div className="space-y-6">
      
      {/* HEADER */}
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">
          Pengaturan
        </h1>
        <p className="text-muted-foreground font-body mt-1">
          Kelola profil dan preferensi akun Anda
        </p>
      </div>

      {/* PROFIL */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5 text-accent" />
            Profil
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 max-w-md">
          <div className="space-y-2">
            <Label>Nama Lengkap</Label>
            <Input
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Nama lengkap"
            />
          </div>

          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={user?.email || ""} disabled />
          </div>

          <Button
            onClick={() => updateProfile.mutate()}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? "Menyimpan..." : "Simpan Perubahan"}
          </Button>
        </CardContent>
      </Card>

      {/* KEAMANAN */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-accent" />
            Keamanan Akun
          </CardTitle>
        </CardHeader>

        <CardContent className="space-y-4 max-w-md">
          
          {/* PASSWORD BARU */}
          <div className="space-y-2">
            <Label>Password Baru</Label>

            <div className="relative">
              <Input
                type={showPassword ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Masukkan password baru"
                className="pr-10"
              />

              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          {/* KONFIRMASI PASSWORD */}
          <div className="space-y-2">
            <Label>Konfirmasi Password</Label>

            <div className="relative">
              <Input
                type={showConfirmPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Ulangi password"
                className="pr-10"
              />

              <button
                type="button"
                onClick={() =>
                  setShowConfirmPassword(!showConfirmPassword)
                }
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
              >
                {showConfirmPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <Button
            onClick={() => changePassword.mutate()}
            disabled={changePassword.isPending}
          >
            {changePassword.isPending ? "Mengganti..." : "Ganti Password"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SettingsPage;
