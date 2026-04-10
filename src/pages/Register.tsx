import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Eye, EyeOff } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import logo from "@/assets/tut wuri handayani.png";

const Register = () => {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  // Handle Registrasi Manual (Email & Password)
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          // Data ini akan ditangkap oleh Database Trigger untuk tabel profiles
          data: { 
            full_name: fullName,
            role: "student" 
          },
          emailRedirectTo: window.location.origin,
        },
      });

      if (error) throw error;

      toast({ 
        title: "Pendaftaran Berhasil!", 
        description: "Silakan cek email Anda untuk verifikasi akun." 
      });
      navigate("/login");
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Pendaftaran gagal", 
        description: error.message 
      });
    } finally {
      setLoading(false);
    }
  };

  // Handle Registrasi/Login via Google
  const handleGoogleRegister = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/dashboard`,
          queryParams: {
            role: "student", // Mengirim role via queryParams untuk menghindari TS error
            access_type: 'offline',
            prompt: 'select_account',
          },
        },
      });
      if (error) throw error;
    } catch (error: any) {
      toast({ 
        variant: "destructive", 
        title: "Gagal daftar Google", 
        description: error.message 
      });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background py-8">
      <Card className="w-full max-w-md border-t-4 border-t-primary">
        <CardHeader className="text-center">
          <Link to="/" className="flex justify-center items-center mb-2">
            <img 
              src={logo} 
              alt="Logo PKBM" 
              className="h-14 w-auto object-contain" 
            />
          </Link>
          <CardTitle className="font-heading text-2xl text-foreground">Daftar Akun</CardTitle>
          <CardDescription className="font-body">
            Bergabunglah dengan platform E-learning PKBM Puspa Loka Nusantara
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {/* Tombol Google OAuth */}
          <Button 
            variant="outline" 
            type="button" 
            className="w-full flex items-center gap-3 py-6 border-2 hover:bg-accent transition-all" 
            onClick={handleGoogleRegister}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path 
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" 
                fill="#4285F4"
              />
              <path 
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" 
                fill="#34A853"
              />
              <path 
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" 
                fill="#FBBC05"
              />
              <path 
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" 
                fill="#EA4335"
              />
            </svg>
            Daftar Cepat dengan Google
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-muted" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-4 text-muted-foreground font-medium">
                Atau daftar manual
              </span>
            </div>
          </div>

          <form onSubmit={handleRegister} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nama Lengkap</Label>
              <Input 
                id="fullName" 
                placeholder="Contoh: Budi Darmawan" 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input 
                id="email" 
                type="email" 
                placeholder="nama@email.com" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
                required 
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input 
                  id="password" 
                  type={showPassword ? "text" : "password"} 
                  placeholder="Minimal 6 karakter" 
                  value={password} 
                  onChange={(e) => setPassword(e.target.value)} 
                  required 
                  minLength={6} 
                />
                <button 
                  type="button" 
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors" 
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full py-6 text-lg" disabled={loading}>
              {loading ? "Membuat Akun..." : "Daftar Sekarang"}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground font-body">
            Sudah punya akun?{" "}
            <Link to="/login" className="text-primary hover:underline font-bold transition-all">
              Masuk di sini
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Register;