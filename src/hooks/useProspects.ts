import { useState, useEffect, useCallback } from "react";
import { STORAGE_KEY, SEED, type Prospect } from "@/data/prospects";

export function useProspects() {
  const [data, setData] = useState<Prospect[]>([]);
  const [ok, setOk] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length > 0) {
          // Migrate old data: add missing fields
          const migrated = p.map((item: any) => ({
            ...item,
            competitor: item.competitor || "",
            tier: item.tier || "",
            contacts: item.contacts || [],
            interactions: item.interactions || [],
          }));
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

  const remove = useCallback((id: number) => {
    setData((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const reset = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    setData(SEED.map((p) => ({ ...p })));
  }, []);

  return { data, ok, update, remove, reset };
}
