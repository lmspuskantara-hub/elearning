import { BookOpen } from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-primary py-12">
      <div className="container">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BookOpen className="h-6 w-6 text-accent" />
            <span className="font-heading text-lg font-bold text-primary-foreground">PKBM Learn</span>
          </div>
          <p className="text-primary-foreground/70 text-sm font-body">
            © {new Date().getFullYear()} PKBM Learn. Platform E-Learning untuk PKBM.
          </p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
