import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { FileQuestion, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";
import { useState } from "react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";

const QuizzesPage = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [activeQuiz, setActiveQuiz] = useState<any>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});

  const { data: quizzes, isLoading } = useQuery({
    queryKey: ["available-quizzes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quizzes")
        .select("*, questions(count)")
        .eq("is_published", true)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: myAttempts } = useQuery({
    queryKey: ["my-attempts", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("user_id", user!.id);
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const { data: questions } = useQuery({
    queryKey: ["quiz-questions-take", activeQuiz?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", activeQuiz!.id)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: !!activeQuiz,
  });

  const startQuiz = useMutation({
    mutationFn: async (quizId: string) => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .insert({ quiz_id: quizId, user_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      setAttemptId(data.id);
    },
  });

  const submitQuiz = useMutation({
    mutationFn: async () => {
      if (!questions || !attemptId) return;

      let totalPoints = 0;
      let earnedPoints = 0;

      for (const q of questions) {
        const userAnswer = answers[q.id];
        let isCorrect = false;
        let pointsEarned = 0;

        totalPoints += q.points;

        if (q.question_type === "essay") {
          // Essays are graded manually
          isCorrect = false;
          pointsEarned = 0;
        } else if (q.question_type === "multiple_choice") {
          isCorrect = userAnswer === q.correct_answer;
          pointsEarned = isCorrect ? q.points : 0;
        } else if (q.question_type === "multiple_answer") {
          const correct = Array.isArray(q.correct_answer) ? q.correct_answer.sort() : [];
          const given = Array.isArray(userAnswer) ? userAnswer.sort() : [];
          isCorrect = JSON.stringify(correct) === JSON.stringify(given);
          pointsEarned = isCorrect ? q.points : 0;
        } else if (q.question_type === "true_false") {
          isCorrect = userAnswer === q.correct_answer;
          pointsEarned = isCorrect ? q.points : 0;
        } else if (q.question_type === "short_answer" || q.question_type === "fill_blank") {
          isCorrect = String(userAnswer || "").toLowerCase().trim() === String(q.correct_answer || "").toLowerCase().trim();
          pointsEarned = isCorrect ? q.points : 0;
        } else if (q.question_type === "ordering") {
          isCorrect = JSON.stringify(userAnswer) === JSON.stringify(q.correct_answer);
          pointsEarned = isCorrect ? q.points : 0;
        } else if (q.question_type === "matching") {
          isCorrect = JSON.stringify(userAnswer) === JSON.stringify(q.correct_answer);
          pointsEarned = isCorrect ? q.points : 0;
        }

        earnedPoints += pointsEarned;

        await supabase.from("quiz_answers").insert({
          attempt_id: attemptId,
          question_id: q.id,
          answer: userAnswer,
          is_correct: isCorrect,
          points_earned: pointsEarned,
        });
      }

      const score = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      await supabase.from("quiz_attempts").update({
        score,
        total_points: totalPoints,
        completed_at: new Date().toISOString(),
        status: "completed",
      }).eq("id", attemptId);

      return score;
    },
    onSuccess: (score) => {
      toast({
        title: "Kuis selesai!",
        description: `Nilai Anda: ${score?.toFixed(1)}%`,
      });
      setActiveQuiz(null);
      setAttemptId(null);
      setAnswers({});
      queryClient.invalidateQueries({ queryKey: ["my-attempts"] });
    },
  });

  const handleStartQuiz = (quiz: any) => {
    setActiveQuiz(quiz);
    setAnswers({});
    startQuiz.mutate(quiz.id);
  };

  // Taking a quiz
  if (activeQuiz && questions) {
    return (
      <div className="space-y-6 max-w-3xl">
        <div>
          <h1 className="text-2xl font-heading font-bold text-primary">{activeQuiz.title}</h1>
          <p className="text-muted-foreground font-body mt-1">{questions.length} soal · {activeQuiz.time_limit_minutes} menit</p>
        </div>

        {questions.map((q: any, i: number) => (
          <Card key={q.id}>
            <CardContent className="pt-6 space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant="outline">{q.points} poin</Badge>
              </div>
              <p className="font-body font-medium">{i + 1}. {q.question_text}</p>

              {q.question_type === "multiple_choice" && (
                <RadioGroup value={String(answers[q.id] ?? "")} onValueChange={(v) => setAnswers({ ...answers, [q.id]: parseInt(v) })}>
                  {(q.options as string[])?.map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center space-x-2">
                      <RadioGroupItem value={String(oi)} id={`${q.id}-${oi}`} />
                      <Label htmlFor={`${q.id}-${oi}`} className="font-body">{opt}</Label>
                    </div>
                  ))}
                </RadioGroup>
              )}

              {q.question_type === "multiple_answer" && (
                <div className="space-y-2">
                  {(q.options as string[])?.map((opt: string, oi: number) => (
                    <div key={oi} className="flex items-center space-x-2">
                      <Checkbox
                        id={`${q.id}-${oi}`}
                        checked={(answers[q.id] || []).includes(oi)}
                        onCheckedChange={(checked) => {
                          const current = answers[q.id] || [];
                          setAnswers({
                            ...answers,
                            [q.id]: checked ? [...current, oi] : current.filter((x: number) => x !== oi),
                          });
                        }}
                      />
                      <Label htmlFor={`${q.id}-${oi}`} className="font-body">{opt}</Label>
                    </div>
                  ))}
                </div>
              )}

              {q.question_type === "true_false" && (
                <RadioGroup value={String(answers[q.id] ?? "")} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v === "true" })}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="true" id={`${q.id}-true`} />
                    <Label htmlFor={`${q.id}-true`}>Benar</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="false" id={`${q.id}-false`} />
                    <Label htmlFor={`${q.id}-false`}>Salah</Label>
                  </div>
                </RadioGroup>
              )}

              {(q.question_type === "short_answer" || q.question_type === "fill_blank") && (
                <Input
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Jawaban Anda..."
                />
              )}

              {q.question_type === "essay" && (
                <Textarea
                  value={answers[q.id] || ""}
                  onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })}
                  placeholder="Tulis jawaban esai Anda..."
                  rows={4}
                />
              )}

              {q.question_type === "ordering" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Urutkan item (satu per baris):</p>
                  <Textarea
                    value={(answers[q.id] || []).join("\n")}
                    onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value.split("\n").filter(Boolean) })}
                    placeholder="Item 1&#10;Item 2&#10;Item 3"
                    rows={4}
                  />
                </div>
              )}

              {q.question_type === "matching" && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground">Pasangkan item (format JSON):</p>
                  <Textarea
                    value={typeof answers[q.id] === "string" ? answers[q.id] : JSON.stringify(answers[q.id] || [], null, 2)}
                    onChange={(e) => {
                      try { setAnswers({ ...answers, [q.id]: JSON.parse(e.target.value) }); } catch {
                        setAnswers({ ...answers, [q.id]: e.target.value });
                      }
                    }}
                    placeholder={`[{"left":"A","right":"1"}]`}
                    rows={4}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        <Button onClick={() => submitQuiz.mutate()} disabled={submitQuiz.isPending} className="w-full" size="lg">
          {submitQuiz.isPending ? "Mengirim..." : "Selesai & Kirim"}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Kuis & Ujian</h1>
        <p className="text-muted-foreground font-body mt-1">Kerjakan kuis yang tersedia</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1, 2].map(i => <Skeleton key={i} className="h-24 w-full" />)}</div>
      ) : quizzes?.length ? (
        <div className="space-y-3">
          {quizzes.map((q: any) => {
            const attempt = myAttempts?.find((a: any) => a.quiz_id === q.id && a.status === "completed");
            return (
              <Card key={q.id} className="hover:shadow-sm transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-start gap-4">
                      <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                        <FileQuestion className="h-5 w-5 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-heading font-semibold">{q.title}</h3>
                        <div className="flex gap-4 mt-1 text-xs text-muted-foreground font-body">
                          <span>{q.questions?.[0]?.count || 0} soal</span>
                          <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{q.time_limit_minutes} menit</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {attempt ? (
                        <>
                          <span className="font-heading font-bold text-lg text-success">{Number(attempt.score).toFixed(0)}%</span>
                          <Badge variant="secondary"><CheckCircle className="h-3 w-3 mr-1" />Selesai</Badge>
                        </>
                      ) : (
                        <>
                          <Badge variant="default"><AlertCircle className="h-3 w-3 mr-1" />Tersedia</Badge>
                          <Button size="sm" onClick={() => handleStartQuiz(q)}>Kerjakan</Button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <FileQuestion className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Kuis</h3>
            <p className="text-muted-foreground font-body">Belum ada kuis yang tersedia saat ini.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuizzesPage;
