/**
 * Meeting Brief parser — pure module.
 *
 * The edge function `meeting-prep` returns a markdown brief with exactly six
 * `## Header` sections in fixed order. This parser splits the markdown into a
 * typed shape the dialog can render section-by-section. Missing sections
 * resolve to empty strings so the UI can fall back to a "None on file."
 * placeholder without crashing.
 */

export const SECTIONS = [
  "Context",
  "Recent History",
  "Contacts",
  "Open Tasks",
  "Talking Points",
  "Suggested Ask",
] as const;

export type SectionName = typeof SECTIONS[number];

export interface MeetingBrief {
  context: string;
  recentHistory: string;
  contacts: string;
  openTasks: string;
  talkingPoints: string;
  suggestedAsk: string;
  /** Original markdown — preserved for clipboard copy and PDF export. */
  raw: string;
}

/**
 * Parse the markdown brief into a typed `MeetingBrief`.
 *
 * Walks the markdown line by line. When it sees a `## Header` line whose
 * label is one of `SECTIONS`, it starts collecting subsequent lines into
 * that bucket. Unknown `##` headers are ignored (their content folds into
 * the previous valid section). Lines before the first valid header are
 * dropped. Missing sections resolve to empty strings — the UI renders a
 * "None on file." placeholder for those.
 */
export function parseMeetingBrief(md: string): MeetingBrief {
  const lines = md.split("\n");
  const sections: Record<string, string[]> = {};
  let current = "";
  for (const line of lines) {
    const m = line.match(/^##\s+(.+?)\s*$/);
    if (m && (SECTIONS as readonly string[]).includes(m[1])) {
      current = m[1];
      sections[current] = [];
    } else if (current) {
      sections[current].push(line);
    }
  }
  const get = (k: SectionName) => (sections[k] ?? []).join("\n").trim();
  return {
    context: get("Context"),
    recentHistory: get("Recent History"),
    contacts: get("Contacts"),
    openTasks: get("Open Tasks"),
    talkingPoints: get("Talking Points"),
    suggestedAsk: get("Suggested Ask"),
    raw: md,
  };
}
