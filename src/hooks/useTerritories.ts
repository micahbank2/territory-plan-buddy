import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

export interface Territory {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TerritoryMember {
  id: string;
  territory_id: string;
  user_id: string;
  role: "owner" | "editor" | "viewer";
  created_at: string;
  email?: string; // resolved client-side
}

export function useTerritories() {
  const { user } = useAuth();
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [members, setMembers] = useState<TerritoryMember[]>([]);
  const [activeTerritory, setActiveTerritory] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [myRole, setMyRole] = useState<"owner" | "editor" | "viewer">("owner");

  // Ensure user has a default territory, then load all
  const init = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    // Call ensure_user_territory to create default if needed
    const { data: territoryId } = await supabase.rpc("ensure_user_territory", {
      _user_id: user.id,
    });

    // Load all territories user belongs to
    const { data: memberRows } = await supabase
      .from("territory_members")
      .select("*")
      .eq("user_id", user.id);

    if (!memberRows || memberRows.length === 0) {
      setLoading(false);
      return;
    }

    const territoryIds = memberRows.map((m: any) => m.territory_id);
    const { data: terrs } = await supabase
      .from("territories")
      .select("*")
      .in("id", territoryIds);

    if (terrs) {
      setTerritories(terrs as Territory[]);
    }

    // Set active territory
    const stored = localStorage.getItem("tp-active-territory");
    if (stored && territoryIds.includes(stored)) {
      setActiveTerritory(stored);
      const memberRole = memberRows.find((m: any) => m.territory_id === stored);
      setMyRole((memberRole?.role as any) || "owner");
    } else if (territoryId) {
      setActiveTerritory(territoryId as string);
      localStorage.setItem("tp-active-territory", territoryId as string);
      const memberRole = memberRows.find((m: any) => m.territory_id === territoryId);
      setMyRole((memberRole?.role as any) || "owner");
    }

    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (user) init();
    else {
      setTerritories([]);
      setActiveTerritory(null);
      setLoading(false);
    }
  }, [user, init]);

  // Load members for active territory
  const loadMembers = useCallback(async () => {
    if (!activeTerritory) return;
    const { data } = await supabase
      .from("territory_members")
      .select("*")
      .eq("territory_id", activeTerritory);
    if (data) setMembers(data as TerritoryMember[]);
  }, [activeTerritory]);

  useEffect(() => {
    if (activeTerritory) loadMembers();
  }, [activeTerritory, loadMembers]);

  const switchTerritory = useCallback((id: string) => {
    setActiveTerritory(id);
    localStorage.setItem("tp-active-territory", id);
    // Update role
    const member = members.find((m) => m.territory_id === id && m.user_id === user?.id);
    if (member) setMyRole(member.role);
  }, [members, user]);

  const renameTerritory = useCallback(async (name: string) => {
    if (!activeTerritory) return;
    await supabase.from("territories").update({ name }).eq("id", activeTerritory);
    setTerritories((prev) => prev.map((t) => t.id === activeTerritory ? { ...t, name } : t));
  }, [activeTerritory]);

  const inviteMember = useCallback(async (email: string, role: "editor" | "viewer") => {
    if (!activeTerritory || !user) return false;

    // Look up user by email
    const { data: userId, error: lookupError } = await supabase.rpc("find_user_id_by_email", {
      _email: email.toLowerCase().trim(),
    });

    if (lookupError || !userId) {
      toast.error("User not found", { description: "They need to create an account first." });
      return false;
    }

    if (userId === user.id) {
      toast.error("Can't invite yourself");
      return false;
    }

    // Check if already a member
    const existing = members.find((m) => m.user_id === userId);
    if (existing) {
      toast.error("Already a member of this territory");
      return false;
    }

    const { error } = await supabase.from("territory_members").insert({
      territory_id: activeTerritory,
      user_id: userId as string,
      role,
    });

    if (error) {
      toast.error("Failed to invite", { description: error.message });
      return false;
    }

    toast.success(`Invited ${email} as ${role}`);
    await loadMembers();
    return true;
  }, [activeTerritory, user, members, loadMembers]);

  const removeMember = useCallback(async (memberId: string) => {
    await supabase.from("territory_members").delete().eq("id", memberId);
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    toast.success("Member removed");
  }, []);

  const updateMemberRole = useCallback(async (memberId: string, role: "editor" | "viewer") => {
    await supabase.from("territory_members").update({ role }).eq("id", memberId);
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role } : m));
    toast.success("Role updated");
  }, []);

  const createTerritory = useCallback(async (name: string) => {
    if (!user) return;
    const { data: terr, error } = await supabase
      .from("territories")
      .insert({ name, owner_id: user.id })
      .select()
      .single();

    if (error || !terr) {
      toast.error("Failed to create territory");
      return;
    }

    // Add self as owner
    await supabase.from("territory_members").insert({
      territory_id: terr.id,
      user_id: user.id,
      role: "owner",
    });

    setTerritories((prev) => [...prev, terr as Territory]);
    switchTerritory(terr.id);
    toast.success(`Created "${name}"`);
  }, [user, switchTerritory]);

  return {
    territories,
    activeTerritory,
    members,
    myRole,
    loading,
    switchTerritory,
    renameTerritory,
    inviteMember,
    removeMember,
    updateMemberRole,
    createTerritory,
    loadMembers,
  };
}
