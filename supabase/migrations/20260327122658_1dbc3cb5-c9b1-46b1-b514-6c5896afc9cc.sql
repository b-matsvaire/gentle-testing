
-- Fix search_path on functions missing it
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.ticket_number := 'TKT-' || LPAD(nextval('public.ticket_number_seq')::TEXT, 5, '0');
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.generate_asset_tag()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.asset_tag IS NULL OR NEW.asset_tag = '' THEN
    NEW.asset_tag := 'AST-' || LPAD(nextval('public.asset_tag_seq')::TEXT, 4, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_sla_deadlines()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
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
