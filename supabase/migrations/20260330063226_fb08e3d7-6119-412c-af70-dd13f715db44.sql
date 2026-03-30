-- Allow admins to update any profile (needed for user management)
CREATE POLICY "Admins can update any profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'ict_admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'ict_admin'::app_role));