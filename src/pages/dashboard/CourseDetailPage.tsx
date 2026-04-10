import { useState, useEffect } from "react";
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
  FileText, Video, File, Trash2, Edit, VideoIcon, ExternalLink
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

  // --- State Management ---
  const [meetingUrl, setMeetingUrl] = useState("");
  const [chapterOpen, setChapterOpen] = useState(false);
  const [chapterTitle, setChapterTitle] = useState("");
  const [editChapterId, setEditChapterId] = useState<string | null>(null);
  const [lessonOpen, setLessonOpen] = useState(false);
  const [lessonChapterId, setLessonChapterId] = useState("");
  const [lessonTitle, setLessonTitle] = useState("");
  const [lessonContentType, setLessonContentType] = useState("text");
  const [lessonContent, setLessonContent] = useState("");
  const [lessonVideoUrl, setLessonVideoUrl] = useState("");
  const [lessonFileUrl, setLessonFileUrl] = useState("");
  const [editLessonId, setEditLessonId] = useState<string | null>(null);
  const [lessonFile, setLessonFile] = useState<File | null>(null);
  const [activeLesson, setActiveLesson] = useState<any>(null);

  // --- Queries ---
  const { data: course, isLoading } = useQuery({
    queryKey: ["course-detail", courseId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .eq("id", courseId!)
        .single();
      if (error) throw error;
      setMeetingUrl(data.meeting_url || "");
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
      if (!lessons?.length || !user) return [];
      const lessonIds = lessons.map((l) => l.id);
      const { data } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds);
      return data || [];
    },
    enabled: !!lessons?.length && !!user,
  });

  const completedLessonIds = new Set(progress?.filter((p) => p.completed).map((p) => p.lesson_id) || []);
  const totalLessons = lessons?.length || 0;
  const progressPercent = totalLessons > 0 ? Math.round((completedLessonIds.size / totalLessons) * 100) : 0;

  // --- Mutations ---
  const updateMeeting = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("courses")
        .update({ meeting_url: meetingUrl })
        .eq("id", courseId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: "Link pertemuan diperbarui!" });
      queryClient.invalidateQueries({ queryKey: ["course-detail", courseId] });
    },
  });

  const saveChapter = useMutation({
    mutationFn: async () => {
      if (editChapterId) {
        await supabase.from("chapters").update({ title: chapterTitle }).eq("id", editChapterId);
      } else {
        await supabase.from("chapters").insert({
          course_id: courseId!,
          title: chapterTitle,
          sort_order: (chapters?.length || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-chapters", courseId] });
      setChapterOpen(false);
      setChapterTitle("");
      setEditChapterId(null);
    },
  });

  const deleteChapter = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("chapters").delete().eq("id", id);
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
        await supabase.storage.from("lesson-files").upload(fileName, lessonFile);
        const { data: publicUrl } = supabase.storage.from("lesson-files").getPublicUrl(fileName);
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
        await supabase.from("lessons").update(lessonData).eq("id", editLessonId);
      } else {
        await supabase.from("lessons").insert({
          ...lessonData,
          chapter_id: lessonChapterId,
          sort_order: (lessons?.filter(l => l.chapter_id === lessonChapterId).length || 0) + 1,
        });
      }
    },
    onSuccess: () => {
      toast({ title: "Pelajaran disimpan!" });
      queryClient.invalidateQueries({ queryKey: ["course-lessons", courseId] });
      resetLessonForm();
    },
  });

  const deleteLesson = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("lessons").delete().eq("id", id);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["course-lessons", courseId] }),
  });

  const markComplete = useMutation({
    mutationFn: async (lessonId: string) => {
      await supabase.from("lesson_progress").upsert(
        { user_id: user!.id, lesson_id: lessonId, completed: true, completed_at: new Date().toISOString() },
        { onConflict: "user_id,lesson_id" }
      );
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["lesson-progress", courseId] }),
  });

  // --- Helpers ---
  const resetLessonForm = () => {
    setLessonOpen(false);
    setLessonTitle("");
    setLessonContentType("text");
    setLessonContent("");
    setLessonVideoUrl("");
    setEditLessonId(null);
    setLessonFile(null);
  };

  const getYouTubeEmbedUrl = (url: string) => {
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/))([^&\s?]+)/);
    return match ? `https://www.youtube.com/embed/${match[1]}` : url;
  };

  if (isLoading) return <div className="p-8 space-y-4"><Skeleton className="h-12 w-3/4" /><Skeleton className="h-64 w-full" /></div>;
  if (!course) return <div className="text-center p-20">Kursus tidak ditemukan.</div>;

  return (
    <div className="container mx-auto max-w-5xl py-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row justify-between gap-4 border-b pb-6">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ArrowLeft /></Button>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-primary">{course.title}</h1>
              <Badge variant={course.status === "published" ? "default" : "secondary"}>
                {course.status === "published" ? "Publik" : "Draft"}
              </Badge>
            </div>
            <p className="text-muted-foreground">{course.description || "Tidak ada deskripsi."}</p>
            <p className="text-sm mt-2 font-medium">Pengajar: {course.teacher_name}</p>
          </div>
        </div>

        {/* Meeting Link Section */}
        <div className="flex flex-col items-end gap-2">
          {course.meeting_url && (
            <a href={course.meeting_url} target="_blank" rel="noopener noreferrer">
              <Button className="bg-green-600 hover:bg-green-700 gap-2">
                <VideoIcon className="h-4 w-4" /> Gabung Kelas Online
              </Button>
            </a>
          )}
          {isTeacherOrAdmin && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Edit className="h-4 w-4" /> {course.meeting_url ? "Edit Link Meet" : "Set Link Meet"}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Link Tatap Muka Online</DialogTitle></DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>URL Google Meet (Manual dari Pengajar)</Label>
                    <Input 
                      placeholder="https://meet.google.com/xxx-yyyy-zzz"
                      value={meetingUrl}
                      onChange={(e) => setMeetingUrl(e.target.value)}
                    />
                  </div>
                  <Button className="w-full bg-primary" onClick={() => updateMeeting.mutate()} disabled={updateMeeting.isPending}>
                    Simpan Link
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Progress Section */}
      {!isTeacherOrAdmin && totalLessons > 0 && (
        <Card className="bg-muted/30">
          <CardContent className="py-4">
            <div className="flex justify-between text-sm mb-2 font-medium">
              <span>Progres Belajar</span>
              <span>{progressPercent}%</span>
            </div>
            <Progress value={progressPercent} className="h-2" />
          </CardContent>
        </Card>
      )}

      {/* Active Content Viewer */}
      {activeLesson && (
        <Card className="border-primary/20 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-xl flex items-center gap-2">
              {activeLesson.content_type === "video" ? <Video className="text-blue-500" /> : <FileText className="text-orange-500" />}
              {activeLesson.title}
            </CardTitle>
            <div className="flex gap-2">
              {!isTeacherOrAdmin && !completedLessonIds.has(activeLesson.id) && (
                <Button size="sm" variant="default" onClick={() => markComplete.mutate(activeLesson.id)}>Tandai Selesai</Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setActiveLesson(null)}>Tutup</Button>
            </div>
          </CardHeader>
          <CardContent>
            {activeLesson.content_type === "video" && activeLesson.video_url && (
              <div className="aspect-video rounded-lg overflow-hidden bg-black mb-4">
                <iframe src={getYouTubeEmbedUrl(activeLesson.video_url)} className="w-full h-full" allowFullScreen />
              </div>
            )}
            {activeLesson.content_type === "pdf" && activeLesson.file_url && (
              <div className="mb-4 p-4 border rounded-lg flex items-center justify-between bg-muted/20">
                <span className="text-sm font-medium">Dokumen Materi (PDF)</span>
                <a href={activeLesson.file_url} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-2"><ExternalLink className="h-4 w-4" /> Buka PDF</Button>
                </a>
              </div>
            )}
            <div className="prose max-w-none dark:prose-invert text-sm">{activeLesson.content}</div>
          </CardContent>
        </Card>
      )}

      {/* Management Buttons */}
      {isTeacherOrAdmin && (
        <div className="flex gap-3">
          <Dialog open={chapterOpen} onOpenChange={setChapterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Tambah Bab</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>{editChapterId ? "Edit Bab" : "Bab Baru"}</DialogTitle></DialogHeader>
              <div className="space-y-4 pt-4">
                <Input value={chapterTitle} onChange={(e) => setChapterTitle(e.target.value)} placeholder="Nama Bab..." />
                <Button className="w-full" onClick={() => saveChapter.mutate()} disabled={!chapterTitle}>Simpan</Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={lessonOpen} onOpenChange={setLessonOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="gap-2"><PlusCircle className="h-4 w-4" /> Tambah Pelajaran</Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader><DialogTitle>Detail Pelajaran</DialogTitle></DialogHeader>
              <div className="grid grid-cols-2 gap-4 pt-4">
                <div className="space-y-2 col-span-2">
                  <Label>Pilih Bab</Label>
                  <Select value={lessonChapterId} onValueChange={setLessonChapterId}>
                    <SelectTrigger><SelectValue placeholder="Pilih Bab" /></SelectTrigger>
                    <SelectContent>
                      {chapters?.map(c => <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label>Judul Pelajaran</Label>
                  <Input value={lessonTitle} onChange={(e) => setLessonTitle(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Tipe Konten</Label>
                  <Select value={lessonContentType} onValueChange={setLessonContentType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Teks Saja</SelectItem>
                      <SelectItem value="video">Video YouTube</SelectItem>
                      <SelectItem value="pdf">File PDF</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {lessonContentType === "video" && (
                  <div className="space-y-2">
                    <Label>URL YouTube</Label>
                    <Input value={lessonVideoUrl} onChange={(e) => setLessonVideoUrl(e.target.value)} />
                  </div>
                )}
                {lessonContentType === "pdf" && (
                  <div className="space-y-2">
                    <Label>File PDF</Label>
                    <Input type="file" accept="application/pdf" onChange={(e) => setLessonFile(e.target.files?.[0] || null)} />
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <Label>Isi Materi (Teks/Deskripsi)</Label>
                  <Textarea rows={5} value={lessonContent} onChange={(e) => setLessonContent(e.target.value)} />
                </div>
              </div>
              <Button className="w-full mt-4" onClick={() => saveLesson.mutate()} disabled={!lessonTitle || !lessonChapterId}>Simpan Pelajaran</Button>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Chapters & Lessons List */}
      <div className="space-y-4">
        {chapters?.map((chapter, idx) => {
          const chapterLessons = lessons?.filter(l => l.chapter_id === chapter.id) || [];
          return (
            <Accordion key={chapter.id} type="single" collapsible className="w-full border rounded-lg bg-card">
              <AccordionItem value={chapter.id} className="border-none px-4">
                <AccordionTrigger className="hover:no-underline py-4">
                  <div className="flex items-center gap-4 text-left">
                    <div className="bg-primary/10 text-primary w-8 h-8 rounded-full flex items-center justify-center font-bold">{idx + 1}</div>
                    <div>
                      <h3 className="font-semibold">{chapter.title}</h3>
                      <p className="text-xs text-muted-foreground">{chapterLessons.length} Pelajaran</p>
                    </div>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="pb-4">
                  <div className="space-y-2 mt-2">
                    {chapterLessons.map(lesson => (
                      <div key={lesson.id} className="flex items-center justify-between p-3 rounded-md hover:bg-muted/50 border border-transparent hover:border-border transition-all group">
                        <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => setActiveLesson(lesson)}>
                          {completedLessonIds.has(lesson.id) ? <CheckCircle2 className="text-green-500 h-5 w-5" /> : <Play className="h-5 w-5 text-muted-foreground" />}
                          <span className="text-sm font-medium">{lesson.title}</span>
                        </div>
                        {isTeacherOrAdmin && (
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => {
                              setLessonTitle(lesson.title);
                              setEditLessonId(lesson.id);
                              setLessonChapterId(chapter.id);
                              setLessonOpen(true);
                            }}><Edit className="h-3 w-3" /></Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => deleteLesson.mutate(lesson.id)}><Trash2 className="h-3 w-3" /></Button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          );
        })}
      </div>
    </div>
  );
};

export default CourseDetailPage;