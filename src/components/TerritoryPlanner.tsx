import { useState, useEffect, useCallback, useMemo } from "react";
import {
  STAGES,
  PRIORITIES,
  INDUSTRIES,
  STORAGE_KEY,
  SEED,
  scoreProspect,
  initProspect,
  type Prospect,
  type EnrichedProspect,
} from "@/data/prospects";

function Fld({
  l,
  v,
  c,
  t = "text",
  o,
}: {
  l: string;
  v: string | number;
  c: (v: string) => void;
  t?: string;
  o?: string[];
}) {
  const s: React.CSSProperties = {
    width: "100%",
    padding: "4px 6px",
    borderRadius: 4,
    border: "1px solid #1e293b",
    background: "#1e293b",
    color: "#e2e8f0",
    fontSize: 11,
    outline: "none",
    boxSizing: "border-box",
  };
  return (
    <div>
      <div
        style={{
          fontSize: 8,
          color: "#64748b",
          marginBottom: 2,
          textTransform: "uppercase",
          letterSpacing: ".04em",
        }}
      >
        {l}
      </div>
      {t === "select" ? (
        <select value={v} onChange={(e) => c(e.target.value)} style={s}>
          {o!.map((x) => (
            <option key={x} value={x}>
              {x || "-- Select --"}
            </option>
          ))}
        </select>
      ) : (
        <input
          type={t}
          value={v}
          onChange={(e) => c(e.target.value)}
          style={s}
        />
      )}
    </div>
  );
}

