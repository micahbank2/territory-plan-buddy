import { useState, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Loader2, Copy, SkipForward, CheckCircle, Sparkles, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Prospect } from "@/data/prospects";

interface BulkOutreachQueueProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  prospects: Prospect[];
}

type QueueState = "generating" | "reviewing" | "done";

export function BulkOutreachQueue({ open, onOpenChange, prospects }: BulkOutreachQueueProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [draft, setDraft] = useState("");
  const [state, setState] = useState<QueueState>("generating");
  const [copiedCount, setCopiedCount] = useState(0);
  const [skippedCount, setSkippedCount] = useState(0);
  const [started, setStarted] = useState(false);

  const currentProspect = prospects[currentIndex];
  const total = prospects.length;
  const progress = total > 0 ? ((currentIndex + (state === "done" ? 0 : 0)) / total) * 100 : 0;

  const generateForProspect = useCallback(async (prospect: Prospect) => {
    setState("generating");
    setDraft("");
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("draft-outreach", {
        body: {
          name: prospect.name,
          industry: prospect.industry,
          locationCount: prospect.locationCount,
          competitor: prospect.competitor,
          tier: prospect.tier,
          contacts: prospect.contacts,
          recentInteraction: prospect.interactions?.slice(-1)[0],
        },
      });

      if (fnError) throw fnError;
      if (result?.error) throw new Error(result.error);
      const text = result?.draft || result?.brief || "";
      if (!text) throw new Error("Empty response");
      setDraft(text);
      setState("reviewing");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to generate draft";
      toast.error(`${prospect.name}: ${msg}`);
      setDraft("");
      setState("reviewing"); // Let user skip even on failure
    }
  }, []);

  const handleStart = () => {
    if (prospects.length === 0) return;
    setStarted(true);
    setCurrentIndex(0);
    setCopiedCount(0);
    setSkippedCount(0);
    generateForProspect(prospects[0]);
  };

  const moveToNext = (copied: boolean) => {
    if (copied) {
      if (draft) {
        navigator.clipboard.writeText(draft);
        toast.success(`Copied draft for ${currentProspect?.name}`);
      }
      setCopiedCount(c => c + 1);
    } else {
      setSkippedCount(c => c + 1);
    }

    const nextIdx = currentIndex + 1;
    if (nextIdx >= total) {
      setState("done");
    } else {
      setCurrentIndex(nextIdx);
      generateForProspect(prospects[nextIdx]);
    }
  };

  const handleClose = () => {
    setStarted(false);
    setCurrentIndex(0);
    setDraft("");
    setState("generating");
    setCopiedCount(0);
    setSkippedCount(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[640px] max-h-[85vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Bulk Outreach Queue
          </DialogTitle>
        </DialogHeader>

        {!started ? (
          /* Start screen */
          <div className="py-6 space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              Generate outreach drafts for <strong className="text-foreground">{total} prospect{total !== 1 ? "s" : ""}</strong>.
              You'll review each draft and can copy or skip.
            </p>
            <Button onClick={handleStart} className="gap-2">
              <ArrowRight className="w-4 h-4" /> Start Queue
            </Button>
          </div>
        ) : state === "done" ? (
          /* Completion screen */
          <div className="py-8 space-y-4 text-center">
            <CheckCircle className="w-12 h-12 text-emerald-500 mx-auto" />
            <p className="text-lg font-semibold text-foreground">Queue Complete!</p>
            <div className="flex items-center justify-center gap-6 text-sm">
              <div>
                <span className="text-2xl font-bold text-emerald-600">{copiedCount}</span>
                <span className="text-muted-foreground block">copied</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <span className="text-2xl font-bold text-muted-foreground">{skippedCount}</span>
                <span className="text-muted-foreground block">skipped</span>
              </div>
              <div className="w-px h-10 bg-border" />
              <div>
                <span className="text-2xl font-bold text-foreground">{total}</span>
                <span className="text-muted-foreground block">total</span>
              </div>
            </div>
            <Button onClick={handleClose} variant="outline" className="mt-4">
              Close
            </Button>
          </div>
        ) : (
          /* Generating / reviewing */
          <div className="space-y-4 flex-1 min-h-0">
            {/* Progress */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-foreground">
                  {currentIndex + 1} of {total}
                </span>
                <span className="text-muted-foreground">
                  {copiedCount} copied · {skippedCount} skipped
                </span>
              </div>
              <Progress value={((currentIndex) / total) * 100} className="h-1.5" />
            </div>

            {/* Prospect name header */}
            <div className="bg-muted/50 rounded-lg px-4 py-2">
              <h3 className="font-semibold text-foreground">{currentProspect?.name}</h3>
              <p className="text-xs text-muted-foreground">
                {[currentProspect?.industry, currentProspect?.locationCount ? `${currentProspect.locationCount} locations` : null, currentProspect?.competitor].filter(Boolean).join(" · ")}
              </p>
            </div>

            {/* Draft area */}
            {state === "generating" ? (
              <div className="flex items-center justify-center gap-2 py-12">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-sm text-muted-foreground">Generating draft for {currentProspect?.name}...</span>
              </div>
            ) : (
              <div className="bg-muted/30 border border-border rounded-lg p-4 overflow-y-auto max-h-[40vh]">
                {draft ? (
                  <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{draft}</p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">Failed to generate — skip to continue.</p>
                )}
              </div>
            )}

            {/* Action buttons */}
            {state === "reviewing" && (
              <div className="flex items-center gap-2 pt-1">
                <Button onClick={() => moveToNext(true)} disabled={!draft} className="gap-1.5 flex-1">
                  <Copy className="w-3.5 h-3.5" />
                  {currentIndex + 1 < total ? "Copy & Next" : "Copy & Finish"}
                </Button>
                <Button onClick={() => moveToNext(false)} variant="outline" className="gap-1.5">
                  <SkipForward className="w-3.5 h-3.5" /> Skip
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
