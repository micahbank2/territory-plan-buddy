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
    id: row.id,
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
    contacts: contacts.map((c: any) => ({ id: c.id, name: c.name, email: c.email, phone: c.phone, title: c.title, notes: c.notes, role: c.role || undefined, relationshipStrength: c.relationship_strength || undefined, starred: c.starred ?? false })),
    interactions: interactions.map((i: any) => ({ id: i.id, type: i.type, date: i.date, notes: i.notes })),
    createdAt: row.created_at,
    tasks: tasks.map((t: any) => ({ id: t.id, text: t.text, dueDate: t.due_date })),
    customLogo: row.custom_logo,
    aiReadinessScore: row.ai_readiness_score ?? null,
    aiReadinessGrade: row.ai_readiness_grade ?? null,
    aiReadinessData: row.ai_readiness_data ?? null,
    aiReadinessUpdatedAt: row.ai_readiness_updated_at ?? null,
  } as any;
}

export function useProspects(territoryId?: string | null) {
  const { user } = useAuth();
  const [data, setData] = useState<Prospect[]>([]);
  const [archivedData, setArchivedData] = useState<ArchivedProspect[]>([]);
  const [ok, setOk] = useState(false);
  const [seeding, setSeeding] = useState(false);

  // Load all prospects for current user (or territory)
  const loadData = useCallback(async () => {
    if (!user) return;
    
    let query = supabase
      .from("prospects")
      .select("*")
      .is("deleted_at", null)
      .order("created_at", { ascending: false });

    // If territory is specified, filter by it; otherwise load user's own
    if (territoryId) {
      query = query.eq("territory_id", territoryId);
    }

    const { data: prospects, error } = await query;

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
  }, [user, territoryId]);

  const loadArchivedData = useCallback(async () => {
    if (!user) return;
    let query = supabase
      .from("prospects")
      .select("*")
      .not("deleted_at", "is", null)
      .order("deleted_at", { ascending: false });
    if (territoryId) query = query.eq("territory_id", territoryId);
    const { data: prospects, error } = await query;
    if (error) { console.error("Error loading archived prospects:", error); return; }
    if (!prospects || prospects.length === 0) { setArchivedData([]); return; }

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

    const mapped: ArchivedProspect[] = prospects.map((p: any) => ({
      ...dbToProspect(
        p,
        contacts.filter((c: any) => c.prospect_id === p.id),
        interactions.filter((i: any) => i.prospect_id === p.id),
        notes.filter((n: any) => n.prospect_id === p.id),
        tasks.filter((t: any) => t.prospect_id === p.id),
      ),
      archivedAt: p.deleted_at,
    }));
    setArchivedData(mapped);
  }, [user, territoryId]);

  useEffect(() => {
    if (user) loadData();
    else { setData([]); setOk(false); }
  }, [user, loadData]);

  const update = useCallback(async (id: any, u: Partial<Prospect>) => {
    if (!user) return;

    // Snapshot current state for rollback — must happen before optimistic update
    const previousProspect = data.find(p => p.id === id);

    // Handle sub-collections separately (interactions, noteLog, tasks are intentionally ignored here)
    // Use addInteraction/updateInteraction/removeInteraction, addNote/deleteNote/updateNote, addTask/updateTask/removeTask instead
    const { contacts, interactions, noteLog, tasks, ...prospectFields } = u as any;

    // Build DB fields
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
    if ("aiReadinessScore" in prospectFields) dbFields.ai_readiness_score = prospectFields.aiReadinessScore;
    if ("aiReadinessGrade" in prospectFields) dbFields.ai_readiness_grade = prospectFields.aiReadinessGrade;
    if ("aiReadinessData" in prospectFields) dbFields.ai_readiness_data = prospectFields.aiReadinessData;
    if ("aiReadinessUpdatedAt" in prospectFields) dbFields.ai_readiness_updated_at = prospectFields.aiReadinessUpdatedAt;
    dbFields.last_touched = new Date().toISOString().split("T")[0];

    // Optimistic update locally
    setData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...u, lastTouched: dbFields.last_touched } : p))
    );

    if (Object.keys(dbFields).length > 0) {
      const { error: updateError } = await supabase.from("prospects").update(dbFields).eq("id", id);
      if (updateError) {
        // Rollback to previous state
        setData((prev) => prev.map(p => p.id === id ? { ...p, ...previousProspect } : p));
        toast.error("Failed to save — changes not persisted");
        return;
      }
    }

    // contacts field is intentionally ignored here — use addContact/updateContact/removeContact instead
    // interactions, noteLog, tasks: use dedicated CRUD functions instead (per D-05)
  }, [user, data]);

  const add = useCallback(async (partial: Partial<Prospect> & { name: string }): Promise<string | undefined> => {
    if (!user) return undefined;

    const p = initProspect({ ...partial, id: 0 }); // id will be uuid

    const insertData: any = {
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
    if (territoryId) insertData.territory_id = territoryId;

    const { data: inserted, error } = await supabase.from("prospects").insert(insertData).select().single();

    if (error || !inserted) {
      console.error("Error adding prospect:", error);
      toast.error("Failed to add prospect");
      return undefined;
    }

    const newProspect = { ...p, id: inserted.id, createdAt: inserted.created_at } as any;
    setData((prev) => [newProspect, ...prev]);
    return inserted.id;
  }, [user]);

  const addNote = useCallback(async (prospectId: string, text: string) => {
    if (!user) return;
    const { data: note } = await supabase.from("prospect_notes").insert({
      prospect_id: prospectId,
      user_id: user.id,
      text,
    }).select().single();
    if (note) {
      setData((prev) =>
        prev.map((p) =>
          p.id === prospectId
            ? { ...p, noteLog: [{ id: note.id, text: note.text, timestamp: note.timestamp }, ...(p.noteLog || [])] }
            : p
        )
      );
    }
  }, [user]);

  const remove = useCallback(async (id: any) => {
    if (!user) return;
    const previousItem = data.find(p => p.id === id);
    setData(prev => prev.filter(p => p.id !== id));  // optimistic
    const { error } = await supabase
      .from("prospects")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", id);
    if (error) {
      if (previousItem) setData(prev => [previousItem, ...prev]);
      toast.error("Failed to archive prospect");
    }
  }, [user, data]);

  const bulkUpdate = useCallback(async (ids: any[], u: Partial<Prospect>) => {
    if (!user) return;
    const prevItems = data.filter(p => ids.includes(p.id));
    const dbFields: any = {};
    if ("outreach" in u) dbFields.outreach = u.outreach;
    if ("tier" in u) dbFields.tier = u.tier;
    if ("priority" in u) dbFields.priority = u.priority;
    if ("status" in u) dbFields.status = u.status;
    if ("industry" in u) dbFields.industry = u.industry;
    if ("competitor" in u) dbFields.competitor = u.competitor;
    if ("locationCount" in u) dbFields.location_count = u.locationCount;
    dbFields.last_touched = new Date().toISOString().split("T")[0];

    setData((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...u, lastTouched: dbFields.last_touched } : p))
    );

    const { error } = await supabase.from("prospects").update(dbFields).in("id", ids);
    if (error) {
      setData((prev) => prev.map(p => {
        const prevItem = prevItems.find(x => x.id === p.id);
        return prevItem ? prevItem : p;
      }));
      toast.error("Failed to bulk update");
      return;
    }
  }, [user, data]);

  const bulkRemove = useCallback(async (ids: any[]) => {
    if (!user) return;
    const previousItems = data.filter(p => ids.includes(p.id));
    setData(prev => prev.filter(p => !ids.includes(p.id)));  // optimistic
    const { error } = await supabase
      .from("prospects")
      .update({ deleted_at: new Date().toISOString() })
      .in("id", ids);
    if (error) {
      setData(prev => [...previousItems, ...prev]);
      toast.error("Failed to archive prospects");
    }
  }, [user, data]);

  const bulkAdd = useCallback(async (partials: (Partial<Prospect> & { name: string })[]) => {
    if (!user) return;

    const rows = partials.map((partial) => {
      const p = initProspect({ ...partial, id: 0 });
      const row: any = {
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
      if (territoryId) row.territory_id = territoryId;
      return row;
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
      const c = u.changes as any;
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

      // Only update prospect fields if there are any
      const hasProspectFields = Object.keys(dbFields).length > 1; // more than just last_touched
      if (hasProspectFields) {
        await supabase.from("prospects").update(dbFields).eq("id", u.id);
      }

      // Sync contacts if included in changes
      if ("contacts" in c && Array.isArray(c.contacts)) {
        await supabase.from("prospect_contacts").delete().eq("prospect_id", u.id);
        if (c.contacts.length > 0) {
          await supabase.from("prospect_contacts").insert(
            c.contacts.map((contact: Contact) => ({
              prospect_id: u.id,
              user_id: user.id,
              name: contact.name || "",
              email: contact.email || "",
              phone: contact.phone || "",
              title: contact.title || "",
              notes: contact.notes || "",
              role: contact.role || null,
              relationship_strength: contact.relationshipStrength || null,
              starred: contact.starred ?? false,
            }))
          );
        }
      }

      // interactions, noteLog, tasks: use addInteraction/updateInteraction/removeInteraction,
      // addNote/deleteNote/updateNote, addTask/updateTask/removeTask instead (per D-05)
      // These are intentionally not handled here to avoid delete-all + re-insert race conditions.
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

    const rows = SEED.map((p) => {
      const row: any = {
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
      };
      if (territoryId) row.territory_id = territoryId;
      return row;
    });

    // Insert in batches of 100
    for (let i = 0; i < rows.length; i += 100) {
      const batch = rows.slice(i, i + 100);
      await supabase.from("prospects").insert(batch);
    }

    setSeeding(false);
    await loadData();
    toast.success("🎉 Seed data imported!");
  }, [user, seeding, loadData]);

  const restore = useCallback(async (id: any) => {
    if (!user) return;
    const { error } = await supabase
      .from("prospects")
      .update({ deleted_at: null })
      .eq("id", id);
    if (error) { toast.error("Failed to restore prospect"); return; }
    setArchivedData(prev => prev.filter(p => p.id !== id));
    await loadData();
    toast.success("Prospect restored");
  }, [user, loadData]);

  const permanentDelete = useCallback(async (id: any) => {
    if (!user) return;
    const { error } = await supabase.from("prospects").delete().eq("id", id);
    if (error) { toast.error("Failed to permanently delete prospect"); return; }
    setArchivedData(prev => prev.filter(p => p.id !== id));
    toast.success("Prospect permanently deleted");
  }, [user]);

  const deleteNote = useCallback(async (prospectId: any, noteId: string) => {
    if (!user) return;
    await supabase.from("prospect_notes").delete().eq("id", noteId);
    setData((prev) =>
      prev.map((p) =>
        p.id === prospectId
          ? { ...p, noteLog: (p.noteLog || []).filter((n) => n.id !== noteId) }
          : p
      )
    );
  }, [user]);

  // --- Direct contact CRUD (single-row operations, no delete-all + re-insert) ---

  const addContact = useCallback(async (prospectId: string, contact: Omit<Contact, "id">) => {
    if (!user) return;
    const { data: rows, error } = await supabase.from("prospect_contacts").insert({
      prospect_id: prospectId,
      user_id: user.id,
      name: contact.name,
      email: contact.email,
      phone: contact.phone,
      title: contact.title,
      notes: contact.notes,
      role: contact.role || null,
      relationship_strength: contact.relationshipStrength || null,
      starred: contact.starred ?? false,
    }).select("id");
    if (error) { toast.error("Failed to add contact"); return; }
    const newId = rows?.[0]?.id;
    if (newId) {
      setData(prev => prev.map(p =>
        p.id === prospectId
          ? { ...p, contacts: [...(p.contacts || []), { ...contact, id: newId } as Contact] }
          : p
      ));
    }
  }, [user]);

  const updateContact = useCallback(async (contactId: string, fields: Partial<Contact>) => {
    if (!user) return;
    const dbFields: any = {};
    if ("name" in fields) dbFields.name = fields.name;
    if ("email" in fields) dbFields.email = fields.email;
    if ("phone" in fields) dbFields.phone = fields.phone;
    if ("title" in fields) dbFields.title = fields.title;
    if ("notes" in fields) dbFields.notes = fields.notes;
    if ("role" in fields) dbFields.role = fields.role || null;
    if ("relationshipStrength" in fields) dbFields.relationship_strength = fields.relationshipStrength || null;
    if ("starred" in fields) dbFields.starred = fields.starred ?? false;
    const { error } = await supabase.from("prospect_contacts").update(dbFields).eq("id", contactId);
    if (error) { toast.error("Failed to update contact"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      contacts: (p.contacts || []).map(c => c.id === contactId ? { ...c, ...fields } : c),
    })));
  }, [user]);

  const removeContact = useCallback(async (contactId: string) => {
    if (!user) return;
    const { error } = await supabase.from("prospect_contacts").delete().eq("id", contactId);
    if (error) { toast.error("Failed to remove contact"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      contacts: (p.contacts || []).filter(c => c.id !== contactId),
    })));
  }, [user]);

  // --- Direct interaction CRUD (single-row operations, no delete-all + re-insert) ---

  const addInteraction = useCallback(async (prospectId: string, interaction: Omit<InteractionLog, "id">) => {
    if (!user) return;
    const { data: rows, error } = await supabase.from("prospect_interactions").insert({
      prospect_id: prospectId,
      user_id: user.id,
      type: interaction.type,
      date: interaction.date,
      notes: interaction.notes,
    }).select("id");
    if (error) { toast.error("Failed to add interaction"); return; }
    const newId = rows?.[0]?.id;
    if (newId) {
      setData(prev => prev.map(p =>
        p.id === prospectId
          ? { ...p, interactions: [...(p.interactions || []), { ...interaction, id: newId }] }
          : p
      ));
    }
  }, [user]);

  const updateInteraction = useCallback(async (interactionId: string, fields: Partial<InteractionLog>) => {
    if (!user) return;
    const dbFields: any = {};
    if ("type" in fields) dbFields.type = fields.type;
    if ("date" in fields) dbFields.date = fields.date;
    if ("notes" in fields) dbFields.notes = fields.notes;
    const { error } = await supabase.from("prospect_interactions").update(dbFields).eq("id", interactionId);
    if (error) { toast.error("Failed to update interaction"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      interactions: (p.interactions || []).map(i => i.id === interactionId ? { ...i, ...fields } : i),
    })));
  }, [user]);

  const removeInteraction = useCallback(async (interactionId: string) => {
    if (!user) return;
    const { error } = await supabase.from("prospect_interactions").delete().eq("id", interactionId);
    if (error) { toast.error("Failed to delete interaction"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      interactions: (p.interactions || []).filter(i => i.id !== interactionId),
    })));
  }, [user]);

  // --- Direct note CRUD (updateNote — addNote and deleteNote already exist) ---

  const updateNote = useCallback(async (noteId: string, text: string) => {
    if (!user) return;
    const { error } = await supabase.from("prospect_notes").update({ text }).eq("id", noteId);
    if (error) { toast.error("Failed to update note"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      noteLog: (p.noteLog || []).map(n => n.id === noteId ? { ...n, text } : n),
    })));
  }, [user]);

  // --- Direct task CRUD (single-row operations, no delete-all + re-insert) ---

  const addTask = useCallback(async (prospectId: string, task: Omit<Task, "id">) => {
    if (!user) return;
    const { data: rows, error } = await supabase.from("prospect_tasks").insert({
      prospect_id: prospectId,
      user_id: user.id,
      text: task.text,
      due_date: task.dueDate || null,
    }).select("id");
    if (error) { toast.error("Failed to add task"); return; }
    const newId = rows?.[0]?.id;
    if (newId) {
      setData(prev => prev.map(p =>
        p.id === prospectId
          ? { ...p, tasks: [...(p.tasks || []), { ...task, id: newId }] }
          : p
      ));
    }
  }, [user]);

  const updateTask = useCallback(async (taskId: string, fields: Partial<Task>) => {
    if (!user) return;
    const dbFields: any = {};
    if ("text" in fields) dbFields.text = fields.text;
    if ("dueDate" in fields) dbFields.due_date = fields.dueDate || null;
    const { error } = await supabase.from("prospect_tasks").update(dbFields).eq("id", taskId);
    if (error) { toast.error("Failed to update task"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      tasks: (p.tasks || []).map(t => t.id === taskId ? { ...t, ...fields } : t),
    })));
  }, [user]);

  const removeTask = useCallback(async (taskId: string) => {
    if (!user) return;
    const { error } = await supabase.from("prospect_tasks").delete().eq("id", taskId);
    if (error) { toast.error("Failed to delete task"); return; }
    setData(prev => prev.map(p => ({
      ...p,
      tasks: (p.tasks || []).filter(t => t.id !== taskId),
    })));
  }, [user]);

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
    archivedData,
    loadArchivedData,
    restore,
    permanentDelete,
    seedData,
    seeding,
    deleteNote,
    addNote,
    addContact,
    updateContact,
    removeContact,
    addInteraction,
    updateInteraction,
    removeInteraction,
    updateNote,
    addTask,
    updateTask,
    removeTask,
  };
}
