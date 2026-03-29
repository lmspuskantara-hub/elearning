-- Allow admin and teachers to view all profiles
CREATE POLICY "Admin can view all profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Teachers can view enrolled student profiles"
ON public.profiles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'teacher'));

-- Allow admin to manage user_roles (insert/update/delete)
CREATE POLICY "Admin can insert roles"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can update roles"
ON public.user_roles FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete roles"
ON public.user_roles FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can view all roles"
ON public.user_roles FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin full access to courses
CREATE POLICY "Admin can view all courses"
ON public.courses FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage all courses"
ON public.courses FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete all courses"
ON public.courses FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Allow admin full access to enrollments
CREATE POLICY "Admin can view all enrollments"
ON public.enrollments FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can manage enrollments"
ON public.enrollments FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admin can delete enrollments"
ON public.enrollments FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Users can also self-upgrade to teacher (existing functionality)
CREATE POLICY "Users can add own teacher role"
ON public.user_roles FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());