-- Add FK references to profiles (since profiles.id = auth.users.id, these are valid)
-- This enables PostgREST joins to profiles

-- tickets.submitted_by -> profiles
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_submitted_by_profiles_fkey
  FOREIGN KEY (submitted_by) REFERENCES public.profiles(id);

-- tickets.assigned_to -> profiles  
ALTER TABLE public.tickets
  ADD CONSTRAINT tickets_assigned_to_profiles_fkey
  FOREIGN KEY (assigned_to) REFERENCES public.profiles(id);

-- ticket_comments.author_id -> profiles
ALTER TABLE public.ticket_comments
  ADD CONSTRAINT ticket_comments_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id);

-- knowledge_articles.author_id -> profiles
ALTER TABLE public.knowledge_articles
  ADD CONSTRAINT knowledge_articles_author_id_profiles_fkey
  FOREIGN KEY (author_id) REFERENCES public.profiles(id);

-- asset_history.performed_by -> profiles
ALTER TABLE public.asset_history
  ADD CONSTRAINT asset_history_performed_by_profiles_fkey
  FOREIGN KEY (performed_by) REFERENCES public.profiles(id);

-- user_roles.user_id -> profiles
ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_user_id_profiles_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;