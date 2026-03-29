import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, User, Clock, Plus, Trash2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { id as localeId } from "date-fns/locale";

const ForumPage = () => {
  const { user } = useAuth();
  const { data: roleData } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isAdmin = roleData?.isAdmin;

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [courseId, setCourseId] = useState("");
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState("");

  const { data: courses } = useQuery({
    queryKey: ["courses-for-forum"],
    queryFn: async () => {
      const { data, error } = await supabase.from("courses").select("id, title").order("title");
      if (error) throw error;
      return data || [];
    },
  });

  const { data: topics, isLoading } = useQuery({
    queryKey: ["forum-topics"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_topics")
        .select("*, courses(title), profiles:author_id(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch reply counts
  const { data: replyCounts } = useQuery({
    queryKey: ["forum-reply-counts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("forum_replies")
        .select("topic_id");
      if (error) throw error;
      const counts: Record<string, number> = {};
      (data || []).forEach((r: any) => {
        counts[r.topic_id] = (counts[r.topic_id] || 0) + 1;
      });
      return counts;
    },
  });

  // Fetch replies for selected topic
  const { data: replies } = useQuery({
    queryKey: ["forum-replies", selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return [];
      const { data, error } = await supabase
        .from("forum_replies")
        .select("*, profiles:author_id(full_name)")
        .eq("topic_id", selectedTopic)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!selectedTopic,
  });

  const createTopic = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("forum_topics").insert({
        title,
        content,
        course_id: courseId || null,
        author_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Topik berhasil dibuat!" });
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      setCreateOpen(false);
      setTitle("");
      setContent("");
      setCourseId("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const deleteTopic = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("forum_topics").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Topik dihapus" });
      queryClient.invalidateQueries({ queryKey: ["forum-topics"] });
      setSelectedTopic(null);
    },
  });

  const postReply = useMutation({
    mutationFn: async () => {
      if (!user || !selectedTopic) throw new Error("Error");
      const { error } = await supabase.from("forum_replies").insert({
        topic_id: selectedTopic,
        content: replyContent,
        author_id: user.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Balasan terkirim!" });
      queryClient.invalidateQueries({ queryKey: ["forum-replies", selectedTopic] });
      queryClient.invalidateQueries({ queryKey: ["forum-reply-counts"] });
      setReplyContent("");
    },
    onError: (e: any) => toast({ variant: "destructive", title: "Gagal", description: e.message }),
  });

  const currentTopic = topics?.find((t: any) => t.id === selectedTopic);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
        </div>
      </div>
    );
  }

  // Detail view for a topic
  if (selectedTopic && currentTopic) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" onClick={() => setSelectedTopic(null)}>← Kembali ke Forum</Button>
        <Card>
          <CardContent className="pt-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h2 className="font-heading font-bold text-xl">{currentTopic.title}</h2>
                <div className="flex gap-2 mt-1 text-sm text-muted-foreground">
                  {currentTopic.courses?.title && <Badge variant="secondary">{currentTopic.courses.title}</Badge>}
                  <span className="flex items-center gap-1"><User className="h-3 w-3" />{(currentTopic as any).profiles?.full_name || "Anonim"}</span>
                  <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatDistanceToNow(new Date(currentTopic.created_at), { locale: localeId, addSuffix: true })}</span>
                </div>
              </div>
              {(currentTopic.author_id === user?.id || isAdmin) && (
                <Button size="sm" variant="destructive" onClick={() => deleteTopic.mutate(currentTopic.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
            {currentTopic.content && <p className="font-body text-foreground/80">{currentTopic.content}</p>}
          </CardContent>
        </Card>

        <h3 className="font-heading font-semibold">Balasan ({replies?.length || 0})</h3>
        <div className="space-y-3">
          {(replies || []).map((r: any) => (
            <Card key={r.id}>
              <CardContent className="pt-4 pb-4">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">{r.profiles?.full_name || "Anonim"}</p>
                    <p className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(r.created_at), { locale: localeId, addSuffix: true })}</p>
                    <p className="mt-2 font-body text-sm">{r.content}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex gap-2">
          <Textarea
            placeholder="Tulis balasan..."
            value={replyContent}
            onChange={(e) => setReplyContent(e.target.value)}
            className="flex-1"
            rows={2}
          />
          <Button onClick={() => postReply.mutate()} disabled={!replyContent || postReply.isPending} className="shrink-0">
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">Forum Diskusi</h1>
          <p className="text-muted-foreground font-body mt-1">Berdiskusi dan bertanya dengan guru dan sesama siswa</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2"><Plus className="h-4 w-4" /> Buat Topik</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Buat Topik Baru</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <Input placeholder="Judul topik" value={title} onChange={(e) => setTitle(e.target.value)} />
              <Textarea placeholder="Isi diskusi..." value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
              <Select value={courseId} onValueChange={setCourseId}>
                <SelectTrigger><SelectValue placeholder="Pilih kursus (opsional)" /></SelectTrigger>
                <SelectContent>
                  {(courses || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button onClick={() => createTopic.mutate()} disabled={!title || createTopic.isPending} className="w-full">
                Buat Topik
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {!topics?.length ? (
        <Card>
          <CardContent className="py-12 text-center">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Diskusi</h3>
            <p className="text-muted-foreground font-body">Mulai diskusi pertama!</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {topics.map((t: any) => (
            <Card key={t.id} className="hover:shadow-sm transition-shadow cursor-pointer" onClick={() => setSelectedTopic(t.id)}>
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5 text-accent" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-heading font-semibold truncate">{t.title}</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {t.courses?.title && <Badge variant="secondary" className="text-xs">{t.courses.title}</Badge>}
                      <span className="text-xs text-muted-foreground flex items-center gap-1">
                        <User className="h-3 w-3" />{t.profiles?.full_name || "Anonim"}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-heading font-semibold">{replyCounts?.[t.id] || 0} balasan</p>
                    <p className="text-xs text-muted-foreground flex items-center gap-1 justify-end">
                      <Clock className="h-3 w-3" />{formatDistanceToNow(new Date(t.created_at), { locale: localeId, addSuffix: true })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default ForumPage;
