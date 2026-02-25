import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEY, SEED, initProspect, type Prospect } from "@/data/prospects";

export function useProspects() {
  const [data, setData] = useState<Prospect[]>([]);
  const [ok, setOk] = useState(false);

  useEffect(() => {
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
            // Migrate legacy nextStep into tasks array
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

  useEffect(() => {
    if (!ok || !data.length) return;
    const t = setTimeout(() => {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      } catch {}
    }, 500);
    return () => clearTimeout(t);
  }, [data, ok]);

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
    setData((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const bulkUpdate = useCallback((ids: number[], u: Partial<Prospect>) => {
    const ts = new Date().toISOString().split("T")[0];
    setData((prev) =>
      prev.map((p) => (ids.includes(p.id) ? { ...p, ...u, lastTouched: ts } : p))
    );
  }, []);

  const bulkRemove = useCallback((ids: number[]) => {
    setData((prev) => prev.filter((p) => !ids.includes(p.id)));
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

  return { data, ok, update, add, remove, bulkUpdate, bulkRemove, bulkAdd, bulkMerge, reset };
}
