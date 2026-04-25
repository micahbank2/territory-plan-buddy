import { forwardRef, useImperativeHandle, useState } from "react";
import { FileText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { Prospect } from "@/data/prospects";
import type { MeetingBrief } from "@/data/meetingBrief";

export interface MeetingPrepDialogHandle {
  open: (prospect: Prospect) => void;
}

interface MeetingPrepDialogProps {
  score?: number;
  territoryId?: string | null;
}

export const MeetingPrepDialog = forwardRef<MeetingPrepDialogHandle, MeetingPrepDialogProps>(
  function MeetingPrepDialog(_props, ref) {
    const [open, setOpen] = useState(false);
    const [prospect, setProspect] = useState<Prospect | null>(null);
    // brief and loading wired in Task 2
    const [brief] = useState<MeetingBrief | null>(null);
    const [loading] = useState(false);

    useImperativeHandle(ref, () => ({
      open: (p: Prospect) => {
        setProspect(p);
        setOpen(true);
        // Task 2: kick off generate(p) here
      },
    }));

    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-[600px] max-h-[85vh] flex flex-col" data-testid="meeting-prep-dialog">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-primary" />
              Meeting Prep{prospect ? ` — ${prospect.name}` : ""}
            </DialogTitle>
          </DialogHeader>
          <div className="text-xs text-muted-foreground">
            Stub — Task 2 fills body (loading={String(loading)}, brief={brief ? "present" : "null"})
          </div>
        </DialogContent>
      </Dialog>
    );
  }
);
MeetingPrepDialog.displayName = "MeetingPrepDialog";
