import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Download, FileSpreadsheet, BarChart3, UserCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const downloadExcel = (data: Record<string, any>[], filename: string) => {
  if (!data.length) {
    toast.error("Tidak ada data untuk diexport");
    return;
  }
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Data");
  XLSX.writeFile(wb, filename);
  toast.success(`${filename} berhasil diunduh`);
};

const fetchLookups = async () => {
  const [profiles, sessions, courses, quizzes, assignments, lessons] = await Promise.all([
    supabase.from("profiles").select("id, full_name"),
    supabase.from("attendance_sessions").select("id, title, course_id"),
    supabase.from("courses").select("id, title"),
    supabase.from("quizzes").select("id, title"),
    supabase.from("assignments").select("id, title, course_id"),
    supabase.from("lessons").select("id, title"),
  ]);

  const toMap = (rows: any[] | null) => {
    const m: Record<string, any> = {};
    (rows || []).forEach((r) => { m[r.id] = r; });
    return m;
  };

  return {
    profiles: toMap(profiles.data),
    sessions: toMap(sessions.data),
    courses: toMap(courses.data),
    quizzes: toMap(quizzes.data),
    assignments: toMap(assignments.data),
    lessons: toMap(lessons.data),
  };
};

type Lookups = Awaited<ReturnType<typeof fetchLookups>>;

const exportConfigs = [
  {
    icon: BarChart3, title: "Progres Belajar", desc: "Data progres per kursus dan pelajaran", filename: "progres_belajar.xlsx",
    fetch: async (l: Lookups) => {
      const { data } = await supabase.from("lesson_progress").select("user_id, lesson_id, completed, completed_at");
      return (data || []).map(({ user_id, lesson_id, ...rest }) => ({
        nama_lengkap: l.profiles[user_id]?.full_name || user_id,
        pelajaran: l.lessons[lesson_id]?.title || lesson_id,
        ...rest,
      }));
    }
  },
  {
    icon: UserCheck, title: "Rekap Kehadiran", desc: "Data kehadiran per sesi kursus", filename: "rekap_kehadiran.xlsx",
    fetch: async (l: Lookups) => {
      const { data } = await supabase.from("attendance_records").select("user_id, session_id, checked_in_at");
      return (data || []).map(({ user_id, session_id, ...rest }) => {
        const session = l.sessions[session_id];
        const courseName = session ? l.courses[session.course_id]?.title || "" : "";
        return {
          nama_lengkap: l.profiles[user_id]?.full_name || user_id,
          sesi: session?.title || session_id,
          kursus: courseName,
          ...rest,
        };
      });
    }
  },
  {
    icon: FileSpreadsheet, title: "Nilai Kuis & Ujian", desc: "Semua nilai kuis dan ujian", filename: "nilai_kuis.xlsx",
    fetch: async (l: Lookups) => {
      const { data } = await supabase.from("quiz_attempts").select("user_id, quiz_id, score, total_points, status, started_at, completed_at");
      return (data || []).map(({ user_id, quiz_id, ...rest }) => ({
        nama_lengkap: l.profiles[user_id]?.full_name || user_id,
        kuis: l.quizzes[quiz_id]?.title || quiz_id,
        ...rest,
      }));
    }
  },
  {
    icon: FileSpreadsheet, title: "Nilai Tugas", desc: "Semua nilai penugasan", filename: "nilai_tugas.xlsx",
    fetch: async (l: Lookups) => {
      const { data } = await supabase.from("assignment_submissions").select("user_id, assignment_id, score, feedback, submitted_at, graded_at");
      return (data || []).map(({ user_id, assignment_id, ...rest }) => {
        const assignment = l.assignments[assignment_id];
        const courseName = assignment ? l.courses[assignment.course_id]?.title || "" : "";
        return {
          nama_lengkap: l.profiles[user_id]?.full_name || user_id,
          tugas: assignment?.title || assignment_id,
          kursus: courseName,
          ...rest,
        };
      });
    }
  },
];

const ExportPage = () => {
  const [loading, setLoading] = useState<string | null>(null);

  const handleExport = async (config: typeof exportConfigs[0]) => {
    setLoading(config.filename);
    try {
      const lookups = await fetchLookups();
      const data = await config.fetch(lookups);
      downloadExcel(data, config.filename);
    } catch {
      toast.error("Gagal mengambil data");
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Export Data</h1>
        <p className="text-muted-foreground font-body mt-1">Download data untuk evaluasi dan pelaporan</p>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {exportConfigs.map((e) => (
          <Card key={e.title}>
            <CardHeader>
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                <e.icon className="h-5 w-5 text-accent" />
                {e.title}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground font-body mb-4">{e.desc}</p>
              <Button
                variant="outline"
                className="gap-2 w-full"
                disabled={loading === e.filename}
                onClick={() => handleExport(e)}
              >
                {loading === e.filename ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Download Excel
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ExportPage;