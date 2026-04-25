import { forwardRef, useImperativeHandle, useState } from "react";
import { FileText, Copy, Loader2, RefreshCw } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import { supabase } from "@/integrations/supabase/client";
import { parseMeetingBrief, type MeetingBrief, SECTIONS, type SectionName } from "@/data/meetingBrief";
import type { Prospect } from "@/data/prospects";

export interface MeetingPrepDialogHandle {
  open: (prospect: Prospect) => void;
}

interface MeetingPrepDialogProps {
  score?: number;
  territoryId?: string | null;
}

const SECTION_LABELS: Record<SectionName, string> = {
  "Context": "Context",
  "Recent History": "Recent History",
  "Contacts": "Contacts",
  "Open Tasks": "Open Tasks",
  "Talking Points": "Talking Points",
  "Suggested Ask": "Suggested Ask",
};

const FIELD_BY_SECTION: Record<SectionName, keyof Omit<MeetingBrief, "raw">> = {
  "Context": "context",
  "Recent History": "recentHistory",
  "Contacts": "contacts",
  "Open Tasks": "openTasks",
  "Talking Points": "talkingPoints",
  "Suggested Ask": "suggestedAsk",
};

export const MeetingPrepDialog = forwardRef<MeetingPrepDialogHandle, MeetingPrepDialogProps>(
  function MeetingPrepDialog({ score }, ref) {
    const [open, setOpen] = useState(false);
    const [prospect, setProspect] = useState<Prospect | null>(null);
    const [brief, setBrief] = useState<MeetingBrief | null>(null);
    const [loading, setLoading] = useState(false);

    const generate = async (p: Prospect) => {
      setLoading(true);
      setBrief(null);
      try {
        const { data: result, error } = await supabase.functions.invoke("meeting-prep", {
          body: {
            name: p.name,
            website: p.website,
            industry: p.industry,
            locationCount: p.locationCount,
            tier: p.tier,
            priority: p.priority,
            competitor: p.competitor,
            score,
            contacts: p.contacts,
            interactions: p.interactions,
            tasks: p.tasks,
            notes: p.noteLog,
          },
        });
        if (error) throw error;
        if (result?.error) throw new Error(result.error);
        const text = result?.brief;
        if (!text) throw new Error("Empty response from meeting prep");
        setBrief(parseMeetingBrief(text));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to generate meeting prep";
        toast.error(msg);
        setBrief(null);
        setOpen(false);
      } finally {
        setLoading(false);
      }
    };

    useImperativeHandle(ref, () => ({
      open: (p: Prospect) => {
        setProspect(p);
        setOpen(true);
        generate(p);
      },
    }));

    const copyBrief = () => {
      if (brief?.raw) {
        navigator.clipboard.writeText(brief.raw);
        toast.success("Meeting prep copied to clipboard!");
      }
    };

    const exportPdf = () => {
      if (!brief?.raw || !prospect) return;
      const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
      const printWindow = window.open("", "_blank");
      if (!printWindow) {
        toast.error("Pop-up blocked — please allow pop-ups for PDF export.");
        return;
      }
      printWindow.document.write(`<!DOCTYPE html><html><head><title>Meeting Prep — ${prospect.name}</title>
<style>
  @media print { body { margin: 0; } @page { margin: 0.75in; } }
  body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; color: #1a1a1a; max-width: 700px; margin: 0 auto; padding: 40px 24px; line-height: 1.6; }
  .header { border-bottom: 2px solid #5158d3; padding-bottom: 12px; margin-bottom: 24px; }
  .header h1 { font-size: 20px; font-weight: 700; margin: 0 0 4px 0; color: #111; }
  .header .meta { font-size: 13px; color: #666; }
  .content { font-size: 14px; white-space: pre-wrap; }
  .content strong { color: #111; }
  .footer { margin-top: 32px; padding-top: 12px; border-top: 1px solid #e5e7eb; font-size: 11px; color: #999; }
</style></head><body>
<div class="header">
  <h1>Meeting Prep — ${prospect.name}</h1>
  <div class="meta">${today} · Prepared by Territory Plan Buddy</div>
</div>
<div class="content">${brief.raw.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</div>
<div class="footer">${prospect.industry || ""}${prospect.industry && prospect.locationCount ? " · " : ""}${prospect.locationCount ? prospect.locationCount + " locations" : ""}</div>
</body></html>`);
      printWindow.document.close();
      setTimeout(() => { printWindow.print(); }, 300);
    };

    const regenerate = () => {
      if (prospect) generate(prospect);
    };

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col" data-testid="meeting-prep-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Meeting Prep{prospect ? ` — ${prospect.name}` : ""}
            </DialogTitle>
            <DialogDescription>
              AI-generated one-pager: context, recent history, contacts, open tasks, talking points, suggested ask.
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div
              className="flex items-center justify-center gap-2 py-8"
              data-testid="meeting-prep-loading"
              role="status"
              aria-live="polite"
            >
              <Loader2 className="w-5 h-5 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Generating meeting prep...</span>
            </div>
          ) : brief ? (
            <div className="space-y-4 flex-1 min-h-0">
              <div className="bg-muted/50 border border-border rounded-lg p-4 overflow-y-auto max-h-[55vh] space-y-4">
                {SECTIONS.map((sec) => {
                  const body = brief[FIELD_BY_SECTION[sec]];
                  return (
                    <section key={sec} className="space-y-1.5" data-testid={`meeting-prep-section-${sec.toLowerCase().replace(/\s+/g, "-")}`}>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{SECTION_LABELS[sec]}</h3>
                      <div className="text-sm leading-relaxed prose prose-sm dark:prose-invert max-w-none">
                        {body
                          ? <ReactMarkdown>{body}</ReactMarkdown>
                          : <span className="italic text-muted-foreground">None on file.</span>}
                      </div>
                    </section>
                  );
                })}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Button onClick={copyBrief} size="sm" className="gap-1.5">
                  <Copy className="w-3.5 h-3.5" /> Copy to Clipboard
                </Button>
                <Button onClick={exportPdf} size="sm" variant="outline" className="gap-1.5">
                  <FileText className="w-3.5 h-3.5" /> Export PDF
                </Button>
                <Button onClick={regenerate} size="sm" variant="outline" className="gap-1.5">
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </Button>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    );
  }
);
MeetingPrepDialog.displayName = "MeetingPrepDialog";
