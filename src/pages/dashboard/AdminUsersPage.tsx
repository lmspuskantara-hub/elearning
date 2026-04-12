import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Users, Shield, UserPlus, FileUp, Download, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import * as XLSX from "xlsx";

import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const AdminUsersPage = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // State Management
  const [open, setOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<AppRole>("student");

  // --- FETCH DATA ---
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

  // --- MUTATIONS ---
  const createUserMutation = async (userData: any) => {
    const response = await supabase.functions.invoke("admin-create-user", {
      body: userData,
    });
    if (response.error) throw response.error;
    if (response.data?.error) throw new Error(response.data.error);
    return response.data;
  };

  const createUser = useMutation({
    mutationFn: () => createUserMutation({ 
      email: newEmail, 
      password: newPassword, 
      fullName: newName, 
      role: newRole 
    }),
    onSuccess: () => {
      toast({ title: "Pengguna berhasil dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      setOpen(false);
      resetForm();
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const changeRole = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: AppRole }) => {
      await supabase.from("user_roles").delete().eq("user_id", userId);
      const { error } = await supabase.from("user_roles").insert({ user_id: userId, role });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Role berhasil diperbarui!" });
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  // --- LOGIKA EXCEL ---
  const downloadTemplate = () => {
    const templateData = [
      { nama: "Budi Santoso", email: "budi@sekolah.com", password: "password123", role: "student" },
      { nama: "Siti Aminah", email: "siti@sekolah.com", password: "password123", role: "teacher" },
    ];
    const worksheet = XLSX.utils.json_to_sheet(templateData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "format_impor_user.xlsx");
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet) as any[];

        let successCount = 0;
        let errorCount = 0;

        for (const row of jsonData) {
          try {
            await createUserMutation({
              email: row.email || row.Email,
              password: String(row.password || row.Password || "123456"),
              fullName: row.nama || row.Nama || row.name,
              role: (row.role || row.Role || "student").toLowerCase(),
            });
            successCount++;
          } catch (err) {
            errorCount++;
          }
        }

        toast({
          title: "Proses Impor Selesai",
          description: `${successCount} sukses, ${errorCount} gagal.`,
        });
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      } catch (error) {
        toast({ variant: "destructive", title: "Error", description: "Format file tidak didukung." });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const resetForm = () => {
    setNewEmail("");
    setNewName("");
    setNewPassword("");
    setNewRole("student");
  };

  // --- HELPERS ---
  const roleLabel = (role: string) => {
    const labels: Record<string, string> = { admin: "Admin", teacher: "Guru", student: "Siswa" };
    return labels[role] || role;
  };

  const roleBadgeVariant = (role: string) => {
    if (role === "admin") return "destructive";
    if (role === "teacher") return "default";
    return "secondary";
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Kelola Pengguna</h1>
          <p className="text-muted-foreground font-body mt-1">Kelola akses dan impor data pengguna secara massal</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {/* Download Format */}
          <Button variant="ghost" size="sm" onClick={downloadTemplate} className="gap-1 text-xs">
            <Download className="h-3 w-3" /> Format Excel
          </Button>

          {/* Input File Hidden */}
          <input
            type="file"
            accept=".xlsx, .xls, .csv"
            className="hidden"
            ref={fileInputRef}
            onChange={handleImportExcel}
            disabled={isImporting}
          />
          
          <Button 
            variant="outline" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isImporting}
            className="gap-2"
          >
            {isImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileUp className="h-4 w-4" />}
            {isImporting ? "Memproses..." : "Impor"}
          </Button>

          {/* Dialog Tambah Manual */}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" /> Tambah</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pengguna Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
      </div>

      {/* List Users */}
      {isLoading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : (
        <div className="grid gap-3">
          {users?.map((u) => (
            <Card key={u.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      {u.roles.includes("admin") ? <Shield className="h-5 w-5 text-destructive" /> : <Users className="h-5 w-5 text-primary" />}
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm md:text-base leading-none">{u.full_name || "Tanpa Nama"}</h4>
                      <div className="flex gap-1 mt-1.5">
                        {u.roles.map((r) => (
                          <Badge key={r} variant={roleBadgeVariant(r)} className="text-[10px] px-1.5 py-0 capitalize">
                            {roleLabel(r)}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <Select
                    value={u.roles[0] || "student"}
                    onValueChange={(v) => changeRole.mutate({ userId: u.id, role: v as AppRole })}
                  >
                    <SelectTrigger className="w-[110px] h-8 text-xs">
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
        </div>
      )}
    </div>
  );
};

export default AdminUsersPage;