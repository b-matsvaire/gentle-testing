
-- User roles enum
CREATE TYPE public.app_role AS ENUM ('end_user', 'technician', 'ict_admin', 'viewer');

-- Profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL DEFAULT '',
  email TEXT,
  department TEXT,
  phone TEXT,
  avatar_url TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- User roles table (separate as per security requirements)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL DEFAULT 'end_user',
  UNIQUE(user_id, role)
);

-- Security definer function to check roles (avoids RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

-- Get user role function
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT role FROM public.user_roles WHERE user_id = _user_id LIMIT 1
$$;

-- Assets table
CREATE TABLE public.assets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_tag TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,
  serial_number TEXT,
  status TEXT NOT NULL DEFAULT 'In Stock',
  assigned_to UUID REFERENCES public.profiles(id),
  department TEXT,
  location TEXT,
  vendor TEXT,
  purchase_date DATE,
  purchase_cost DECIMAL(12,2),
  warranty_expiry DATE,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Asset history log
CREATE TABLE public.asset_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  details TEXT,
  performed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tickets table
CREATE TABLE public.tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL DEFAULT 'Other',
  type TEXT NOT NULL DEFAULT 'Issue',
  priority TEXT NOT NULL DEFAULT 'Medium',
  status TEXT NOT NULL DEFAULT 'Open',
  submitted_by UUID REFERENCES auth.users(id) NOT NULL,
  assigned_to UUID REFERENCES auth.users(id),
  related_asset_id UUID REFERENCES public.assets(id),
  sla_response_due TIMESTAMPTZ,
  sla_resolution_due TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  resolution_summary TEXT,
  satisfaction_rating INT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Ticket comments
CREATE TABLE public.ticket_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.tickets(id) ON DELETE CASCADE NOT NULL,
  author_id UUID REFERENCES auth.users(id) NOT NULL,
  content TEXT NOT NULL,
  is_internal BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Knowledge base articles
CREATE TABLE public.knowledge_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'General',
  excerpt TEXT,
  tags TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT false,
  author_id UUID REFERENCES auth.users(id),
  views_count INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System settings table (single row)
CREATE TABLE public.system_settings (
  id INT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  org_name TEXT NOT NULL DEFAULT 'Verify Engineering',
  support_email TEXT NOT NULL DEFAULT 'itsupport@verifyeng.com',
  timezone TEXT NOT NULL DEFAULT 'Africa/Nairobi',
  sla_critical_hours INT NOT NULL DEFAULT 1,
  sla_high_hours INT NOT NULL DEFAULT 4,
  sla_medium_hours INT NOT NULL DEFAULT 8,
  sla_low_hours INT NOT NULL DEFAULT 24,
  notify_email BOOLEAN NOT NULL DEFAULT true,
  notify_sla BOOLEAN NOT NULL DEFAULT true,
  notify_warranty BOOLEAN NOT NULL DEFAULT true,
  notify_new_ticket BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Insert default settings
INSERT INTO public.system_settings (id) VALUES (1);

-- Auto-create profile and assign default role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), NEW.email);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'end_user');
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ticket number sequence and auto-generation
CREATE SEQUENCE public.ticket_number_seq START 1000;

CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_number
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.generate_ticket_number();

-- Asset tag sequence and auto-generation
CREATE SEQUENCE public.asset_tag_seq START 100;

