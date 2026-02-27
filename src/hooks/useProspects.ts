import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { SEED, initProspect, type Prospect, type Contact, type InteractionLog, type NoteEntry, type Task } from "@/data/prospects";
import { toast } from "sonner";

export interface ArchivedProspect extends Prospect {
  archivedAt: string;
}

// Convert DB row to Prospect
function dbToProspect(row: any, contacts: any[], interactions: any[], notes: any[], tasks: any[]): Prospect {
  return {
    id: row.id, // uuid string but we'll use it
    name: row.name,
    website: row.website || "",
    lastModified: row.last_modified || "",
    transitionOwner: row.transition_owner || "",
    status: row.status || "Prospect",
    industry: row.industry || "",
    locationCount: row.location_count,
    locationNotes: row.location_notes || "",
    outreach: row.outreach || "Not Started",
    priority: row.priority || "",
    notes: row.notes || "",
    noteLog: notes.map((n: any) => ({ id: n.id, text: n.text, timestamp: n.timestamp })),
    lastTouched: row.last_touched,
    contactName: row.contact_name || "",
    contactEmail: row.contact_email || "",
    estimatedRevenue: row.estimated_revenue,
    competitor: row.competitor || "",
    tier: row.tier || "",
    contacts: contacts.map((c: any) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, title: c.title, notes: c.notes })),
    interactions: interactions.map((i: any) => ({ id: i.id, type: i.type, date: i.date, notes: i.notes })),
    createdAt: row.created_at,
    tasks: tasks.map((t: any) => ({ id: t.id, text: t.text, dueDate: t.due_date })),
    customLogo: row.custom_logo,
  } as any; // id is now uuid string
}

