import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Opportunity {
  id: string;
  territory_id: string;
  user_id: string;
  name: string;
  type: string;
  potential_value: number;
  point_of_contact: string;
  source: string;
  stage: string;
  notes: string;
  created_at: string;
}

export const OPP_TYPES = ["One-time", "Recurring", "Trial", "Exclusive"] as const;
export const OPP_SOURCES = ["Outreach", "Referral", "Inbound", "Event", "Partner"] as const;
export const OPP_STAGES = ["Open", "Qualified", "Proposal", "Negotiation", "Closed Won", "Closed Lost"] as const;

export function useOpportunities(territoryId: string | null) {
  const { user } = useAuth();
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!territoryId || !user) { setOpportunities([]); setLoading(false); return; }
    setLoading(true);
    const { data, error } = await supabase
      .from("opportunities")
      .select("*")
      .eq("territory_id", territoryId)
      .order("created_at", { ascending: false });
    if (error) { toast.error("Failed to load opportunities"); console.error(error); }
    else setOpportunities((data || []) as Opportunity[]);
    setLoading(false);
  }, [territoryId, user]);

  useEffect(() => { load(); }, [load]);

  const add = useCallback(async (opp: Partial<Opportunity>) => {
    if (!territoryId || !user) return;
    const { error } = await supabase.from("opportunities").insert({
      ...opp,
      territory_id: territoryId,
      user_id: user.id,
    } as any);
    if (error) { toast.error("Failed to create opportunity"); return; }
    toast.success("Opportunity created");
    await load();
  }, [territoryId, user, load]);

  const update = useCallback(async (id: string, updates: Partial<Opportunity>) => {
    const { error } = await supabase.from("opportunities").update(updates as any).eq("id", id);
    if (error) { toast.error("Failed to update"); return; }
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, ...updates } : o));
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setOpportunities(prev => prev.filter(o => o.id !== id));
    toast.success("Opportunity deleted");
  }, []);

  return { opportunities, loading, add, update, remove, reload: load };
}
