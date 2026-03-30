import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, UserPlus, Trash2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const AdminUsersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("student");
  const [passwordUserId, setPasswordUserId] = useState<string | null>(null);
const [newUserPassword, setNewUserPassword] = useState("");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data: profiles, error } = await supabase
        .from("profiles")
        .select("id, full_name, avatar_url, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;

      const { data: roles } = await supabase
        .from("user_roles")
        .select("user_id, role");

      return (profiles || []).map((p) => ({
        ...p,
        roles: (roles || []).filter((r) => r.user_id === p.id).map((r) => r.role),
      }));
    },
  });

  const createUser = useMutation({
    mutationFn: async () => {
      // Use edge function to create user (needs service role)
      const response = await supabase.functions.invoke("admin-create-user", {
        body: { email: newEmail, password: newPassword, fullName: newName, role: newRole },
      });
      if (response.error) throw response.error;
      if (response.data?.error) throw new Error(response.data.error);
    },
    onSuccess: () => {
      toast({ title: "Pengguna berhasil dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      setNewEmail("");
      setNewName("");
      setNewPassword("");
      setNewRole("student");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      // Remove all existing roles first
      await supabase.from("user_roles").delete().eq("user_id", userId);
      // Add new role
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role diperbarui!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const changePassword = useMutation({
  mutationFn: async () => {
    const res = await supabase.functions.invoke(
      "admin-change-password",
      {
        body: {
          userId: passwordUserId,
          password: newUserPassword,
        },
      }
    );

    if (res.error) throw res.error;
    if (res.data?.error) throw new Error(res.data.error);
  },
  onSuccess: () => {
    toast({ title: "Password berhasil diubah!" });
    setPasswordUserId(null);
    setNewUserPassword("");
  },
  onError: (e: any) =>
    toast({
      variant: "destructive",
      title: "Gagal",
      description: e.message,
    }),
});

  const roleLabel = (role: string) => {
    switch (role) {
      case "admin": return "Admin";
      case "teacher": return "Guru";
      case "student": return "Siswa";
      default: return role;
    }
  };

  const roleBadgeVariant = (role: string) => {
    switch (role) {
      case "admin": return "destructive" as const;
      case "teacher": return "default" as const;
      default: return "secondary" as const;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Kelola Pengguna</h1>
          <p className="text-muted-foreground font-body mt-1">Tambah, hapus, dan kelola role pengguna</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><UserPlus className="h-4 w-4" /> Tambah Pengguna</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Nama Lengkap</Label>
                <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Nama lengkap" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="email@contoh.com" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimal 6 karakter" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={newRole} onValueChange={(v) => setNewRole(v as AppRole)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="student">Siswa</SelectItem>
                    <SelectItem value="teacher">Guru</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => createUser.mutate()}
                disabled={!newEmail.trim() || !newPassword.trim() || !newName.trim() || createUser.isPending}
                className="w-full"
              >
                {createUser.isPending ? "Membuat..." : "Buat Pengguna"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : (
        <div className="space-y-3">
          {users?.map((u) => (
            <Card key={u.id}>
              <CardContent className="pt-4">
                <div className="flex items-center justify-between flex-wrap gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {u.roles.includes("admin") ? (
                        <Shield className="h-5 w-5 text-destructive" />
                      ) : (
                        <Users className="h-5 w-5 text-primary" />
                      )}
                      </div>
                    <div>
                      <p className="font-heading font-semibold">{u.full_name || "Tanpa Nama"}</p>
                      <div className="flex gap-1 mt-1">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={roleBadgeVariant(r)} className="text-xs">
                            {roleLabel(r)}
                          </Badge>
                        ))}
                        <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPasswordUserId(u.id)}
                      >
                        Ganti Password
                      </Button>
                        {u.roles.length === 0 && (
                          <Badge variant="outline" className="text-xs">Tanpa Role</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Select
                    value={u.roles[0] || "student"}
                    onValueChange={(v) => changeRole.mutate({ userId: u.id, role: v as AppRole })}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="student">Siswa</SelectItem>
                      <SelectItem value="teacher">Guru</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
          {!users?.length && (
            <Card>
              <CardContent className="py-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Pengguna</h3>
              </CardContent>
            </Card>
          )}
          <Dialog
            open={!!passwordUserId}
            onOpenChange={() => setPasswordUserId(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ganti Password Pengguna</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Password Baru</Label>
                  <Input
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                  />
                </div>

                <Button
                  className="w-full"
                  onClick={() => changePassword.mutate()}
                  disabled={changePassword.isPending || !newUserPassword}
                >
                  {changePassword.isPending
                    ? "Mengubah..."
                    : "Ubah Password"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;
