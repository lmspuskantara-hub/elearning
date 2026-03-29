
-- Role enum and user_roles table (proper role management)
CREATE TYPE public.app_role AS ENUM ('admin', 'teacher', 'student');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'student',
  UNIQUE(user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checking
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- RLS for user_roles
CREATE POLICY "Users can view own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can manage roles" ON public.user_roles FOR ALL TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Auto-assign student role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'student');
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Quizzes table
CREATE TABLE public.quizzes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  time_limit_minutes INT,
  passing_score INT NOT NULL DEFAULT 70,
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quizzes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published quizzes visible to enrolled" ON public.quizzes FOR SELECT TO authenticated USING (
  is_published = true OR created_by = auth.uid()
);
CREATE POLICY "Teachers can create quizzes" ON public.quizzes FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Teachers can update own quizzes" ON public.quizzes FOR UPDATE TO authenticated USING (created_by = auth.uid());
CREATE POLICY "Teachers can delete own quizzes" ON public.quizzes FOR DELETE TO authenticated USING (created_by = auth.uid());

-- Questions table with 8 types
CREATE TABLE public.questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  question_type TEXT NOT NULL DEFAULT 'multiple_choice',
  question_text TEXT NOT NULL,
  options JSONB DEFAULT '[]',
  correct_answer JSONB,
  points INT NOT NULL DEFAULT 10,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Questions visible with quiz" ON public.questions FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND (quizzes.is_published = true OR quizzes.created_by = auth.uid()))
);
CREATE POLICY "Teachers can manage questions" ON public.questions FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.created_by = auth.uid())
);
CREATE POLICY "Teachers can update questions" ON public.questions FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.created_by = auth.uid())
);
CREATE POLICY "Teachers can delete questions" ON public.questions FOR DELETE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = questions.quiz_id AND quizzes.created_by = auth.uid())
);

-- Quiz attempts
CREATE TABLE public.quiz_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  quiz_id UUID NOT NULL REFERENCES public.quizzes(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  score NUMERIC(5,2),
  total_points INT,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'in_progress'
);

ALTER TABLE public.quiz_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attempts" ON public.quiz_attempts FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teachers can view attempts for their quizzes" ON public.quiz_attempts FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quizzes WHERE quizzes.id = quiz_attempts.quiz_id AND quizzes.created_by = auth.uid())
);
CREATE POLICY "Users can create attempts" ON public.quiz_attempts FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own attempts" ON public.quiz_attempts FOR UPDATE TO authenticated USING (user_id = auth.uid());

-- Quiz answers
CREATE TABLE public.quiz_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attempt_id UUID NOT NULL REFERENCES public.quiz_attempts(id) ON DELETE CASCADE,
  question_id UUID NOT NULL REFERENCES public.questions(id) ON DELETE CASCADE,
  answer JSONB,
  is_correct BOOLEAN,
  points_earned INT DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.quiz_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own answers" ON public.quiz_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = quiz_answers.attempt_id AND quiz_attempts.user_id = auth.uid())
);
CREATE POLICY "Teachers can view answers" ON public.quiz_answers FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.quiz_attempts JOIN public.quizzes ON quizzes.id = quiz_attempts.quiz_id WHERE quiz_attempts.id = quiz_answers.attempt_id AND quizzes.created_by = auth.uid())
);
CREATE POLICY "Users can submit answers" ON public.quiz_answers FOR INSERT TO authenticated WITH CHECK (
  EXISTS (SELECT 1 FROM public.quiz_attempts WHERE quiz_attempts.id = quiz_answers.attempt_id AND quiz_attempts.user_id = auth.uid())
);

-- Attendance sessions
CREATE TABLE public.attendance_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id UUID NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  unique_code TEXT NOT NULL UNIQUE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ
);

ALTER TABLE public.attendance_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active sessions visible to enrolled" ON public.attendance_sessions FOR SELECT TO authenticated USING (
  is_active = true OR created_by = auth.uid()
);
CREATE POLICY "Teachers can create sessions" ON public.attendance_sessions FOR INSERT TO authenticated WITH CHECK (created_by = auth.uid());
CREATE POLICY "Teachers can update sessions" ON public.attendance_sessions FOR UPDATE TO authenticated USING (created_by = auth.uid());

-- Attendance records
CREATE TABLE public.attendance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.attendance_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(session_id, user_id)
);

ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own attendance" ON public.attendance_records FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Teachers can view session attendance" ON public.attendance_records FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.attendance_sessions WHERE attendance_sessions.id = attendance_records.session_id AND attendance_sessions.created_by = auth.uid())
);
CREATE POLICY "Users can check in" ON public.attendance_records FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

-- Enable realtime for attendance
ALTER PUBLICATION supabase_realtime ADD TABLE public.attendance_records;

-- Update courses RLS to also allow enrolled students to see
CREATE POLICY "Enrolled students can view courses" ON public.courses FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.enrollments WHERE enrollments.course_id = courses.id AND enrollments.user_id = auth.uid())
);
