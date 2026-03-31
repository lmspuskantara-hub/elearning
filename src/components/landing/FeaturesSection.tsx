import { motion } from "framer-motion";
import {
  BookOpen, FileQuestion, ClipboardCheck, BarChart3,
  MessageSquare, Calendar, Lock, UserCheck, Download
} from "lucide-react";

const features = [
  { icon: BookOpen, title: "Ruang Belajar Mandiri", desc: "Akses materi belajar lengkap mulai dari video tutorial, modul PDF, hingga bacaan menarik yang disusun khusus untuk memudahkanmu memahami setiap bab." },
  { icon: FileQuestion, title: "Asah Kemampuan & Evaluasi", desc: "Uji pemahamanmu dengan berbagai tipe latihan soal. Dapatkan hasil instan sehingga kamu tahu bagian mana yang sudah dikuasai dan mana yang perlu diulang." },
  { icon: ClipboardCheck, title: "Kirim Tugas & Dapatkan Umpan Balik", desc: "Kumpulkan hasil karyamu di sini. Guru akan memberikan nilai serta masukan berharga agar kualitas belajarmu terus meningkat dari hari ke hari." },
  { icon: BarChart3, title: "Pantau Nilai & Pencapaianmu", desc: "Lihat grafik perkembangan belajarmu secara langsung. Pastikan target belajarmu tercapai tepat waktu dengan memantau setiap progres yang ada." },
  { icon: MessageSquare, title: "Ruang Diskusi & Berbagi Ide", desc: "Jangan ragu untuk bertanya! Gunakan ruang ini untuk berdiskusi dengan teman sekelas atau berkonsultasi langsung dengan guru mengenai materi yang sulit." },
  { icon: Lock, title: "Jalur Belajar Bertahap (Sesuai Target)", desc: "Sistem kami membimbingmu belajar secara urut. Pastikan kamu menguasai satu materi sebelum lanjut ke tantangan berikutnya agar hasil belajarmu maksimal." },
  { icon: UserCheck, title: "Catat Kehadiran Digital", desc: "Lakukan presensi dengan mudah menggunakan kode unik di setiap sesi. Riwayat kehadiranmu akan tercatat rapi sebagai bagian dari kedisiplinan belajar." },
  
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
            Fasilitas Belajar Terbaik untuk Masa Depanmu di PKBM Puspa Loka Nusantara
          </h2>
          <p className="text-muted-foreground font-body max-w-2xl mx-auto">
           Langkah Nyata Menuju Keberhasilan melalui Pembelajaran Digital Terpadu.
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
