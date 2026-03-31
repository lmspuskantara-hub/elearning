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
    className="h-12 w-12 object-contain"
  />
  <span className="font-heading text-xl font-bold text-primary">
    PKBM PUSPA LOKA NUSANTARA
  </span>
</Link>

        <div className="hidden 2xl:flex items-center gap-2">
                 <Link to="/login">
            <Button variant="hero">Mulai Belajar</Button>
          </Link>
        </div>

        <button className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
          {mobileOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      {mobileOpen && (
        <div className="md:hidden bg-background border-b p-4 space-y-3">
           <Link to="/login" className="block"><Button variant="ghost" className="w-full">Mulai Belajar</Button></Link>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
