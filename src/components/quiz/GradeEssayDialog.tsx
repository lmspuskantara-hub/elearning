import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, ClipboardList } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Props {
  quizId: string;
  quizTitle: string;
}

const GradeEssayDialog = ({ quizId, quizTitle }: Props) => {
  const [open, setOpen] = useState(false);
  const [gradingId, setGradingId] = useState<string | null>(null);
  const [points, setPoints] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get attempts for this quiz
  const { data: attempts } = useQuery({
    queryKey: ["quiz-attempts-grade", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quiz_attempts")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("status", "completed")
        .order("completed_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Get essay questions for this quiz
  const { data: essayQuestions } = useQuery({
    queryKey: ["essay-questions", quizId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("questions")
        .select("*")
        .eq("quiz_id", quizId)
        .eq("question_type", "essay")
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: open,
  });

  // Get answers for all attempts
  const { data: answers } = useQuery({
    queryKey: ["essay-answers", quizId],
    queryFn: async () => {
      if (!attempts?.length || !essayQuestions?.length) return [];
      const attemptIds = attempts.map((a) => a.id);
      const questionIds = essayQuestions.map((q) => q.id);
      const { data, error } = await supabase
        .from("quiz_answers")
        .select("*")
        .in("attempt_id", attemptIds)
        .in("question_id", questionIds);
      if (error) throw error;
      return data || [];
    },
    enabled: !!attempts?.length && !!essayQuestions?.length,
  });

  const { data: profiles } = useQuery({
    queryKey: ["profiles-for-grading"],
    queryFn: async () => {
      const { data, error } = await supabase.from("profiles").select("id, full_name");
      if (error) throw error;
      return Object.fromEntries((data || []).map((p) => [p.id, p.full_name]));
    },
    enabled: open,
  });

  const gradeEssay = useMutation({
    mutationFn: async ({ answerId, pointsEarned, attemptId }: { answerId: string; pointsEarned: number; attemptId: string }) => {
      // Update answer points
      const { error } = await supabase
        .from("quiz_answers")
        .update({ points_earned: pointsEarned, is_correct: pointsEarned > 0 })
        .eq("id", answerId);
      if (error) throw error;

      // Recalculate attempt score
      const { data: allAnswers, error: aErr } = await supabase
        .from("quiz_answers")
        .select("points_earned, question_id")
        .eq("attempt_id", attemptId);
      if (aErr) throw aErr;

      const { data: allQuestions, error: qErr } = await supabase
        .from("questions")
        .select("id, points")
        .eq("quiz_id", quizId);
      if (qErr) throw qErr;

      const totalPoints = (allQuestions || []).reduce((s, q) => s + q.points, 0);
      const earnedPoints = (allAnswers || []).reduce((s, a) => s + (a.points_earned || 0), 0);
      const newScore = totalPoints > 0 ? (earnedPoints / totalPoints) * 100 : 0;

      await supabase.from("quiz_attempts").update({
        score: newScore,
        total_points: totalPoints,
      }).eq("id", attemptId);
    },
    onSuccess: () => {
      toast({ title: "Nilai esai disimpan!" });
      queryClient.invalidateQueries({ queryKey: ["essay-answers"] });
      queryClient.invalidateQueries({ queryKey: ["quiz-attempts-grade"] });
      queryClient.invalidateQueries({ queryKey: ["my-attempts"] });
      setGradingId(null);
      setPoints("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const hasEssays = essayQuestions && essayQuestions.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <ClipboardList className="h-4 w-4" /> Koreksi Esai
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Koreksi Esai: {quizTitle}</DialogTitle>
        </DialogHeader>

        {!hasEssays ? (
          <p className="text-muted-foreground text-center py-8">Kuis ini tidak memiliki soal esai.</p>
        ) : !attempts?.length ? (
          <p className="text-muted-foreground text-center py-8">Belum ada siswa yang mengerjakan.</p>
        ) : (
          <div className="space-y-4">
            {attempts.map((attempt: any) => {
              const studentAnswers = (answers || []).filter((a) => a.attempt_id === attempt.id);
              if (!studentAnswers.length) return null;

              return (
                <Card key={attempt.id}>
                  <CardContent className="pt-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-heading font-semibold text-sm">
                        {profiles?.[attempt.user_id] || "Siswa"}
                      </p>
                      <Badge variant="secondary">Skor: {Number(attempt.score || 0).toFixed(0)}%</Badge>
                    </div>

                    {essayQuestions.map((eq: any) => {
                      const ans = studentAnswers.find((a) => a.question_id === eq.id);
                      if (!ans) return null;
                      const answerText = typeof ans.answer === "string" ? ans.answer : JSON.stringify(ans.answer);

                      return (
                        <div key={eq.id} className="space-y-2 border-t pt-2">
                          <p className="text-sm font-medium">{eq.question_text}</p>
                          <p className="text-xs text-muted-foreground">Maks: {eq.points} poin</p>
                          <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                            {answerText?.replace(/^"|"$/g, "") || "(tidak dijawab)"}
                          </div>

                          {gradingId === ans.id ? (
                            <div className="flex gap-2 items-end">
                              <div>
                                <label className="text-xs font-medium">Poin (0-{eq.points})</label>
                                <Input type="number" min={0} max={eq.points} value={points}
                                  onChange={(e) => setPoints(e.target.value)} className="w-24" />
                              </div>
                              <Button size="sm" onClick={() => gradeEssay.mutate({
                                answerId: ans.id,
                                pointsEarned: parseInt(points) || 0,
                                attemptId: attempt.id,
                              })} disabled={gradeEssay.isPending}>
                                Simpan
                              </Button>
                              <Button size="sm" variant="ghost" onClick={() => setGradingId(null)}>Batal</Button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              {ans.points_earned !== null && ans.points_earned > 0 ? (
                                <Badge variant="secondary" className="gap-1">
                                  <CheckCircle className="h-3 w-3" /> {ans.points_earned}/{eq.points} poin
                                </Badge>
                              ) : (
                                <Badge variant="destructive">Belum Dinilai</Badge>
                              )}
                              <Button size="sm" variant="outline" onClick={() => {
                                setGradingId(ans.id);
                                setPoints(ans.points_earned?.toString() || "");
                              }}>
                                {ans.points_earned ? "Edit" : "Beri Nilai"}
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GradeEssayDialog;
