
-- Drop the problematic policies causing infinite recursion
DROP POLICY IF EXISTS "Enrolled students can view courses" ON public.courses;
DROP POLICY IF EXISTS "Teachers can view course enrollments" ON public.enrollments;

-- Recreate enrollments teacher policy using has_role instead of querying courses
CREATE POLICY "Teachers can view course enrollments" ON public.enrollments
FOR SELECT TO authenticated
USING (
  has_role(auth.uid(), 'teacher'::app_role)
);

-- Recreate courses policy for enrolled students using a simpler check
CREATE POLICY "Enrolled students can view courses" ON public.courses
FOR SELECT TO authenticated
USING (
  id IN (SELECT course_id FROM public.enrollments WHERE user_id = auth.uid())
);
