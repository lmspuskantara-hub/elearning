import { useState, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Upload, Download, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";

interface Props {
  quizId: string;
  existingCount: number;
}

const ImportQuestionsDialog = ({ quizId, existingCount }: Props) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<any[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { tipe_soal: "multiple_choice", pertanyaan: "Ibu kota Indonesia?", opsi: "Jakarta|Bandung|Surabaya|Medan", jawaban_benar: "0", poin: 10 },
      { tipe_soal: "true_false", pertanyaan: "Bumi itu datar?", opsi: "", jawaban_benar: "false", poin: 5 },
      { tipe_soal: "short_answer", pertanyaan: "Planet terbesar?", opsi: "", jawaban_benar: "Jupiter", poin: 10 },
      { tipe_soal: "multiple_answer", pertanyaan: "Hewan mamalia?", opsi: "Kucing|Ular|Anjing|Kadal", jawaban_benar: "0,2", poin: 10 },
      { tipe_soal: "essay", pertanyaan: "Jelaskan proses fotosintesis!", opsi: "", jawaban_benar: "", poin: 20 },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Soal");
    XLSX.writeFile(wb, "template_import_soal.xlsx");
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const wb = XLSX.read(evt.target?.result, { type: "binary" });
      const data = XLSX.utils.sheet_to_json<any>(wb.Sheets[wb.SheetNames[0]]);
      setPreview(data);
    };
    reader.readAsBinaryString(file);
  };

  const parseRow = (row: any, index: number) => {
    const type = (row.tipe_soal || row.question_type || "multiple_choice").toLowerCase();
    const questionText = row.pertanyaan || row.question_text || "";
    const rawOptions = String(row.opsi || row.options || "");
    const rawAnswer = String(row.jawaban_benar || row.correct_answer || "");
    const points = parseInt(row.poin || row.points) || 10;

    let options: any = rawOptions ? rawOptions.split("|").map((s: string) => s.trim()) : [];
    let correctAnswer: any = null;

    if (type === "multiple_choice") {
      correctAnswer = parseInt(rawAnswer);
    } else if (type === "multiple_answer") {
      correctAnswer = rawAnswer.split(",").map((s: string) => parseInt(s.trim()));
    } else if (type === "true_false") {
      options = ["Benar", "Salah"];
      correctAnswer = rawAnswer.toLowerCase() === "true" || rawAnswer.toLowerCase() === "benar";
    } else if (type === "short_answer" || type === "fill_blank") {
      correctAnswer = rawAnswer;
    } else if (type === "ordering") {
      correctAnswer = options;
    } else if (type === "matching") {
      try { correctAnswer = JSON.parse(rawAnswer); options = correctAnswer; } catch { correctAnswer = options; }
    }

    return {
      quiz_id: quizId,
      question_type: type,
      question_text: questionText,
      options,
      correct_answer: correctAnswer,
      points,
      sort_order: existingCount + index,
    };
  };

  const handleImport = async () => {
    if (!preview.length) return;
    setLoading(true);
    try {
      const questions = preview.map((row, i) => parseRow(row, i));
      const { error } = await supabase.from("questions").insert(questions);
      if (error) throw error;

      toast({ title: `${questions.length} soal berhasil diimpor!` });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-quizzes"] });
      setOpen(false);
      setPreview([]);
    } catch (e: any) {
      toast({ variant: "destructive", title: "Gagal impor", description: e.message });
    } finally {
      setLoading(false);
    }
  };

  const typeLabel: Record<string, string> = {
    multiple_choice: "PG", multiple_answer: "PG Kompleks", short_answer: "Singkat",
    fill_blank: "Isian", matching: "Jodoh", ordering: "Urut", true_false: "B/S", essay: "Esai",
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setPreview([]); }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2"><Upload className="h-4 w-4" /> Impor Soal Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Impor Soal dari Excel</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <Button variant="ghost" className="gap-2 text-sm" onClick={downloadTemplate}>
            <Download className="h-4 w-4" /> Download Template Soal
          </Button>
          <p className="text-xs text-muted-foreground">
            Kolom: <strong>tipe_soal, pertanyaan, opsi</strong> (pisahkan dengan |), <strong>jawaban_benar, poin</strong>
          </p>
          <input ref={fileRef} type="file" accept=".xlsx,.xls" onChange={handleFile} className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-primary/10 file:text-primary file:font-semibold" />

          {preview.length > 0 && (
            <div className="border rounded-lg overflow-auto max-h-48">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-muted">
                    <th className="p-2 text-left">#</th>
                    <th className="p-2 text-left">Tipe</th>
                    <th className="p-2 text-left">Pertanyaan</th>
                    <th className="p-2 text-left">Poin</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, i) => (
                    <tr key={i} className="border-t">
                      <td className="p-2">{i + 1}</td>
                      <td className="p-2">{typeLabel[(row.tipe_soal || "").toLowerCase()] || row.tipe_soal}</td>
                      <td className="p-2 max-w-[200px] truncate">{row.pertanyaan || row.question_text}</td>
                      <td className="p-2">{row.poin || row.points || 10}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <Button onClick={handleImport} disabled={!preview.length || loading} className="w-full gap-2">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {loading ? "Mengimpor..." : `Impor ${preview.length} Soal`}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ImportQuestionsDialog;
