import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface Course {
  id: string;
  title: string;
  description: string | null;
  teacher_id: string | null;
  teacher_name: string;
  thumbnail_url: string | null;
  status: string;
  created_at: string;
  chapters: {
    id: string;
    title: string;
    sort_order: number;
    lessons: {
      id: string;
      title: string;
      sort_order: number;
    }[];
  }[];
}

export interface EnrolledCourse extends Course {
  enrolled_at: string;
  totalLessons: number;
  completedLessons: number;
  progress: number;
}

export const useCourses = () => {
  return useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("courses")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
};

export const useEnrolledCourses = () => {
  return useQuery({
    queryKey: ["enrolled-courses"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      // Get enrollments
      const { data: enrollments, error: enrollError } = await supabase
        .from("enrollments")
        .select("course_id, enrolled_at")
        .eq("user_id", user.id);
      if (enrollError) throw enrollError;
      if (!enrollments?.length) return [];

      const courseIds = enrollments.map(e => e.course_id);

      // Get courses with chapters and lessons
      const { data: courses, error: courseError } = await supabase
        .from("courses")
        .select("*")
        .in("id", courseIds);
      if (courseError) throw courseError;

      // Get chapters for these courses
      const { data: chapters, error: chapError } = await supabase
        .from("chapters")
        .select("*")
        .in("course_id", courseIds)
        .order("sort_order");
      if (chapError) throw chapError;

      // Get lessons for these chapters
      const chapterIds = (chapters || []).map(c => c.id);
      const { data: lessons, error: lessonError } = await supabase
        .from("lessons")
        .select("*")
        .in("chapter_id", chapterIds.length ? chapterIds : ["00000000-0000-0000-0000-000000000000"])
        .order("sort_order");
      if (lessonError) throw lessonError;

      // Get user's lesson progress
      const lessonIds = (lessons || []).map(l => l.id);
      const { data: progress, error: progError } = await supabase
        .from("lesson_progress")
        .select("*")
        .eq("user_id", user.id)
        .in("lesson_id", lessonIds.length ? lessonIds : ["00000000-0000-0000-0000-000000000000"]);
      if (progError) throw progError;

      const completedSet = new Set((progress || []).filter(p => p.completed).map(p => p.lesson_id));

      // Assemble
      return (courses || []).map(course => {
        const courseChapters = (chapters || []).filter(c => c.course_id === course.id);
        const courseLessons = (lessons || []).filter(l =>
          courseChapters.some(c => c.id === l.chapter_id)
        );
        const totalLessons = courseLessons.length;
        const completedLessons = courseLessons.filter(l => completedSet.has(l.id)).length;
        const enrollment = enrollments.find(e => e.course_id === course.id);

        return {
          ...course,
          enrolled_at: enrollment?.enrolled_at || "",
          chapters: courseChapters.map(ch => ({
            ...ch,
            lessons: courseLessons.filter(l => l.chapter_id === ch.id),
          })),
          totalLessons,
          completedLessons,
          progress: totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0,
        } as EnrolledCourse;
      });
    },
  });
};

export const useDashboardStats = () => {
  return useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { activeCourses: 0, completedQuizzes: 0, pendingAssignments: 0, activeForums: 0 };

      const { count: enrollmentCount } = await supabase
        .from("enrollments")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id);

      return {
        activeCourses: enrollmentCount || 0,
        completedQuizzes: 0,
        pendingAssignments: 0,
        activeForums: 0,
      };
    },
  });
};