export default function TerritoryPlanner() {
  const [data, setData] = useState<Prospect[]>([]);
  const [ok, setOk] = useState(false);
  const [view, setView] = useState("dashboard");
  const [sel, setSel] = useState<Prospect | null>(null);
  const [q, setQ] = useState("");
  const [fI, setFI] = useState("");
  const [fO, setFO] = useState("");
  const [fP, setFP] = useState("");
  const [fW, setFW] = useState("");
  const [fM, setFM] = useState("");
  const [sK, setSK2] = useState<string>("ps");
  const [sD, setSD] = useState<"asc" | "desc">("desc");
  const [sf, setSF] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (Array.isArray(p) && p.length > 0) {
          setData(p);
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

  const upd = useCallback((id: number, u: Partial<Prospect>) => {
    const ts = new Date().toISOString().split("T")[0];
    setData((prev) =>
      prev.map((p) => (p.id === id ? { ...p, ...u, lastTouched: ts } : p))
    );
    setSel((prev) =>
      prev && prev.id === id ? { ...prev, ...u, lastTouched: ts } : prev
    );
  }, []);

  const owners = useMemo(
    () =>
      [...new Set(data.map((p) => p.transitionOwner).filter(Boolean))].sort(),
    [data]
  );
  const enriched = useMemo<EnrichedProspect[]>(
    () => data.map((p) => ({ ...p, ps: scoreProspect(p) })),
    [data]
  );

  const filtered = useMemo(() => {
    let r = enriched as (EnrichedProspect & Record<string, any>)[];
    if (q) {
      const s = q.toLowerCase();
      r = r.filter(
        (p) =>
          p.name.toLowerCase().includes(s) ||
          (p.industry || "").toLowerCase().includes(s) ||
          (p.notes || "").toLowerCase().includes(s)
      );
    }
    if (fI) r = r.filter((p) => p.industry === fI);
    if (fO) r = r.filter((p) => p.outreach === fO);
    if (fP) r = r.filter((p) => p.priority === fP);
    if (fW) r = r.filter((p) => p.transitionOwner === fW);
    if (fM)
      r = r.filter((p) => p.locationCount && p.locationCount >= parseInt(fM));
    r.sort((a, b) => {
      let av = a[sK],
        bv = b[sK];
      if (av == null) av = sD === "desc" ? -Infinity : Infinity;
      if (bv == null) bv = sD === "desc" ? -Infinity : Infinity;
      if (typeof av === "string") {
        av = av.toLowerCase();
        bv = (bv || "").toLowerCase();
      }
      return sD === "asc"
        ? av < bv
          ? -1
          : av > bv
          ? 1
          : 0
        : av > bv
        ? -1
        : av < bv
        ? 1
        : 0;
    });
    return r;
  }, [enriched, q, fI, fO, fP, fW, fM, sK, sD]);

  const stats = useMemo(() => {
    const wl = data.filter((p) => p.locationCount && p.locationCount > 0);
    const bo: Record<string, number> = {};
    STAGES.forEach((s) => {
      bo[s] = data.filter((p) => p.outreach === s).length;
    });
    const bi: Record<string, number> = {};
    data.forEach((p) => {
      if (p.industry) bi[p.industry] = (bi[p.industry] || 0) + 1;
    });
    return {
      t: data.length,
      o50: wl.filter((p) => p.locationCount! >= 50).length,
      o100: wl.filter((p) => p.locationCount! >= 100).length,
      o500: wl.filter((p) => p.locationCount! >= 500).length,
      hot: data.filter((p) => p.priority === "Hot").length,
      warm: data.filter((p) => p.priority === "Warm").length,
      ch: data.filter((p) => p.status === "Churned").length,
      tl: wl.reduce((s, p) => s + p.locationCount!, 0),
      bo,
      bi,
    };
  }, [data]);

  const doSort = (f: string) => {
    if (sK === f) setSD((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSK2(f);
      setSD("desc");
    }
  };
  const clr = () => {
    setQ("");
    setFI("");
    setFO("");
    setFP("");
    setFW("");
    setFM("");
  };
  const reset = () => {
    if (confirm("Reset ALL data?")) {
      localStorage.removeItem(STORAGE_KEY);
      setData(SEED.map((p) => ({ ...p })));
      setSel(null);
    }
  };

  if (!ok)
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "100vh",
          background: "#0a0f1a",
          color: "#94a3b8",
          fontFamily: "system-ui",
        }}
      >
        Loading...
      </div>
    );

  const Arrow = ({ f }: { f: string }) =>
    sK !== f ? (
      <span style={{ opacity: 0.25, marginLeft: 3, fontSize: 8 }}>
        &#8597;
      </span>
    ) : (
      <span style={{ marginLeft: 3, fontSize: 8, color: "#60a5fa" }}>
        {sD === "asc" ? "\u25B2" : "\u25BC"}
      </span>
    );
  const pcol = (
    p: string
  ): [string, string] =>
    p === "Hot"
      ? ["#dc2626", "#fff"]
      : p === "Warm"
      ? ["#f59e0b", "#000"]
      : p === "Cold"
      ? ["#3b82f6", "#fff"]
      : p === "Dead"
      ? ["#4b5563", "#9ca3af"]
      : ["transparent", "#64748b"];
  const ocol = (s: string) =>
    ({
      "Not Started": "#475569",
      Researching: "#1e3a5f",
      Contacted: "#2563eb",
      "Meeting Set": "#7c3aed",
      "Proposal Sent": "#c026d3",
      Negotiating: "#ea580c",
      "Closed Won": "#16a34a",
      "Closed Lost": "#dc2626",
      "On Hold": "#64748b",
    })[s] || "#475569";

  const c = {
    bg: "#0a0f1a",
    card: "#111827",
    bdr: "#1e293b",
    t1: "#f1f5f9",
    t2: "#94a3b8",
    t3: "#64748b",
  };

  return (
    <div
      style={{
        background: c.bg,
        minHeight: "100vh",
        color: "#e2e8f0",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13,
      }}
    >
      {/* Header */}
      <div
        style={{
          borderBottom: `1px solid ${c.bdr}`,
          padding: "10px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "#0d1424",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              background: "linear-gradient(135deg,#3b82f6,#8b5cf6)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 800,
              fontSize: 12,
              color: "#fff",
            }}
          >
            TP
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 14, color: c.t1 }}>
              Territory Planner
            </div>
            <div style={{ fontSize: 10, color: c.t3 }}>
              Micah Bank, FY2026
            </div>
          </div>
        </div>
        <div style={{ display: "flex", gap: 3 }}>
          {(["dashboard", "table"] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                padding: "5px 12px",
                borderRadius: 5,
                border: "none",
                cursor: "pointer",
                fontSize: 11,
                fontWeight: 600,
                background: view === v ? "#1e40af" : "transparent",
                color: view === v ? "#fff" : c.t2,
              }}
            >
              {v === "dashboard" ? "Dashboard" : "Prospects"}
            </button>
          ))}
          <button
            onClick={reset}
            style={{
              padding: "5px 8px",
              borderRadius: 5,
              border: `1px solid ${c.bdr}`,
              background: "transparent",
              color: c.t3,
              cursor: "pointer",
              fontSize: 10,
              marginLeft: 6,
            }}
          >
            Reset
          </button>
        </div>
      </div>

      {/* Dashboard */}
      {view === "dashboard" && (
        <div style={{ padding: 16, maxWidth: 1000, margin: "0 auto" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
              gap: 8,
              marginBottom: 14,
            }}
          >
            {(
              [
                ["Total", stats.t, "#3b82f6"],
                ["50+ Locs", stats.o50, "#10b981"],
                ["100+ Locs", stats.o100, "#8b5cf6"],
                ["500+ Locs", stats.o500, "#f59e0b"],
                ["Hot", stats.hot, "#ef4444"],
                ["Warm", stats.warm, "#f59e0b"],
                ["Churned", stats.ch, "#64748b"],
                ["Total Locs", stats.tl.toLocaleString(), "#06b6d4"],
              ] as [string, string | number, string][]
            ).map(([l, v, col], i) => (
              <div
                key={i}
                style={{
                  background: c.card,
                  borderRadius: 8,
                  padding: "10px 12px",
                  border: `1px solid ${c.bdr}`,
                }}
              >
                <div
                  style={{
                    fontSize: 9,
                    color: c.t3,
                    marginBottom: 2,
                    textTransform: "uppercase",
                    letterSpacing: ".05em",
                  }}
                >
                  {l}
                </div>
                <div style={{ fontSize: 20, fontWeight: 700, color: col }}>
                  {v}
                </div>
              </div>
            ))}
          </div>

          <div
            style={{
              background: c.card,
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${c.bdr}`,
              marginBottom: 10,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: c.t2,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Pipeline
            </div>
            <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
              {STAGES.map((s) => {
                const n = stats.bo[s] || 0;
                return (
                  <div
                    key={s}
                    onClick={() => {
                      setView("table");
                      setFO(s);
                    }}
                    style={{
                      flex: 1,
                      minWidth: 75,
                      background: ocol(s) + "22",
                      border: `1px solid ${ocol(s)}44`,
                      borderRadius: 6,
                      padding: "7px 4px",
                      cursor: "pointer",
                      textAlign: "center",
                    }}
                  >
                    <div
                      style={{
                        fontSize: 15,
                        fontWeight: 700,
                        color: ocol(s),
                        filter: "brightness(1.5)",
                      }}
                    >
                      {n}
                    </div>
                    <div style={{ fontSize: 8, color: c.t2, marginTop: 1 }}>
                      {s}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div
            style={{
              background: c.card,
              borderRadius: 8,
              padding: 12,
              border: `1px solid ${c.bdr}`,
            }}
          >
            <div
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: c.t2,
                marginBottom: 8,
                textTransform: "uppercase",
                letterSpacing: ".05em",
              }}
            >
              Industries
            </div>
            {Object.entries(stats.bi)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 10)
              .map(([ind, n]) => (
                <div
                  key={ind}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    marginBottom: 3,
                  }}
                >
                  <div
                    style={{
                      width: 100,
                      fontSize: 9,
                      color: c.t2,
                      textAlign: "right",
                      flexShrink: 0,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {ind}
                  </div>
                  <div
                    style={{
                      flex: 1,
                      height: 14,
                      background: c.bdr,
                      borderRadius: 3,
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        height: "100%",
                        width: `${
                          (n / Math.max(...Object.values(stats.bi))) * 100
                        }%`,
                        background:
                          "linear-gradient(90deg,#3b82f6,#8b5cf6)",
                        borderRadius: 3,
                      }}
                    />
                  </div>
                  <div
                    style={{
                      fontSize: 9,
                      color: c.t3,
                      width: 18,
                      textAlign: "right",
                    }}
                  >
                    {n}
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Table View */}
      {view === "table" && (
        <div style={{ display: "flex", height: "calc(100vh - 49px)" }}>
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Search bar */}
            <div
              style={{
                padding: "7px 12px",
                borderBottom: `1px solid ${c.bdr}`,
                background: "#0d1424",
                display: "flex",
                gap: 6,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Search..."
                style={{
                  padding: "5px 10px",
                  borderRadius: 5,
                  border: `1px solid ${c.bdr}`,
                  background: "#1e293b",
                  color: "#e2e8f0",
                  fontSize: 11,
                  width: 170,
                  outline: "none",
                }}
              />
              <button
                onClick={() => setSF(!sf)}
                style={{
                  padding: "5px 10px",
                  borderRadius: 5,
                  border: `1px solid ${c.bdr}`,
                  background: sf ? "#1e40af" : "#1e293b",
                  color: sf ? "#fff" : c.t2,
                  fontSize: 10,
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Filters{fI || fO || fP || fW || fM ? " \u25CF" : ""}
              </button>
              {(fI || fO || fP || fW || fM) && (
                <button
                  onClick={clr}
                  style={{
                    padding: "3px 8px",
                    borderRadius: 4,
                    border: "none",
                    background: "#dc2626",
                    color: "#fff",
                    fontSize: 9,
                    cursor: "pointer",
                  }}
                >
                  Clear
                </button>
              )}
              <div style={{ marginLeft: "auto", fontSize: 10, color: c.t3 }}>
                {filtered.length}/{data.length}
              </div>
            </div>

            {sf && (
              <div
                style={{
                  padding: "5px 12px",
                  borderBottom: `1px solid ${c.bdr}`,
                  background: c.card,
                  display: "flex",
                  gap: 5,
                  flexWrap: "wrap",
                }}
              >
                {(
                  [
                    [fI, setFI, "Industry", INDUSTRIES],
                    [fO, setFO, "Outreach", ["", ...STAGES]],
                    [fP, setFP, "Priority", PRIORITIES],
                  ] as [string, (v: string) => void, string, string[]][]
                ).map(([v, fn, l, opts]) => (
                  <select
                    key={l}
                    value={v}
                    onChange={(e) => fn(e.target.value)}
                    style={{
                      padding: "3px 6px",
                      borderRadius: 4,
                      border: `1px solid ${c.bdr}`,
                      background: "#1e293b",
                      color: "#e2e8f0",
                      fontSize: 10,
                    }}
                  >
                    <option value="">All {l}</option>
                    {opts.filter(Boolean).map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ))}
                <select
                  value={fW}
                  onChange={(e) => setFW(e.target.value)}
                  style={{
                    padding: "3px 6px",
                    borderRadius: 4,
                    border: `1px solid ${c.bdr}`,
                    background: "#1e293b",
                    color: "#e2e8f0",
                    fontSize: 10,
                  }}
                >
                  <option value="">All Owners</option>
                  {owners.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <input
                  value={fM}
                  onChange={(e) => setFM(e.target.value)}
                  placeholder="Min locs"
                  type="number"
                  style={{
                    padding: "3px 6px",
                    borderRadius: 4,
                    border: `1px solid ${c.bdr}`,
                    background: "#1e293b",
                    color: "#e2e8f0",
                    fontSize: 10,
                    width: 70,
                  }}
                />
              </div>
            )}

            {/* Table */}
            <div style={{ flex: 1, overflow: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 11,
                }}
              >
                <thead style={{ position: "sticky", top: 0, zIndex: 10 }}>
                  <tr style={{ background: c.card }}>
                    {(
                      [
                        ["ps", "Score", 42],
                        ["name", "Account", null],
                        ["locationCount", "Locs", 48],
                        ["industry", "Industry", 100],
                        ["outreach", "Outreach", 88],
                        ["priority", "Priority", 60],
                        ["transitionOwner", "Owner", 95],
                      ] as [string, string, number | null][]
                    ).map(([k, l, w]) => (
                      <th
                        key={k}
                        onClick={() => doSort(k)}
                        style={{
                          padding: "6px 4px",
                          textAlign: "left",
                          color: c.t3,
                          fontWeight: 600,
                          fontSize: 9,
                          textTransform: "uppercase",
                          letterSpacing: ".04em",
                          borderBottom: `1px solid ${c.bdr}`,
                          cursor: "pointer",
                          width: w || "auto",
                          whiteSpace: "nowrap",
                          userSelect: "none",
                        }}
                      >
                        {l}
                        <Arrow f={k} />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((p, i) => {
                    const [pbg, ptx] = pcol(p.priority);
                    const isSel = sel?.id === p.id;
                    return (
                      <tr
                        key={p.id}
                        onClick={() => setSel(p)}
                        style={{
                          background: isSel
                            ? "#1e293b"
                            : i % 2
                            ? "#0d1424"
                            : "transparent",
                          cursor: "pointer",
                          borderBottom: `1px solid ${c.bdr}11`,
                        }}
                        onMouseEnter={(e) => {
                          if (!isSel)
                            e.currentTarget.style.background = "#1e293b55";
                        }}
                        onMouseLeave={(e) => {
                          if (!isSel)
                            e.currentTarget.style.background = i % 2
                              ? "#0d1424"
                              : "transparent";
                        }}
                      >
                        <td
                          style={{
                            padding: "5px 4px",
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: 10,
                            color:
                              p.ps >= 40
                                ? "#10b981"
                                : p.ps >= 20
                                ? "#60a5fa"
                                : "#475569",
                          }}
                        >
                          {p.ps}
                        </td>
                        <td style={{ padding: "5px 4px" }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: c.t1,
                              fontSize: 11,
                            }}
                          >
                            {p.name}
                          </div>
                          {p.notes && (
                            <div
                              style={{
                                fontSize: 9,
                                color: c.t3,
                                marginTop: 1,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                                maxWidth: 200,
                              }}
                            >
                              {p.notes}
                            </div>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "5px 4px",
                            textAlign: "center",
                            fontWeight: 700,
                            fontSize: 10,
                            color:
                              (p.locationCount ?? 0) >= 100
                                ? "#10b981"
                                : (p.locationCount ?? 0) >= 50
                                ? "#60a5fa"
                                : (p.locationCount ?? 0) > 0
                                ? c.t2
                                : "#334155",
                          }}
                        >
                          {p.locationCount || "--"}
                        </td>
                        <td
                          style={{
                            padding: "5px 4px",
                            fontSize: 10,
                            color: c.t2,
                          }}
                        >
                          {p.industry}
                        </td>
                        <td style={{ padding: "5px 4px" }}>
                          <span
                            style={{
                              padding: "1px 6px",
                              borderRadius: 3,
                              fontSize: 9,
                              fontWeight: 600,
                              background: ocol(p.outreach) + "33",
                              color: ocol(p.outreach),
                              filter: "brightness(1.5)",
                              whiteSpace: "nowrap",
                            }}
                          >
                            {p.outreach}
                          </span>
                        </td>
                        <td style={{ padding: "5px 4px" }}>
                          {p.priority && (
                            <span
                              style={{
                                padding: "1px 6px",
                                borderRadius: 3,
                                fontSize: 9,
                                fontWeight: 700,
                                background: pbg,
                                color: ptx,
                              }}
                            >
                              {p.priority}
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "5px 4px",
                            fontSize: 10,
                            color: c.t2,
                          }}
                        >
                          {p.transitionOwner}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Detail Panel */}
          {sel && (
            <div
              style={{
                width: 290,
                borderLeft: `1px solid ${c.bdr}`,
                background: c.card,
                overflow: "auto",
                flexShrink: 0,
              }}
            >
              <div style={{ padding: 12 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "start",
                    marginBottom: 10,
                  }}
                >
                  <div>
                    <div
                      style={{ fontSize: 13, fontWeight: 700, color: c.t1 }}
                    >
                      {sel.name}
                    </div>
                    <a
                      href={`https://${sel.website}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 10,
                        color: "#60a5fa",
                        textDecoration: "none",
                      }}
                    >
                      {sel.website}
                    </a>
                  </div>
                  <button
                    onClick={() => setSel(null)}
                    style={{
                      background: "none",
                      border: "none",
                      color: c.t3,
                      cursor: "pointer",
                      fontSize: 16,
                      padding: 0,
                    }}
                  >
                    &times;
                  </button>
                </div>

                <div
                  style={{
                    background: c.bg,
                    borderRadius: 6,
                    padding: 8,
                    marginBottom: 10,
                    textAlign: "center",
                    border: `1px solid ${c.bdr}`,
                  }}
                >
                  <div
                    style={{
                      fontSize: 8,
                      color: c.t3,
                      textTransform: "uppercase",
                    }}
                  >
                    Score
                  </div>
                  <div
                    style={{
                      fontSize: 24,
                      fontWeight: 800,
                      color:
                        scoreProspect(sel) >= 40
                          ? "#10b981"
                          : scoreProspect(sel) >= 20
                          ? "#60a5fa"
                          : c.t3,
                    }}
                  >
                    {scoreProspect(sel)}
                  </div>
                </div>

                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 7,
                  }}
                >
                  <Fld
                    l="Locations"
                    t="number"
                    v={sel.locationCount || ""}
                    c={(v) =>
                      upd(sel.id, {
                        locationCount: v ? parseInt(v) : null,
                      })
                    }
                  />
                  <Fld
                    l="Industry"
                    t="select"
                    o={INDUSTRIES}
                    v={sel.industry || ""}
                    c={(v) => upd(sel.id, { industry: v })}
                  />
                  <Fld
                    l="Outreach"
                    t="select"
                    o={STAGES}
                    v={sel.outreach}
                    c={(v) => upd(sel.id, { outreach: v })}
                  />
                  <Fld
                    l="Priority"
                    t="select"
                    o={PRIORITIES}
                    v={sel.priority || ""}
                    c={(v) => upd(sel.id, { priority: v })}
                  />
                  <Fld
                    l="Contact"
                    v={sel.contactName || ""}
                    c={(v) => upd(sel.id, { contactName: v })}
                  />
                  <Fld
                    l="Email"
                    v={sel.contactEmail || ""}
                    c={(v) => upd(sel.id, { contactEmail: v })}
                  />
                  <Fld
                    l="Est. Revenue ($)"
                    t="number"
                    v={sel.estimatedRevenue || ""}
                    c={(v) =>
                      upd(sel.id, {
                        estimatedRevenue: v ? parseInt(v) : null,
                      })
                    }
                  />
                  <div>
                    <div
                      style={{
                        fontSize: 8,
                        color: c.t3,
                        marginBottom: 2,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      Notes
                    </div>
                    <textarea
                      value={sel.notes || ""}
                      onChange={(e) =>
                        upd(sel.id, { notes: e.target.value })
                      }
                      rows={3}
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        borderRadius: 4,
                        border: `1px solid ${c.bdr}`,
                        background: "#1e293b",
                        color: "#e2e8f0",
                        fontSize: 11,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                      placeholder="Notes..."
                    />
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 8,
                        color: c.t3,
                        marginBottom: 2,
                        textTransform: "uppercase",
                        letterSpacing: ".04em",
                      }}
                    >
                      Location Source
                    </div>
                    <textarea
                      value={sel.locationNotes || ""}
                      onChange={(e) =>
                        upd(sel.id, { locationNotes: e.target.value })
                      }
                      rows={2}
                      style={{
                        width: "100%",
                        padding: "4px 6px",
                        borderRadius: 4,
                        border: `1px solid ${c.bdr}`,
                        background: "#1e293b",
                        color: "#e2e8f0",
                        fontSize: 11,
                        resize: "vertical",
                        outline: "none",
                        boxSizing: "border-box",
                      }}
                    />
                  </div>
                  <div
                    style={{
                      borderTop: `1px solid ${c.bdr}`,
                      paddingTop: 6,
                      marginTop: 2,
                    }}
                  >
                    <div style={{ fontSize: 9, color: "#475569" }}>
                      Owner: {sel.transitionOwner}
                    </div>
                    <div style={{ fontSize: 9, color: "#475569" }}>
                      Status: {sel.status}
                    </div>
                    <div style={{ fontSize: 9, color: "#475569" }}>
                      Modified: {sel.lastModified}
                    </div>
                    {sel.lastTouched && (
                      <div style={{ fontSize: 9, color: "#475569" }}>
                        Touched: {sel.lastTouched}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
