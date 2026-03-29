import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { PlusCircle, FileQuestion, Trash2, Plus } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

const questionTypes = [
  { value: "multiple_choice", label: "Pilihan Ganda" },
  { value: "multiple_answer", label: "PG Kompleks (Multi Jawaban)" },
  { value: "short_answer", label: "Jawaban Singkat" },
  { value: "fill_blank", label: "Isian" },
  { value: "matching", label: "Menjodohkan" },
  { value: "ordering", label: "Mengurutkan" },
  { value: "true_false", label: "Benar/Salah" },
  { value: "essay", label: "Esai" },
];

interface QuestionForm {
  question_type: string;
  question_text: string;
  options: string[];
  correct_answer: any;
  points: number;
}

const emptyQuestion: QuestionForm = {
  question_type: "multiple_choice",
  question_text: "",
  options: ["", "", "", ""],
  correct_answer: null,
  points: 10,
};

const ManageQuizzesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [quizOpen, setQuizOpen] = useState(false);
  const [questionOpen, setQuestionOpen] = useState(false);
  const [quizTitle, setQuizTitle] = useState("");
  const [quizDesc, setQuizDesc] = useState("");
  const [timeLimit, setTimeLimit] = useState(30);
  const [passingScore, setPassingScore] = useState(70);
  const [selectedQuizId, setSelectedQuizId] = useState<string | null>(null);
  const [question, setQuestion] = useState<QuestionForm>({ ...emptyQuestion });

  const { data: courses } = useQuery({
    queryKey: ["teacher-courses", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").eq("teacher_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const [selectedCourseId, setSelectedCourseId] = useState<string>("");

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["teacher-quizzes", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*, questions(count)")
        .eq("created_by", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: questions } = useQuery({
    queryKey: ["quiz-questions", selectedQuizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", selectedQuizId!)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!selectedQuizId,
  });

  const createQuiz = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("quizzes").insert({
        title: quizTitle,
        description: quizDesc,
        course_id: selectedCourseId || null,
        time_limit_minutes: timeLimit,
        passing_score: passingScore,
        created_by: user!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kuis dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["teacher-quizzes"] });
      setQuizOpen(false);
      setQuizTitle("");
      setQuizDesc("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const publishQuiz = useMutation({
    mutationFn: async ({ id, published }: { id: string; published: boolean }) => {
      const { error } = await supabase.from("quizzes").update({ is_published: !published }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["teacher-quizzes"] }),
  });

  const deleteQuiz = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quizzes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Kuis dihapus!" });
      queryClient.invalidateQueries({ queryKey: ["teacher-quizzes"] });
    },
  });

  const addQuestion = useMutation({
    mutationFn: async () => {
      const sortOrder = (questions?.length || 0);
      let correctAnswer = question.correct_answer;
      let options = question.options.filter(o => o.trim());

      if (question.question_type === "true_false") {
        options = ["Benar", "Salah"];
      }

      const { error } = await supabase.from("questions").insert({
        quiz_id: selectedQuizId!,
        question_type: question.question_type,
        question_text: question.question_text,
        options: options,
        correct_answer: correctAnswer,
        points: question.points,
        sort_order: sortOrder,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Soal ditambahkan!" });
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-quizzes"] });
      setQuestion({ ...emptyQuestion });
      setQuestionOpen(false);
    },
  });

  const deleteQuestion = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("questions").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quiz-questions"] });
      queryClient.invalidateQueries({ queryKey: ["teacher-quizzes"] });
    },
  });

  const renderQuestionForm = () => {
    const type = question.question_type;

    return (
      <div className="space-y-4">
        <div className="space-y-2">
          <Label>Tipe Soal</Label>
          <Select value={type} onValueChange={(v) => setQuestion({ ...emptyQuestion, question_type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {questionTypes.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Pertanyaan</Label>
          <Textarea value={question.question_text} onChange={(e) => setQuestion({ ...question, question_text: e.target.value })} placeholder="Tulis pertanyaan..." />
        </div>

        <div className="space-y-2">
          <Label>Poin</Label>
          <Input type="number" value={question.points} onChange={(e) => setQuestion({ ...question, points: parseInt(e.target.value) || 10 })} />
        </div>

        {(type === "multiple_choice" || type === "multiple_answer") && (
          <div className="space-y-2">
            <Label>Opsi Jawaban</Label>
            {question.options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <Input value={opt} onChange={(e) => {
                  const newOpts = [...question.options];
                  newOpts[i] = e.target.value;
                  setQuestion({ ...question, options: newOpts });
                }} placeholder={`Opsi ${String.fromCharCode(65 + i)}`} />
              </div>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setQuestion({ ...question, options: [...question.options, ""] })}>
              <Plus className="h-3 w-3 mr-1" /> Tambah Opsi
            </Button>
            <div className="space-y-2">
              <Label>{type === "multiple_answer" ? "Jawaban Benar (pisahkan dengan koma, contoh: 0,2)" : "Jawaban Benar (index, mulai dari 0)"}</Label>
              <Input placeholder={type === "multiple_answer" ? "0,2" : "0"} onChange={(e) => {
                const val = e.target.value;
                setQuestion({ ...question, correct_answer: type === "multiple_answer" ? val.split(",").map(Number) : parseInt(val) });
              }} />
            </div>
          </div>
        )}

        {type === "true_false" && (
          <div className="space-y-2">
            <Label>Jawaban Benar</Label>
            <Select onValueChange={(v) => setQuestion({ ...question, correct_answer: v === "true" })}>
              <SelectTrigger><SelectValue placeholder="Pilih jawaban" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Benar</SelectItem>
                <SelectItem value="false">Salah</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}

        {(type === "short_answer" || type === "fill_blank") && (
          <div className="space-y-2">
            <Label>Jawaban Benar</Label>
            <Input placeholder="Jawaban yang benar" onChange={(e) => setQuestion({ ...question, correct_answer: e.target.value })} />
          </div>
        )}

        {type === "matching" && (
          <div className="space-y-2">
            <Label>Pasangan (format JSON: {`[{"left":"A","right":"1"}]`})</Label>
            <Textarea placeholder={`[{"left":"Indonesia","right":"Jakarta"},{"left":"Jepang","right":"Tokyo"}]`} onChange={(e) => {
              try { setQuestion({ ...question, correct_answer: JSON.parse(e.target.value), options: JSON.parse(e.target.value) }); } catch {}
            }} />
          </div>
        )}

        {type === "ordering" && (
          <div className="space-y-2">
            <Label>Urutan yang Benar (satu per baris)</Label>
            <Textarea placeholder="Item pertama&#10;Item kedua&#10;Item ketiga" onChange={(e) => {
              const items = e.target.value.split("\n").filter(Boolean);
              setQuestion({ ...question, correct_answer: items, options: items });
            }} />
          </div>
        )}

        {type === "essay" && (
          <p className="text-sm text-muted-foreground font-body">Esai akan dinilai manual oleh guru.</p>
        )}
      </div>
    );
  };

  if (selectedQuizId) {
    const quiz = quizzes?.find((q: any) => q.id === selectedQuizId);
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Button variant="ghost" onClick={() => setSelectedQuizId(null)} className="mb-2">← Kembali</Button>
            <h1 className="text-2xl font-heading font-bold text-primary">{quiz?.title}</h1>
            <p className="text-muted-foreground font-body mt-1">{questions?.length || 0} soal</p>
          </div>
          <Dialog open={questionOpen} onOpenChange={setQuestionOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Tambah Soal</Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="font-heading">Tambah Soal</DialogTitle>
              </DialogHeader>
              {renderQuestionForm()}
              <Button onClick={() => addQuestion.mutate()} disabled={!question.question_text.trim() || addQuestion.isPending} className="w-full">
                {addQuestion.isPending ? "Menyimpan..." : "Simpan Soal"}
              </Button>
            </DialogContent>
          </Dialog>
        </div>

        {questions?.length ? (
          <div className="space-y-3">
            {questions.map((q: any, i: number) => (
              <Card key={q.id}>
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline">{questionTypes.find(t => t.value === q.question_type)?.label}</Badge>
                        <span className="text-xs text-muted-foreground">{q.points} poin</span>
                      </div>
                      <p className="font-body text-sm">{i + 1}. {q.question_text}</p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuestion.mutate(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground font-body">Belum ada soal. Tambahkan soal pertama!</p>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Kelola Kuis</h1>
          <p className="text-muted-foreground font-body mt-1">Buat kuis dengan berbagai tipe soal</p>
        </div>
        <Dialog open={quizOpen} onOpenChange={setQuizOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><PlusCircle className="h-4 w-4" /> Buat Kuis</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="font-heading">Buat Kuis Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Judul Kuis</Label>
                <Input value={quizTitle} onChange={(e) => setQuizTitle(e.target.value)} placeholder="Kuis Bab 1" />
              </div>
              <div className="space-y-2">
                <Label>Deskripsi</Label>
                <Textarea value={quizDesc} onChange={(e) => setQuizDesc(e.target.value)} placeholder="Deskripsi kuis..." />
              </div>
              {courses?.length ? (
                <div className="space-y-2">
                  <Label>Kursus (Opsional)</Label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                    <SelectTrigger><SelectValue placeholder="Pilih kursus" /></SelectTrigger>
                    <SelectContent>
                      {courses.map((c: any) => (
                        <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Batas Waktu (menit)</Label>
                  <Input type="number" value={timeLimit} onChange={(e) => setTimeLimit(parseInt(e.target.value) || 30)} />
                </div>
                <div className="space-y-2">
                  <Label>Nilai Minimum (%)</Label>
                  <Input type="number" value={passingScore} onChange={(e) => setPassingScore(parseInt(e.target.value) || 70)} />
                </div>
              </div>
              <Button onClick={() => createQuiz.mutate()} disabled={!quizTitle.trim() || createQuiz.isPending} className="w-full">
                {createQuiz.isPending ? "Membuat..." : "Buat Kuis"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : quizzes?.length ? (
        <div className="space-y-3">
          {quizzes.map((q: any) => (
            <Card key={q.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedQuizId(q.id)}>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                      <FileQuestion className="h-5 w-5 text-accent" />
                    </div>
                    <div>
                      <h3 className="font-heading font-semibold">{q.title}</h3>
                      <p className="text-sm text-muted-foreground font-body">{q.questions?.[0]?.count || 0} soal · {q.time_limit_minutes} menit · KKM {q.passing_score}%</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                    <Badge variant={q.is_published ? "default" : "secondary"}>
                      {q.is_published ? "Publik" : "Draft"}
                    </Badge>
                    <Button variant="ghost" size="sm" onClick={() => publishQuiz.mutate({ id: q.id, published: q.is_published })}>
                      {q.is_published ? "Sembunyikan" : "Publikasikan"}
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => deleteQuiz.mutate(q.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Kuis</h3>
            <p className="text-muted-foreground font-body">Buat kuis pertama Anda.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ManageQuizzesPage;
