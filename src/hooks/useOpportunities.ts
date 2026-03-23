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

// Fields that exist in the DB — strip everything else before insert/update
const DB_FIELDS = new Set([
  "name", "type", "potential_value", "point_of_contact", "stage",
  "notes", "products", "close_date", "prospect_id", "territory_id", "user_id",
]);

function sanitizeForDb(obj: Record<string, any>): Record<string, any> {
  const clean: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (!DB_FIELDS.has(key)) continue;
    // close_date: Supabase types say `string` not `string | null` — OMIT if empty
    if (key === "close_date" && !value) continue;
    // prospect_id: nullable UUID — OMIT if empty/null
    if (key === "prospect_id" && !value) continue;
    clean[key] = value;
  }
  return clean;
}

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
    const payload = sanitizeForDb({
      ...opp,
      territory_id: territoryId,
      user_id: user.id,
    });
    console.log("[useOpportunities] inserting:", payload);
    const { error } = await supabase.from("opportunities").insert(payload as any);
    if (error) {
      console.error("[useOpportunities] insert error:", error);
      toast.error(`Failed to create: ${error.message}`);
      return;
    }
    toast.success("Opportunity created");
    await load();
  }, [territoryId, user, load]);

  const update = useCallback(async (id: string, updates: Partial<Opportunity>) => {
    const payload = sanitizeForDb(updates);
    const { error } = await supabase.from("opportunities").update(payload as any).eq("id", id);
    if (error) {
      console.error("[useOpportunities] update error:", error);
      toast.error(`Failed to update: ${error.message}`);
      return;
    }
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
