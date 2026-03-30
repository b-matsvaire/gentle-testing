import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

// Assets
export const useAssets = () =>
  useQuery({
    queryKey: ["assets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assets" as any)
        .select("*, assigned_profile:profiles!assets_assigned_to_fkey(full_name, department)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

export const useAssetHistory = (assetId: string | null) =>
  useQuery({
    queryKey: ["asset_history", assetId],
    queryFn: async () => {
      if (!assetId) return [];
      const { data, error } = await supabase
        .from("asset_history" as any)
        .select("*, performer:profiles!asset_history_performed_by_profiles_fkey(full_name)")
        .eq("asset_id", assetId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!assetId,
  });

// Tickets
export const useTickets = () =>
  useQuery({
    queryKey: ["tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tickets" as any)
        .select("*, submitter:profiles!tickets_submitted_by_profiles_fkey(full_name), assignee:profiles!tickets_assigned_to_profiles_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

export const useTicketComments = (ticketId: string | null) =>
  useQuery({
    queryKey: ["ticket_comments", ticketId],
    queryFn: async () => {
      if (!ticketId) return [];
      const { data, error } = await supabase
        .from("ticket_comments" as any)
        .select("*, author:profiles!ticket_comments_author_id_profiles_fkey(full_name)")
        .eq("ticket_id", ticketId)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data as any[];
    },
    enabled: !!ticketId,
  });

// Knowledge Base
export const useKnowledgeArticles = () =>
  useQuery({
    queryKey: ["knowledge_articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("knowledge_articles" as any)
        .select("*, author:profiles!knowledge_articles_author_id_profiles_fkey(full_name)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

// Profiles (for user management)
export const useProfiles = () =>
  useQuery({
    queryKey: ["profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("*, user_roles(role)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as any[];
    },
  });

// Technicians (for assignment)
export const useTechnicians = () =>
  useQuery({
    queryKey: ["technicians"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("user_roles" as any)
        .select("user_id, role, profile:profiles!user_roles_user_id_profiles_fkey(id, full_name, email)")
        .in("role", ["technician", "ict_admin"]);
      if (error) throw error;
      return data as any[];
    },
  });

// All active profiles (for asset assignment)
export const useActiveProfiles = () =>
  useQuery({
    queryKey: ["active_profiles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles" as any)
        .select("id, full_name, email, department")
        .eq("is_active", true)
        .order("full_name");
      if (error) throw error;
      return data as any[];
    },
  });

// System Settings
export const useSystemSettings = () =>
  useQuery({
    queryKey: ["system_settings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("system_settings" as any)
        .select("*")
        .eq("id", 1)
        .single();
      if (error) throw error;
      return data as any;
    },
  });
