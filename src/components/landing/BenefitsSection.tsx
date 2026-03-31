import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const benefits = [
  "Kebebasan Waktu: Akses materi belajar kapan pun Anda siap, tanpa batasan ruang dan waktu.",
  "Hasil Evaluasi Instan: Ketahui pencapaian belajar Anda secara langsung setelah mengerjakan latihan.",
  "Pendampingan Terukur: Pantau perkembangan belajarmu agar tetap berada di jalur menuju kelulusan.",
  "Materi Terpadu: Kurikulum yang disusun bertahap untuk memastikan pemahaman yang lebih mendalam.",
  "Komunitas Belajar: Ruang berdiskusi untuk saling berbagi ilmu antara tutor dan rekan belajar.",
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
              Keunggulan Belajar Digital di PKBM Puspa Loka Nusantara
            </h2>
            <p className="text-muted-foreground font-body mb-8">
              Platform yang dirancang sesuai dengan kebutuhan siswa PKBM Puspa Loka Nusantara .
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
