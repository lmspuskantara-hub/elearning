import { Mail, MapPin, Phone, MessageCircle } from "lucide-react";
import logo from "@/assets/tut wuri handayani.png";

const Footer = () => {
  return (
    <footer className="bg-primary pt-12 pb-6">
      <div className="container">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8 border-b border-primary-foreground/10 pb-8">
          
          {/* Kolom 1: Identitas Lembaga */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-2">
              <img
                src={logo}
                alt="Logo PKBM"
                className="h-12 w-12 object-contain"
              />
              <span className="font-heading text-lg font-bold text-primary-foreground leading-tight">
                PKBM Puspa Loka Nusantara
              </span>
            </div>
            <p className="text-primary-foreground/70 text-sm leading-relaxed">
              Pusat Kegiatan Belajar Masyarakat (PKBM) yang berdedikasi untuk mencerdaskan bangsa melalui pendidikan kesetaraan yang modern dan fleksibel.
            </p>
          </div>

          {/* Kolom 2: Kontak & Alamat (Kesan Lembaga Nyata) */}
          <div className="flex flex-col gap-4">
            <h4 className="text-primary-foreground font-bold text-lg">Hubungi Kami</h4>
            <ul className="space-y-3 text-sm text-primary-foreground/70">
              <li className="flex items-start gap-2">
                <MapPin className="h-5 w-5 shrink-0 text-secondary" />
                <span>Kp. Talang Desa Palasari Girang, Kec. Kalapanunggal, Kabupaten Sukabumi, Jawa Barat</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="h-5 w-5 shrink-0 text-secondary" />
                <span>+62 8XX XXXX XXXX</span>
              </li>
              <li className="flex items-center gap-2">
                <Mail className="h-5 w-5 shrink-0 text-secondary" />
                <span>admin@puspalokanusantara.sch.id</span>
              </li>
            </ul>
          </div>

          {/* Kolom 3: Navigasi & Bantuan */}
          <div className="flex flex-col gap-4">
            <h4 className="text-primary-foreground font-bold text-lg">Bantuan & Informasi</h4>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li className="pt-2">
                <a 
                  href="https://wa.me/6285975213222" 
                  className="inline-flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                >
                  <MessageCircle className="h-4 w-4" />
                  Bantuan Admin (WA)
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bagian Bawah: Copyright */}
        <div className="text-center md:text-left flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-primary-foreground/50 text-xs">
            © {new Date().getFullYear()} PKBM Puspa Loka Nusantara. Dikembangkan untuk Pendidikan Kesetaraan Indonesia.
          </p>
                </div>
      </div>
    </footer>
  );
};

export default Footer;