export function useProspects() {
  const { user } = useAuth();
  const [data, setData] = useState<Prospect[]>([]);
  const [archived] = useState<ArchivedProspect[]>([]);
  const [ok, setOk] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Load all prospects for current user
  const loadData = useCallback(async () => {
    if (!user) return;
    
    const { data: prospects, error } = await supabase
      .from("prospects")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading prospects:", error);
      return;
    }

    if (!prospects || prospects.length === 0) {
      // No data yet - offer seed
      setData([]);
      setOk(true);
      return;
    }

    // Load related data for all prospects
    const prospectIds = prospects.map((p: any) => p.id);

    const [contactsRes, interactionsRes, notesRes, tasksRes] = await Promise.all([
      supabase.from("prospect_contacts").select("*").in("prospect_id", prospectIds),
      supabase.from("prospect_interactions").select("*").in("prospect_id", prospectIds),
      supabase.from("prospect_notes").select("*").in("prospect_id", prospectIds),
      supabase.from("prospect_tasks").select("*").in("prospect_id", prospectIds),
    ]);

    const contacts = contactsRes.data || [];
    const interactions = interactionsRes.data || [];
    const notes = notesRes.data || [];
    const tasks = tasksRes.data || [];

    const mapped = prospects.map((p: any) =>
      dbToProspect(
        p,
        contacts.filter((c: any) => c.prospect_id === p.id),
        interactions.filter((i: any) => i.prospect_id === p.id),
        notes.filter((n: any) => n.prospect_id === p.id),
        tasks.filter((t: any) => t.prospect_id === p.id),
      )
    );

    setData(mapped);
    setOk(true);
  }, [user]);

  useEffect(() => {
    if (user) loadData();
    else { setData([]); setOk(false); }
  }, [user, loadData]);

  const update = useCallback(async (id: any, u: Partial<Prospect>) => {
    if (!user) return;

    // Handle sub-collections separately
    const { contacts, interactions, noteLog, tasks, ...prospectFields } = u as any;

    // Update prospect fields
    if (Object.keys(prospectFields).length > 0) {
      const dbFields: any = {};
      if ("name" in prospectFields) dbFields.name = prospectFields.name;
      if ("website" in prospectFields) dbFields.website = prospectFields.website;
      if ("status" in prospectFields) dbFields.status = prospectFields.status;
      if ("industry" in prospectFields) dbFields.industry = prospectFields.industry;
      if ("locationCount" in prospectFields) dbFields.location_count = prospectFields.locationCount;
      if ("locationNotes" in prospectFields) dbFields.location_notes = prospectFields.locationNotes;
      if ("outreach" in prospectFields) dbFields.outreach = prospectFields.outreach;
      if ("priority" in prospectFields) dbFields.priority = prospectFields.priority;
      if ("notes" in prospectFields) dbFields.notes = prospectFields.notes;
      if ("lastTouched" in prospectFields) dbFields.last_touched = prospectFields.lastTouched;
      if ("contactName" in prospectFields) dbFields.contact_name = prospectFields.contactName;
      if ("contactEmail" in prospectFields) dbFields.contact_email = prospectFields.contactEmail;
      if ("estimatedRevenue" in prospectFields) dbFields.estimated_revenue = prospectFields.estimatedRevenue;
      if ("competitor" in prospectFields) dbFields.competitor = prospectFields.competitor;
      if ("tier" in prospectFields) dbFields.tier = prospectFields.tier;
      if ("transitionOwner" in prospectFields) dbFields.transition_owner = prospectFields.transitionOwner;
      if ("customLogo" in prospectFields) dbFields.custom_logo = prospectFields.customLogo;
      dbFields.last_touched = new Date().toISOString().split("T")[0];

      if (Object.keys(dbFields).length > 0) {
        await supabase.from("prospects").update(dbFields).eq("id", id);
      }
    }

    // Sync contacts (replace all)
    if (contacts !== undefined) {
      await supabase.from("prospect_contacts").delete().eq("prospect_id", id);
      if (contacts.length > 0) {
        await supabase.from("prospect_contacts").insert(
          contacts.map((c: Contact) => ({
            prospect_id: id,
            user_id: user.id,
            name: c.name,
            email: c.email,
            phone: c.phone,
            title: c.title,
            notes: c.notes,
          }))
        );
      }
    }

    // Sync interactions
    if (interactions !== undefined) {
      await supabase.from("prospect_interactions").delete().eq("prospect_id", id);
      if (interactions.length > 0) {
        await supabase.from("prospect_interactions").insert(
          interactions.map((i: InteractionLog) => ({
            prospect_id: id,
            user_id: user.id,
            type: i.type,
            date: i.date,
            notes: i.notes,
          }))
        );
      }
    }

    // Sync notes
    if (noteLog !== undefined) {
      await supabase.from("prospect_notes").delete().eq("prospect_id", id);
      if (noteLog.length > 0) {
        await supabase.from("prospect_notes").insert(
          noteLog.map((n: NoteEntry) => ({
            prospect_id: id,
            user_id: user.id,
            text: n.text,
            timestamp: n.timestamp,
          }))
        );
      }
    }

    // Sync tasks
    if (tasks !== undefined) {
      await supabase.from("prospect_tasks").delete().eq("prospect_id", id);
      if (tasks.length > 0) {
        await supabase.from("prospect_tasks").insert(
          tasks.map((t: Task) => ({
            prospect_id: id,
            user_id: user.id,
            text: t.text,
            due_date: t.dueDate,
          }))
        );
      }
    }

    // Optimistic update locally
    setData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...u, lastTouched: new Date().toISOString().split("T")[0] } : p))
    );
  }, [user]);

  const add = useCallback(async (partial: Partial<Prospect> & { name: string }) => {
    if (!user) return;

    const p = initProspect({ ...partial, id: 0 }); // id will be uuid

    const { data: inserted, error } = await supabase.from("prospects").insert({
      user_id: user.id,
      name: p.name,
      website: p.website,
      status: p.status,
      industry: p.industry,
      location_count: p.locationCount,
      location_notes: p.locationNotes,
      outreach: p.outreach,
      priority: p.priority,
      notes: p.notes,
      contact_name: p.contactName,
      contact_email: p.contactEmail,
      estimated_revenue: p.estimatedRevenue,
      competitor: p.competitor,
      tier: p.tier,
      transition_owner: p.transitionOwner,
    }).select().single();

    if (error || !inserted) {
      console.error("Error adding prospect:", error);
      return;
    }

    const newProspect = { ...p, id: inserted.id, createdAt: inserted.created_at } as any;
    setData((prev) => [newProspect, ...prev]);
  }, [user]);

  const remove = useCallback(async (id: any) => {
    if (!user) return;
    await supabase.from("prospects").delete().eq("id", id);
    setData((prev) => prev.filter((p) => p.id !== id));
  }, [user]);

  const bulkUpdate = useCallback(async (ids: any[], u: Partial<Prospect>) => {
    if (!user) return;
    const dbFields: any = {};
    if ("outreach" in u) dbFields.outreach = u.outreach;
    if ("tier" in u) dbFields.tier = u.tier;
    if ("priority" in u) dbFields.priority = u.priority;
    if ("status" in u) dbFields.status = u.status;
    dbFields.last_touched = new Date().toISOString().split("T")[0];

    await supabase.from("prospects").update(dbFields).in("id", ids);

    setData((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...u, lastTouched: dbFields.last_touched } : p))
    );
  }, [user]);

  const bulkRemove = useCallback(async (ids: any[]) => {
    if (!user) return;
    await supabase.from("prospects").delete().in("id", ids);
    setData((prev) => prev.filter((p) => !ids.includes(p.id)));
  }, [user]);

  const bulkAdd = useCallback(async (partials: (Partial<Prospect> & { name: string })[]) => {
    if (!user) return;

    const rows = partials.map((partial) => {
      const p = initProspect({ ...partial, id: 0 });
      return {
        user_id: user.id,
        name: p.name,
        website: p.website,
        status: p.status,
        industry: p.industry,
        location_count: p.locationCount,
        location_notes: p.locationNotes,
        outreach: p.outreach,
        priority: p.priority,
        notes: p.notes,
        contact_name: p.contactName,
        contact_email: p.contactEmail,
        estimated_revenue: p.estimatedRevenue,
        competitor: p.competitor,
        tier: p.tier,
        transition_owner: p.transitionOwner,
      };
    });

    const { data: inserted, error } = await supabase.from("prospects").insert(rows).select();
    if (error || !inserted) {
      console.error("Error bulk adding:", error);
      return;
    }

    const newProspects = inserted.map((row: any) =>
      dbToProspect(row, [], [], [], [])
    );

    setData((prev) => [...newProspects, ...prev]);
  }, [user]);

  const bulkMerge = useCallback(async (updates: { id: any; changes: Partial<Prospect> }[]) => {
    if (!user) return;

    // Update each one
    for (const u of updates) {
      const dbFields: any = { last_touched: new Date().toISOString().split("T")[0] };
      const c = u.changes;
      if ("name" in c) dbFields.name = c.name;
      if ("website" in c) dbFields.website = c.website;
      if ("status" in c) dbFields.status = c.status;
      if ("industry" in c) dbFields.industry = c.industry;
      if ("locationCount" in c) dbFields.location_count = c.locationCount;
      if ("locationNotes" in c) dbFields.location_notes = c.locationNotes;
      if ("outreach" in c) dbFields.outreach = c.outreach;
      if ("priority" in c) dbFields.priority = c.priority;
      if ("notes" in c) dbFields.notes = c.notes;
      if ("contactName" in c) dbFields.contact_name = c.contactName;
      if ("contactEmail" in c) dbFields.contact_email = c.contactEmail;
      if ("estimatedRevenue" in c) dbFields.estimated_revenue = c.estimatedRevenue;
      if ("competitor" in c) dbFields.competitor = c.competitor;
      if ("tier" in c) dbFields.tier = c.tier;
      if ("transitionOwner" in c) dbFields.transition_owner = c.transitionOwner;
      await supabase.from("prospects").update(dbFields).eq("id", u.id);
    }

    const ts = new Date().toISOString().split("T")[0];
    setData((prev) =>
      prev.map((p) => {
        const u = updates.find((x) => x.id === p.id);
        return u ? { ...p, ...u.changes, lastTouched: ts } : p;
      })
    );
  }, [user]);

  const reset = useCallback(async () => {
    if (!user) return;
    // Delete all user's prospects (cascade will clean up related)
    await supabase.from("prospects").delete().eq("user_id", user.id);
    // Re-seed
    await seedData();
  }, [user]);

  const OWNER_EMAILS = ["micahbank2@gmail.com", "mbank@yext.com"];

  const seedData = useCallback(async () => {
    if (!user || seeding) return;
    if (!user.email || !OWNER_EMAILS.includes(user.email)) return;
    setSeeding(true);

    const rows = SEED.map((p) => ({
      user_id: user.id,
      name: p.name,
      website: p.website || "",
      status: p.status || "Prospect",
      industry: p.industry || "",
      location_count: p.locationCount || null,
      location_notes: p.locationNotes || "",
      outreach: p.outreach || "Not Started",
      priority: p.priority || "",
      notes: p.notes || "",
      contact_name: p.contactName || "",
      contact_email: p.contactEmail || "",
      estimated_revenue: p.estimatedRevenue || null,
      competitor: p.competitor || "",
      tier: p.tier || "",
      transition_owner: p.transitionOwner || "",
    }));

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      await supabase.from("prospects").insert(batch);
    }

    setSeeding(false);
    await loadData();
    toast.success("🎉 Seed data imported!");
  }, [user, seeding, loadData]);

  // Archive operations are simplified - just delete for now
  const restore = useCallback((_id: any) => {}, []);
  const permanentDelete = useCallback((_id: any) => {}, []);

  return {
    data,
    ok,
    update,
    add,
    remove,
    bulkUpdate,
    bulkRemove,
    bulkAdd,
    bulkMerge,
    reset,
    archived,
    restore,
    permanentDelete,
    seedData,
    seeding,
  };
}
