import { motion } from "framer-motion";
import {
  BookOpen, FileQuestion, ClipboardCheck, BarChart3,
  MessageSquare, Calendar, Lock, UserCheck, Download
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "Manajemen Kursus", desc: "Kursus terstruktur dengan bab, video YouTube, teks, dan PDF." },
  { icon: FileQuestion, title: "Kuis & Ujian", desc: "8 tipe soal dengan auto-grading untuk soal objektif." },
  { icon: ClipboardCheck, title: "Penugasan", desc: "Siswa kumpulkan tugas, guru beri skor dan feedback." },
  { icon: BarChart3, title: "Tracking Progres", desc: "Pantau kemajuan belajar real-time per siswa." },
  { icon: MessageSquare, title: "Forum Diskusi", desc: "Diskusi per sesi kursus untuk memperdalam materi." },
  { icon: Calendar, title: "Periode & Sesi", desc: "Atur semester, kelas, dan rombel otomatis." },
  { icon: Lock, title: "Akses Sekuensial", desc: "Kontrol urutan belajar dengan KKM." },
  { icon: UserCheck, title: "Absensi Online", desc: "Check-in dengan kode unik, rekap siap export." },
  { icon: Download, title: "Export Data", desc: "Export progres dan kehadiran ke CSV." },
];

const FeaturesSection = () => {
  return (
    <section id="fitur" className="py-20 bg-card/50">
      <div className="container">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
            Fitur Lengkap untuk PKBM
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
            Semua yang Anda butuhkan untuk mengelola pembelajaran secara digital
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.07 }}
              className="bg-card rounded-xl p-6 border hover:shadow-lg hover:border-accent/40 transition-all group"
            >
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-accent/15 transition-colors">
                <f.icon className="h-6 w-6 text-primary group-hover:text-accent transition-colors" />
              </div>
              <h3 className="font-heading font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-muted-foreground font-body text-sm">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturesSection;
