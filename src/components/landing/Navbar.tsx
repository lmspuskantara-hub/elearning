import { useState } from "react";
import { Button } from "@/components/ui/button";
import { BookOpen, Menu, X } from "lucide-react";
import { Link } from "react-router-dom";
import logo from "@/assets/tut wuri handayani.png";

const Navbar = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b">
      <div className="container flex items-center justify-between h-16">
<Link to="/dashboard" className="flex items-center gap-2">
  <img
    src={logo}
    alt="Logo PKBM"
    className="h-20 w-20 object-contain"
  />
  <span className="font-heading text-xl font-bold text-primary">
    PKBM PUSPA LOKA NUSANTARA
  </span>
</Link>

        <div className="hidden md:flex items-center gap-6">
          <a href="#fitur" className="text-muted-foreground hover:text-primary transition-colors font-body">Fitur</a>
          <a href="#keuntungan" className="text-muted-foreground hover:text-primary transition-colors font-body">Keuntungan</a>
          <Link to="/login">
            <Button variant="ghost">Masuk</Button>
          </Link>
          <Link to="/register">
            <Button variant="hero">Daftar Sekarang</Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b p-4 space-y-3">
          <a href="#fitur" className="block text-muted-foreground hover:text-primary" onClick={() => setMobileOpen(false)}>Fitur</a>
          <a href="#keuntungan" className="block text-muted-foreground hover:text-primary" onClick={() => setMobileOpen(false)}>Keuntungan</a>
          <Link to="/login" className="block"><Button variant="ghost" className="w-full">Masuk</Button></Link>
          <Link to="/register" className="block"><Button variant="hero" className="w-full">Daftar Sekarang</Button></Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
