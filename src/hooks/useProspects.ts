import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEY, SEED, initProspect, type Prospect } from "@/data/prospects";

const ARCHIVE_KEY = "tp_archived";

export interface ArchivedProspect extends Prospect {
  archivedAt: string;
}

export function useProspects() {
  const [data, setData] = useState<Prospect[]>([]);
  const [archived, setArchived] = useState<ArchivedProspect[]>([]);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    // Load archived
    try {
      const rawArc = localStorage.getItem(ARCHIVE_KEY);
      if (rawArc) {
        const a = JSON.parse(rawArc);
        if (Array.isArray(a)) setArchived(a);
      }
    } catch {}

    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length > 0) {
          const migrated = p.map((item: any) => {
            const m = {
              ...item,
              competitor: item.competitor || "",
              tier: item.tier || "",
              contacts: item.contacts || [],
              interactions: item.interactions || [],
              noteLog: item.noteLog || [],
              createdAt: item.createdAt || "",
              tasks: item.tasks || [],
            };
            if (!m.tasks.length && item.nextStep) {
              m.tasks = [{ id: Date.now().toString() + m.id, text: item.nextStep, dueDate: item.nextStepDate || "" }];
            }
            return m;
          });
          setData(migrated);
          setOk(true);
          return;
        }
      }
    } catch {}
    setData(SEED);
    setOk(true);
  }, []);

  // Persist data
  useEffect(() => {
    if (!ok || !data.length) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)); } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [data, ok]);

  // Persist archive
  useEffect(() => {
    if (!ok) return;
    const t = setTimeout(() => {
      try { localStorage.setItem(ARCHIVE_KEY, JSON.stringify(archived)); } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [archived, ok]);

  const update = useCallback((id: number, u: Partial<Prospect>) => {
    const ts = new Date().toISOString().split("T")[0];
    setData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...u, lastTouched: ts } : p))
    );
  }, []);

  const add = useCallback((partial: Partial<Prospect> & { name: string }) => {
    setData((prev) => {
      const maxId = prev.reduce((m, p) => Math.max(m, p.id), 0);
      const newProspect = initProspect({ ...partial, id: maxId + 1 });
      return [newProspect, ...prev];
    });
  }, []);

  const remove = useCallback((id: number) => {
    setData((prev) => {
      const prospect = prev.find((p) => p.id === id);
      if (prospect) {
        setArchived((arc) => [...arc, { ...prospect, archivedAt: new Date().toISOString() }]);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const bulkUpdate = useCallback((ids: number[], u: Partial<Prospect>) => {
    const ts = new Date().toISOString().split("T")[0];
    setData((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...u, lastTouched: ts } : p))
    );
  }, []);

  const bulkRemove = useCallback((ids: number[]) => {
    setData((prev) => {
      const toArchive = prev.filter((p) => ids.includes(p.id));
      if (toArchive.length) {
        const now = new Date().toISOString();
        setArchived((arc) => [...arc, ...toArchive.map((p) => ({ ...p, archivedAt: now }))]);
      }
      return prev.filter((p) => !ids.includes(p.id));
    });
  }, []);

  const bulkAdd = useCallback((partials: (Partial<Prospect> & { name: string })[]) => {
    setData((prev) => {
      let maxId = prev.reduce((m, p) => Math.max(m, p.id), 0);
      const newOnes = partials.map((partial) => {
        maxId += 1;
        return initProspect({ ...partial, id: maxId });
      });
      return [...newOnes, ...prev];
    });
  }, []);

  const bulkMerge = useCallback((updates: { id: number; changes: Partial<Prospect> }[]) => {
    const ts = new Date().toISOString().split("T")[0];
    setData((prev) =>
      prev.map((p) => {
        const u = updates.find((x) => x.id === p.id);
        return u ? { ...p, ...u.changes, lastTouched: ts } : p;
      })
    );
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(SEED.map((p) => ({ ...p })));
  }, []);

  const restore = useCallback((id: number) => {
    setArchived((prev) => {
      const item = prev.find((p) => p.id === id);
      if (item) {
        const { archivedAt, ...prospect } = item;
        setData((d) => [prospect, ...d]);
      }
      return prev.filter((p) => p.id !== id);
    });
  }, []);

  const permanentDelete = useCallback((id: number) => {
    setArchived((prev) => prev.filter((p) => p.id !== id));
  }, []);

  return { data, ok, update, add, remove, bulkUpdate, bulkRemove, bulkAdd, bulkMerge, reset, archived, restore, permanentDelete };
}
