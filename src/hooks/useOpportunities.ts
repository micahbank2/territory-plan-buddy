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
  stage: string;
  notes: string;
  products: string;
  close_date: string;
  prospect_id: string | null;
  created_at: string;
}

export const OPP_TYPES = ["Net New", "Renewal", "Order Form"] as const;
export const OPP_STAGES = [
  "Develop", "Discovery", "Business Alignment", "Validate",
  "Propose", "Negotiate", "Won", "Closed Won", "Closed Lost", "Dead"
] as const;

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
    // Sanitize: PostgreSQL rejects "" for date columns — must be null or valid date
    const sanitized = { ...opp } as any;
    if (!sanitized.close_date) sanitized.close_date = null;
    if (sanitized.prospect_id === null || sanitized.prospect_id === "") sanitized.prospect_id = null;
    const { error } = await supabase.from("opportunities").insert({
      ...sanitized,
      territory_id: territoryId,
      user_id: user.id,
    } as any);
    if (error) { toast.error("Failed to create opportunity"); console.error("Insert error:", error); return; }
    toast.success("Opportunity created");
    await load();
  }, [territoryId, user, load]);

  const update = useCallback(async (id: string, updates: Partial<Opportunity>) => {
    const sanitized = { ...updates } as any;
    if ("close_date" in sanitized && !sanitized.close_date) sanitized.close_date = null;
    const { error } = await supabase.from("opportunities").update(sanitized).eq("id", id);
    if (error) { toast.error("Failed to update"); console.error("Update error:", error); return; }
    setOpportunities(prev => prev.map(o => o.id === id ? { ...o, ...sanitized } : o));
  }, []);

  const remove = useCallback(async (id: string) => {
    const { error } = await supabase.from("opportunities").delete().eq("id", id);
    if (error) { toast.error("Failed to delete"); return; }
    setOpportunities(prev => prev.filter(o => o.id !== id));
    toast.success("Opportunity deleted");
  }, []);

  return { opportunities, loading, add, update, remove, reload: load };
}
