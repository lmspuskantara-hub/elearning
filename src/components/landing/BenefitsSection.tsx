import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const benefits = [
  "Materi belajar tersedia 24/7 — siswa belajar kapan saja, di mana saja",
  "Auto-grading kuis menghemat waktu koreksi guru hingga 80%",
  "Tracking progres real-time membantu identifikasi siswa yang tertinggal",
  "Konten terstruktur dengan akses sekuensial memastikan belajar sistematis",
  "Forum diskusi meningkatkan interaksi dan kolaborasi",
  "Integrasi penjadwalan mempermudah setup kursus per mata pelajaran",
  "Export data progres dan kehadiran siap pakai untuk evaluasi dan rapor",
];

const BenefitsSection = () => {
  return (
    <section id="keuntungan" className="py-20">
      <div className="container">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <h2 className="text-3xl md:text-4xl font-heading font-bold text-primary mb-4">
              Mengapa Memilih PKBM Learn?
            </h2>
            <p className="text-muted-foreground font-body mb-8">
              Platform yang dirancang khusus untuk kebutuhan Pusat Kegiatan Belajar Masyarakat.
            </p>
          </motion.div>

          <div className="space-y-4">
            {benefits.map((b, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="flex items-start gap-3 bg-card p-4 rounded-lg border"
              >
                <CheckCircle className="h-5 w-5 text-success mt-0.5 shrink-0" />
                <p className="text-sm font-body">{b}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default BenefitsSection;
