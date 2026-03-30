import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle, Eye, Paperclip } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

interface Props {
  assignmentId: string;
  assignmentTitle: string;
}

const GradeSubmissionsDialog = ({ assignmentId, assignmentTitle }: Props) => {
  const [open, setOpen] = useState(false);
  const [grading, setGrading] = useState<string | null>(null);
  const [score, setScore] = useState("");
  const [feedback, setFeedback] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: submissions } = useQuery({
    queryKey: ["assignment-submissions", assignmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assignment_submissions")
        .select("*")
        .eq("assignment_id", assignmentId)
        .order("submitted_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: open,
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

  const gradeSubmission = useMutation({
    mutationFn: async (submissionId: string) => {
      const { error } = await supabase
        .from("assignment_submissions")
        .update({
          score: parseInt(score),
          feedback: feedback || null,
          graded_at: new Date().toISOString(),
        })
        .eq("id", submissionId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Nilai disimpan!" });
      queryClient.invalidateQueries({ queryKey: ["assignment-submissions", assignmentId] });
      queryClient.invalidateQueries({ queryKey: ["my-submissions"] });
      setGrading(null);
      setScore("");
      setFeedback("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Eye className="h-4 w-4" /> Koreksi
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-heading">Koreksi Tugas: {assignmentTitle}</DialogTitle>
        </DialogHeader>

        {!submissions?.length ? (
          <p className="text-muted-foreground text-center py-8">Belum ada yang mengumpulkan.</p>
        ) : (
          <div className="space-y-3">
            {submissions.map((sub: any) => (
              <Card key={sub.id}>
                <CardContent className="pt-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-heading font-semibold text-sm">
                        {profiles?.[sub.user_id] || "Siswa"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Dikumpulkan: {format(new Date(sub.submitted_at), "dd MMM yyyy HH:mm")}
                      </p>
                    </div>
                    {sub.score !== null ? (
                      <Badge variant="secondary" className="gap-1">
                        <CheckCircle className="h-3 w-3" /> Nilai: {sub.score}
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Belum Dinilai</Badge>
                    )}
                  </div>

                  {sub.content && (
                    <div className="bg-muted/50 rounded-md p-3 text-sm whitespace-pre-wrap">
                      {sub.content}
                    </div>
                  )}

                  {sub.file_url && (
                    <a href={sub.file_url} target="_blank" rel="noopener noreferrer"
                      className="text-primary text-xs flex items-center gap-1 hover:underline">
                      <Paperclip className="h-3 w-3" /> Lihat File
                    </a>
                  )}

                  {sub.feedback && (
                    <div className="bg-primary/5 rounded-md p-3 text-sm">
                      <p className="text-xs font-semibold mb-1">Feedback:</p>
                      {sub.feedback}
                    </div>
                  )}

                  {grading === sub.id ? (
                    <div className="space-y-2 border-t pt-3">
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-xs font-medium">Nilai (0-100)</label>
                          <Input type="number" min={0} max={100} value={score}
                            onChange={(e) => setScore(e.target.value)} placeholder="85" />
                        </div>
                      </div>
                      <div>
                        <label className="text-xs font-medium">Feedback (opsional)</label>
                        <Textarea value={feedback} onChange={(e) => setFeedback(e.target.value)}
                          placeholder="Tulis feedback..." rows={2} />
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" onClick={() => gradeSubmission.mutate(sub.id)}
                          disabled={!score || gradeSubmission.isPending}>
                          {gradeSubmission.isPending ? "Menyimpan..." : "Simpan Nilai"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => setGrading(null)}>Batal</Button>
                      </div>
                    </div>
                  ) : (
                    <Button size="sm" variant="outline" onClick={() => {
                      setGrading(sub.id);
                      setScore(sub.score?.toString() || "");
                      setFeedback(sub.feedback || "");
                    }}>
                      {sub.score !== null ? "Edit Nilai" : "Beri Nilai"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default GradeSubmissionsDialog;
