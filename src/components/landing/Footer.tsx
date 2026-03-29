import { BookOpen } from "lucide-react";
import logo from "@/assets/tut wuri handayani.png";

const Footer = () => {
  return (
    <footer className="bg-primary py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2">
  <img
    src={logo}
    alt="Logo PKBM"
    className="h-12 w-12 object-contain"
  />
  <span className="font-heading text-lg font-bold text-primary-foreground">
    PKBM Puspa Loka Nusantara.
  </span>
</div>
          <p className="text-primary-foreground/70 text-sm font-body">
            © {new Date().getFullYear()} PKBM Puspa Loka Nusantara. Platform E-Learning untuk PKBM.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