CREATE OR REPLACE FUNCTION public.generate_asset_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
    NEW.asset_tag := 'AST-' || LPAD(nextval('public.asset_tag_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_asset_tag
  BEFORE INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION public.generate_asset_tag();

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_assets_updated_at BEFORE UPDATE ON public.assets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_tickets_updated_at BEFORE UPDATE ON public.tickets FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_articles_updated_at BEFORE UPDATE ON public.knowledge_articles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();
CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON public.system_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

-- SLA auto-calculation trigger
CREATE OR REPLACE FUNCTION public.set_sla_deadlines()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  settings RECORD;
  hours INT;
BEGIN
  SELECT * INTO settings FROM public.system_settings WHERE id = 1;
  
  CASE NEW.priority
    WHEN 'Critical' THEN hours := settings.sla_critical_hours;
    WHEN 'High' THEN hours := settings.sla_high_hours;
    WHEN 'Medium' THEN hours := settings.sla_medium_hours;
    ELSE hours := settings.sla_low_hours;
  END CASE;
  
  NEW.sla_response_due := NEW.created_at + (hours || ' hours')::INTERVAL;
  NEW.sla_resolution_due := NEW.created_at + ((hours * 3) || ' hours')::INTERVAL;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_ticket_sla
  BEFORE INSERT ON public.tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_sla_deadlines();

-- RLS Policies

-- Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view profiles" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid());
CREATE POLICY "System can insert profiles" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

-- User roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view roles" ON public.user_roles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ict_admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ict_admin'));
CREATE POLICY "Admins can delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ict_admin'));

-- Assets
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view assets" ON public.assets FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and techs can insert assets" ON public.assets FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ict_admin') OR public.has_role(auth.uid(), 'technician'));
CREATE POLICY "Admins and techs can update assets" ON public.assets FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ict_admin') OR public.has_role(auth.uid(), 'technician'));
CREATE POLICY "Admins can delete assets" ON public.assets FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ict_admin'));

-- Asset history
ALTER TABLE public.asset_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view asset history" ON public.asset_history FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins and techs can insert history" ON public.asset_history FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'ict_admin') OR public.has_role(auth.uid(), 'technician'));

-- Tickets
ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users see own tickets, staff see all" ON public.tickets FOR SELECT TO authenticated USING (
  submitted_by = auth.uid() 
  OR public.has_role(auth.uid(), 'technician') 
  OR public.has_role(auth.uid(), 'ict_admin') 
  OR public.has_role(auth.uid(), 'viewer')
);
CREATE POLICY "Authenticated can create tickets" ON public.tickets FOR INSERT TO authenticated WITH CHECK (submitted_by = auth.uid());
CREATE POLICY "Staff and submitter can update tickets" ON public.tickets FOR UPDATE TO authenticated USING (
  submitted_by = auth.uid() 
  OR public.has_role(auth.uid(), 'technician') 
  OR public.has_role(auth.uid(), 'ict_admin')
);

-- Ticket comments
ALTER TABLE public.ticket_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View comments on accessible tickets" ON public.ticket_comments FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.tickets t WHERE t.id = ticket_id 
    AND (t.submitted_by = auth.uid() OR public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'ict_admin'))
  )
  AND (is_internal = false OR public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'ict_admin'))
);
CREATE POLICY "Authenticated can add comments" ON public.ticket_comments FOR INSERT TO authenticated WITH CHECK (author_id = auth.uid());

-- Knowledge articles
ALTER TABLE public.knowledge_articles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View published or staff sees all" ON public.knowledge_articles FOR SELECT TO authenticated USING (
  is_published = true 
  OR public.has_role(auth.uid(), 'technician') 
  OR public.has_role(auth.uid(), 'ict_admin')
);
CREATE POLICY "Staff can create articles" ON public.knowledge_articles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'ict_admin'));
CREATE POLICY "Staff can update articles" ON public.knowledge_articles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'technician') OR public.has_role(auth.uid(), 'ict_admin'));
CREATE POLICY "Admins can delete articles" ON public.knowledge_articles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'ict_admin'));

-- System settings
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated can view settings" ON public.system_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins can update settings" ON public.system_settings FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'ict_admin'));

-- Storage bucket for attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('attachments', 'attachments', true);
CREATE POLICY "Authenticated can upload attachments" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'attachments');
CREATE POLICY "Anyone can view attachments" ON storage.objects FOR SELECT TO authenticated USING (bucket_id = 'attachments');
