import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import heroImage from "@/assets/hero-illustration.jpg";

const HeroSection = () => {
  return (
    <section className="pt-24 pb-16 md:pt-32 md:pb-24 overflow-hidden">
      <div className="container grid md:grid-cols-2 gap-12 items-center">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-block px-3 py-1 rounded-full bg-accent/15 text-accent font-body text-sm font-semibold mb-4">
            Platform E-Learning PKBM
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-heading font-bold text-primary leading-tight mb-6">
            Belajar Tanpa Batas,{" "}
            <span className="text-accent">Kapan Saja</span>
          </h1>
          <p className="text-lg text-muted-foreground font-body mb-8 max-w-lg">
            Platform pembelajaran digital lengkap untuk PKBM. Kelola kursus, kuis, tugas, dan pantau progres siswa dalam satu tempat.
          </p>
          <div className="flex flex-wrap gap-4">
            <Link to="/register">
              <Button variant="hero" size="lg" className="text-base px-8">
                Mulai Belajar
              </Button>
            </Link>
            <a href="#fitur">
              <Button variant="hero-outline" size="lg" className="text-base px-8">
                Lihat Fitur
              </Button>
            </a>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative"
        >
          <div className="rounded-2xl overflow-hidden shadow-2xl border">
            <img
              src={heroImage}
              alt="Siswa belajar di PKBM"
              className="w-full h-auto object-cover"
            />
          </div>
          <div className="absolute -bottom-4 -left-4 bg-card rounded-xl shadow-lg p-4 border">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-success/20 flex items-center justify-center">
                <span className="text-success font-bold">✓</span>
              </div>
              <div>
                <p className="font-heading font-semibold text-sm">Auto-Grading</p>
                <p className="text-xs text-muted-foreground">Hemat 80% waktu koreksi</p>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
