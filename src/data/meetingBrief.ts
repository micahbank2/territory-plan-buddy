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
 * Stub for Task 1 (RED). Task 2 fills the line-walk parser body.
 */
export function parseMeetingBrief(markdown: string): MeetingBrief {
  return {
    context: "",
    recentHistory: "",
    contacts: "",
    openTasks: "",
    talkingPoints: "",
    suggestedAsk: "",
    raw: markdown,
  };
}
