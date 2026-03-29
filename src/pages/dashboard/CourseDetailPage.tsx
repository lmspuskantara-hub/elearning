import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useUserRole } from "@/hooks/use-role";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Progress } from "@/components/ui/progress";
import {
  ArrowLeft, BookOpen, PlusCircle, Play, CheckCircle2,
  FileText, Video, File, Trash2, Edit, GripVertical
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const CourseDetailPage = () => {
  const { courseId } = useParams<{ courseId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: userRole } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const isTeacherOrAdmin = userRole?.isTeacher || userRole?.isAdmin;

  // Chapter form
  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [editChapterId, setEditChapterId] = useState<string | null>(null);

  // Lesson form
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonChapterId, setLessonChapterId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContentType, setLessonContentType] = useState("text");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonFileUrl, setLessonFileUrl] = useState("");
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [lessonFile, setLessonFile] = useState<File | null>(null);

  // Active lesson view
  const [activeLesson, setActiveLesson] = useState<any>(null);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!courseId,
  });

  const { data: chapters } = useQuery({
    queryKey: ["course-chapters", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("chapters")
        .select("*")
        .eq("course_id", courseId!)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!courseId,
  });

  const { data: lessons } = useQuery({
    queryKey: ["course-lessons", courseId],
    queryFn: async () => {
      if (!chapters?.length) return [];
      const chapterIds = chapters.map((c) => c.id);
      const { data, error } = await supabase
        .from("lessons")
        .select("*")
        .in("chapter_id", chapterIds)
        .order("sort_order");
      if (error) throw error;
      return data || [];
    },
    enabled: !!chapters?.length,
  });

  const { data: progress } = useQuery({
    queryKey: ["lesson-progress", courseId, user?.id],
    queryFn: async () => {
      if (!lessons?.length) return [];
      const lessonIds = lessons.map((l) => l.id);
      const { data } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user!.id)
        .in("lesson_id", lessonIds);
      return data || [];
    },
    enabled: !!lessons?.length && !!user,
  });

  const completedLessonIds = new Set(progress?.filter((p) => p.completed).map((p) => p.lesson_id) || []);
  const totalLessons = lessons?.length || 0;
  const completedCount = completedLessonIds.size;
  const progressPercent = totalLessons > 0 ? Math.round((completedCount / totalLessons) * 100) : 0;

  // --- Mutations ---
  const saveChapter = useMutation({
    mutationFn: async () => {
      if (editChapterId) {
        const { error } = await supabase.from("chapters").update({ title: chapterTitle }).eq("id", editChapterId);
        if (error) throw error;
      } else {
        const sortOrder = (chapters?.length || 0) + 1;
        const { error } = await supabase.from("chapters").insert({
          course_id: courseId!,
          title: chapterTitle,
          sort_order: sortOrder,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editChapterId ? "Bab diperbarui!" : "Bab ditambahkan!" });
      queryClient.invalidateQueries({ queryKey: ["course-chapters", courseId] });
      setChapterOpen(false);
      setChapterTitle("");
      setEditChapterId(null);
    },
  });

  const deleteChapter = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("chapters").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-chapters", courseId] });
      queryClient.invalidateQueries({ queryKey: ["course-lessons", courseId] });
    },
  });

  const saveLesson = useMutation({
    mutationFn: async () => {
      let fileUrl = lessonFileUrl || null;

if (lessonContentType === "pdf" && lessonFile) {
  const fileName = `${Date.now()}-${lessonFile.name}`;

  const { error: uploadError } = await supabase.storage
    .from("lesson-files")
    .upload(fileName, lessonFile);

  if (uploadError) throw uploadError;

  const { data: publicUrl } = supabase.storage
    .from("lesson-files")
    .getPublicUrl(fileName);

  fileUrl = publicUrl.publicUrl;
}
      const lessonData = {
        title: lessonTitle,
        content_type: lessonContentType,
        content: lessonContent || null,
        video_url: lessonVideoUrl || null,
        file_url: fileUrl,
      };
      if (editLessonId) {
        const { error } = await supabase.from("lessons").update(lessonData).eq("id", editLessonId);
        if (error) throw error;
      } else {
        const chapterLessons = lessons?.filter((l) => l.chapter_id === lessonChapterId) || [];
        const { error } = await supabase.from("lessons").insert({
          ...lessonData,
          chapter_id: lessonChapterId,
          sort_order: chapterLessons.length + 1,
        });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({ title: editLessonId ? "Pelajaran diperbarui!" : "Pelajaran ditambahkan!" });
      queryClient.invalidateQueries({ queryKey: ["course-lessons", courseId] });
      resetLessonForm();
      setLessonFile(null);
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("lessons").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-lessons", courseId] }),
  });

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      const { error } = await supabase.from("lesson_progress").upsert(
        { user_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" }
      );
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] }),
  });

  const resetLessonForm = () => {
    setLessonOpen(false);
    setLessonTitle("");
    setLessonContentType("text");
    setLessonContent("");
    setLessonVideoUrl("");
    setLessonFileUrl("");
    setEditLessonId(null);
    setLessonChapterId("");
  };

  const handleEditLesson = (lesson: any) => {
    setLessonTitle(lesson.title);
    setLessonContentType(lesson.content_type);
    setLessonContent(lesson.content || "");
    setLessonVideoUrl(lesson.video_url || "");
    setLessonFileUrl(lesson.file_url || "");
    setEditLessonId(lesson.id);
    setLessonChapterId(lesson.chapter_id);
    setLessonOpen(true);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  const contentTypeIcon = (type: string) => {
    switch (type) {
      case "video": return <Video className="h-4 w-4 text-accent" />;
      case "pdf": return <File className="h-4 w-4 text-destructive" />;
      default: return <FileText className="h-4 w-4 text-primary" />;
    }
  };

  if (isLoading) {
    return <div className="space-y-4"><Skeleton className="h-8 w-64" /><Skeleton className="h-64 w-full" /></div>;
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <h2 className="font-heading text-xl">Kursus tidak ditemukan</h2>
        <Button variant="ghost" className="mt-4" onClick={() => navigate(-1)}>Kembali</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl md:text-3xl font-heading font-bold text-primary">{course.title}</h1>
            <Badge variant={course.status === "published" ? "default" : "secondary"}>
              {course.status === "published" ? "Publik" : "Draft"}
            </Badge>
          </div>
          <p className="text-muted-foreground font-body mt-1">{course.description || "Belum ada deskripsi"}</p>
          <p className="text-sm text-muted-foreground font-body mt-1">Pengajar: {course.teacher_name}</p>
        </div>
      </div>

      {/* Progress bar for students */}
      {!isTeacherOrAdmin && totalLessons > 0 && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm font-body mb-2">
              <span>Progres Belajar</span>
              <span className="font-semibold">{completedCount}/{totalLessons} pelajaran ({progressPercent}%)</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Active Lesson Viewer */}
      {activeLesson && (
        <Card className="border-accent/30 bg-accent/5">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="font-heading text-lg flex items-center gap-2">
                {contentTypeIcon(activeLesson.content_type)}
                {activeLesson.title}
              </CardTitle>
              <div className="flex gap-2">
                {!isTeacherOrAdmin && !completedLessonIds.has(activeLesson.id) && (
                  <Button size="sm" onClick={() => markComplete.mutate(activeLesson.id)}>
                    <CheckCircle2 className="h-4 w-4 mr-1" /> Tandai Selesai
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)}>Tutup</Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {activeLesson.content_type === "video" && activeLesson.video_url && (
              <div className="aspect-video rounded-lg overflow-hidden mb-4">
                <iframe
                  src={getYouTubeEmbedUrl(activeLesson.video_url)}
                  className="w-full h-full"
                  allowFullScreen
                  title={activeLesson.title}
                />
              </div>
            )}
            {activeLesson.content_type === "pdf" && activeLesson.file_url && (
              <div className="mb-4">
                <a href={activeLesson.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" className="gap-2">
                    <File className="h-4 w-4" /> Buka File PDF
                  </Button>
                </a>
              </div>
            )}
            {activeLesson.content && (
              <div className="prose prose-sm max-w-none font-body whitespace-pre-wrap">
                {activeLesson.content}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Teacher/Admin: Add Chapter & Lesson */}
      {isTeacherOrAdmin && (
        <div className="flex gap-2 flex-wrap">
          <Dialog open={chapterOpen} onOpenChange={(v) => { if (!v) { setChapterTitle(""); setEditChapterId(null); } setChapterOpen(v); }}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Tambah Bab</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle className="font-heading">{editChapterId ? "Edit Bab" : "Tambah Bab Baru"}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Judul Bab</Label>
                  <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Contoh: Bab 1 - Pendahuluan" />
                </div>
                <Button onClick={() => saveChapter.mutate()} disabled={!chapterTitle.trim() || saveChapter.isPending} className="w-full">
                  {saveChapter.isPending ? "Menyimpan..." : editChapterId ? "Perbarui" : "Tambah Bab"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {chapters && chapters.length > 0 && (
            <Dialog open={lessonOpen} onOpenChange={(v) => { if (!v) resetLessonForm(); setLessonOpen(v); }}>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Tambah Pelajaran</Button>
              </DialogTrigger>
              <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle className="font-heading">{editLessonId ? "Edit Pelajaran" : "Tambah Pelajaran"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Bab</Label>
                    <Select value={lessonChapterId} onValueChange={setLessonChapterId}>
                      <SelectTrigger><SelectValue placeholder="Pilih bab" /></SelectTrigger>
                      <SelectContent>
                        {chapters.map((ch) => (
                          <SelectItem key={ch.id} value={ch.id}>{ch.title}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Judul Pelajaran</Label>
                    <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} placeholder="Judul pelajaran" />
                  </div>
                  <div className="space-y-2">
                    <Label>Tipe Konten</Label>
                    <Select value={lessonContentType} onValueChange={setLessonContentType}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Teks</SelectItem>
                        <SelectItem value="video">Video YouTube</SelectItem>
                        <SelectItem value="pdf">File PDF</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {lessonContentType === "video" && (
                    <div className="space-y-2">
                      <Label>URL Video YouTube</Label>
                      <Input value={lessonVideoUrl} onChange={(e) => setLessonVideoUrl(e.target.value)} placeholder="https://youtube.com/watch?v=..." />
                    </div>
                  )}
                  {lessonContentType === "pdf" && (
  <div className="space-y-2">
    <Label>Upload File PDF</Label>
    <Input
      type="file"
      accept="application/pdf"
      onChange={(e) => {
        if (e.target.files && e.target.files[0]) {
          setLessonFile(e.target.files[0]);
        }
      }}
    />
  </div>
)}
                  <div className="space-y-2">
                    <Label>Konten Teks {lessonContentType !== "text" && "(opsional)"}</Label>
                    <Textarea
                      value={lessonContent}
                      onChange={(e) => setLessonContent(e.target.value)}
                      placeholder="Tulis konten pelajaran..."
                      rows={6}
                    />
                  </div>
                  <Button
                    onClick={() => saveLesson.mutate()}
                    disabled={!lessonTitle.trim() || !lessonChapterId || saveLesson.isPending}
                    className="w-full"
                  >
                    {saveLesson.isPending ? "Menyimpan..." : editLessonId ? "Perbarui" : "Tambah Pelajaran"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      )}

      {/* Chapters & Lessons */}
      {chapters && chapters.length > 0 ? (
        <Accordion type="multiple" defaultValue={chapters.map((c) => c.id)} className="space-y-3">
          {chapters.map((chapter, idx) => {
            const chapterLessons = lessons?.filter((l) => l.chapter_id === chapter.id) || [];
            const chapterCompleted = chapterLessons.filter((l) => completedLessonIds.has(l.id)).length;
            return (
              <AccordionItem key={chapter.id} value={chapter.id} className="border rounded-lg px-4">
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 flex-1 text-left">
                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-sm font-bold text-primary shrink-0">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-heading font-semibold">{chapter.title}</p>
                      <p className="text-xs text-muted-foreground font-body">
                        {chapterLessons.length} pelajaran
                        {!isTeacherOrAdmin && chapterLessons.length > 0 && ` · ${chapterCompleted}/${chapterLessons.length} selesai`}
                      </p>
                    </div>
                    {isTeacherOrAdmin && (
                      <div className="flex gap-1 mr-2" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setChapterTitle(chapter.title); setEditChapterId(chapter.id); setChapterOpen(true); }}>
                          <Edit className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteChapter.mutate(chapter.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      </div>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-2 py-2">
                    {chapterLessons.length > 0 ? chapterLessons.map((lesson) => {
                      const isCompleted = completedLessonIds.has(lesson.id);
                      const isActive = activeLesson?.id === lesson.id;
                      return (
                        <div
                          key={lesson.id}
                          className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
                            isActive ? "bg-accent/15 border border-accent/30" : "hover:bg-muted/50"
                          }`}
                          onClick={() => setActiveLesson(lesson)}
                        >
                          {isCompleted ? (
                            <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          ) : (
                            <Play className="h-5 w-5 text-muted-foreground shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className={`font-body text-sm ${isCompleted ? "text-muted-foreground" : ""}`}>{lesson.title}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {contentTypeIcon(lesson.content_type)}
                            {isTeacherOrAdmin && (
                              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleEditLesson(lesson)}>
                                  <Edit className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => deleteLesson.mutate(lesson.id)}>
                                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    }) : (
                      <p className="text-sm text-muted-foreground font-body py-2 text-center">Belum ada pelajaran di bab ini.</p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      ) : (
        <Card>
          <CardContent className="py-12 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="font-heading font-semibold text-lg mb-2">Belum Ada Bab</h3>
            <p className="text-muted-foreground font-body">
              {isTeacherOrAdmin ? "Mulai tambahkan bab dan pelajaran untuk kursus ini." : "Kursus ini belum memiliki konten."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default CourseDetailPage;