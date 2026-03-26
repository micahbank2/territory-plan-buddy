import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Signal {
  id: string;
  prospect_id: string;
  user_id: string;
  territory_id: string | null;
  signal_type: string;
  opportunity_type: string;
  title: string;
  description: string;
  relevance: string;
  source: string;
  created_at: string;
}

export const SIGNAL_TYPES = [
  "Leadership Change",
  "Expansion",
  "Competitor Contract Ending",
  "Bad Reviews / Reputation Issue",
  "Rebrand / Redesign",
  "Acquisition / Merger",
  "New Locations",
  "Funding Round",
  "Tech Vendor Evaluation",
  "Website Redesign",
  "Other",
];

export const OPPORTUNITY_TYPES = [
  "Executive",
  "Expansion",
  "Churn",
  "Reputation",
  "Competitive Displacement",
  "Other",
];

export const SIGNAL_RELEVANCE = ["Hot", "Warm", "Low"];

export function useSignals(territoryId?: string | null) {
  const { user } = useAuth();
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);

  const loadSignals = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    let query = supabase
      .from("prospect_signals")
      .select("*")
      .order("created_at", { ascending: false });

    if (territoryId) {
      query = query.eq("territory_id", territoryId);
    }

    const { data, error } = await query;
    if (error) {
      console.error("Error loading signals:", error);
    } else {
      setSignals((data as Signal[]) || []);
    }
    setLoading(false);
  }, [user, territoryId]);

  useEffect(() => {
    if (user) loadSignals();
    else { setSignals([]); setLoading(false); }
  }, [user, loadSignals]);

  const addSignal = useCallback(async (signal: Omit<Signal, "id" | "created_at" | "user_id">) => {
    if (!user) return null;
    const { data, error } = await supabase
      .from("prospect_signals")
      .insert({ ...signal, user_id: user.id } as any)
      .select()
      .single();

    if (error) {
      console.error("Error adding signal:", error);
      toast.error("Failed to add signal");
      return null;
    }
    setSignals((prev) => [data as Signal, ...prev]);
    return data as Signal;
  }, [user]);

  const removeSignal = useCallback(async (id: string) => {
    if (!user) return;
    const previous = signals.find(s => s.id === id);
    setSignals((prev) => prev.filter((s) => s.id !== id));  // optimistic
    const { error } = await supabase.from("prospect_signals").delete().eq("id", id);
    if (error) {
      if (previous) setSignals((prev) => [previous, ...prev]);
      toast.error("Failed to remove signal");
    }
  }, [user, signals]);

  // Get signals for a specific prospect
  const getProspectSignals = useCallback((prospectId: string) => {
    return signals.filter((s) => s.prospect_id === prospectId);
  }, [signals]);

  // Get highest relevance for a prospect
  const getProspectSignalRelevance = useCallback((prospectId: string): string | null => {
    const ps = signals.filter((s) => s.prospect_id === prospectId);
    if (ps.length === 0) return null;
    if (ps.some((s) => s.relevance === "Hot")) return "Hot";
    if (ps.some((s) => s.relevance === "Warm")) return "Warm";
    return "Low";
  }, [signals]);

  return { signals, loading, addSignal, removeSignal, getProspectSignals, getProspectSignalRelevance, reload: loadSignals };
}
