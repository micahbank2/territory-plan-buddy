import { useMemo, useState } from "react";
import { addBusinessDays, format } from "date-fns";
import { Target, CalendarIcon, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { INTERACTION_TYPES, type InteractionLog, type Task } from "@/data/prospects";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export interface LogActivityWidgetProps {
  prospectId: string;
  addInteraction: (prospectId: string, i: Omit<InteractionLog, "id">) => Promise<boolean>;
  addTask: (prospectId: string, t: Omit<Task, "id">) => Promise<boolean>;
  /** Called after a successful interaction insert so the prospect's last_touched date refreshes. */
  triggerLastTouchedBump?: () => Promise<void> | void;
}

// Utility className strings copied from TerritoryPlanner to keep the widget self-contained.
const inputClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 placeholder:text-muted-foreground transition-all";
const selectClass =
  "w-full px-3 py-2 text-sm rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 appearance-none cursor-pointer transition-all";

function computeDefaultDue(): string {
  return format(addBusinessDays(new Date(), 3), "yyyy-MM-dd");
}

/**
 * Parse a "yyyy-MM-dd" string as local midnight (not UTC).
 * `new Date("2026-04-27")` parses as UTC which drifts a day west in every
 * timezone east of UTC. This helper avoids that without pulling in a TZ lib.
 */
function parseLocalDate(yyyyMmDd: string): Date {
  const [y, m, d] = yyyyMmDd.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export function LogActivityWidget({
  prospectId,
  addInteraction,
  addTask,
  triggerLastTouchedBump,
}: LogActivityWidgetProps) {
  const defaultDueOnMount = useMemo(() => computeDefaultDue(), []);

  const [type, setType] = useState<string>(INTERACTION_TYPES[0]);
  const [notes, setNotes] = useState("");
  const [showFollowUp, setShowFollowUp] = useState(false);
  const [taskText, setTaskText] = useState("");
  const [taskDue, setTaskDue] = useState<string>(defaultDueOnMount);
  const [submitting, setSubmitting] = useState(false);

  const toggleFollowUp = () => {
    setShowFollowUp((prev) => {
      // When flipping from off -> on, refresh due date so it doesn't go stale past midnight.
      if (!prev) setTaskDue(computeDefaultDue());
      return !prev;
    });
  };

  const handleSubmit = async () => {
    if (!notes.trim() && !(showFollowUp && taskText.trim())) {
      toast.error("Add notes or a follow-up task");
      return;
    }
    setSubmitting(true);

    const today = new Date().toISOString().split("T")[0];
    const interactionOk = await addInteraction(prospectId, {
      type,
      date: today,
      notes: notes.trim() || `${type} logged`,
    });

    if (!interactionOk) {
      // Hook already toasted. Keep form state intact so the user can retry.
      setSubmitting(false);
      return;
    }

    // Interaction landed — clear interaction inputs immediately.
    setNotes("");
    setType(INTERACTION_TYPES[0]);

    if (showFollowUp && taskText.trim()) {
      const taskOk = await addTask(prospectId, { text: taskText.trim(), dueDate: taskDue });
      if (taskOk) {
        setTaskText("");
        setTaskDue(computeDefaultDue());
        setShowFollowUp(false);
        toast.success("Activity logged + task created");
      } else {
        // Hook toasted a generic error; add a contextual one and KEEP follow-up state intact.
        toast.error("Activity logged, but follow-up task failed — retry from the open form");
      }
    } else {
      setShowFollowUp(false);
      toast.success("Activity logged");
    }

    setSubmitting(false);

    // Bump last_touched so the aging dot refreshes (LOG-04).
    if (triggerLastTouchedBump) {
      try {
        await triggerLastTouchedBump();
      } catch {
        // Swallow — non-critical; the interaction row itself landed.
      }
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Target className="w-4 h-4 text-primary" />
        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Log Activity</h3>
      </div>
      <div className="p-3 border border-border rounded-lg bg-muted/30 space-y-3">
        <div className="flex gap-2">
          <select
            aria-label="Interaction type"
            value={type}
            onChange={(e) => setType(e.target.value)}
            className={cn(selectClass, "w-36 text-xs")}
          >
            {INTERACTION_TYPES.filter((t) => t !== "Task Completed").map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="What happened?"
            className={cn(inputClass, "flex-1 text-xs")}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !showFollowUp && !submitting) {
                void handleSubmit();
              }
            }}
          />
        </div>

        {/* Follow-up toggle — widened hit area for touch (UX-V2-02 quick fix) */}
        <button
          type="button"
          onClick={toggleFollowUp}
          className={cn(
            "text-xs font-medium inline-flex items-center gap-1 transition-colors py-1.5 px-2 -mx-2 rounded",
            showFollowUp ? "text-primary" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {showFollowUp ? <Check className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
          {showFollowUp ? "Follow-up task added" : "Add follow-up task"}
        </button>

        {showFollowUp && (
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up">
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Follow-up</label>
              <input
                value={taskText}
                onChange={(e) => setTaskText(e.target.value)}
                placeholder="e.g. Send proposal"
                className={cn(inputClass, "text-xs")}
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-semibold text-muted-foreground uppercase">Due Date</label>
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    className={cn(
                      inputClass,
                      "flex items-center gap-2 text-left text-xs",
                      !taskDue && "text-muted-foreground",
                    )}
                  >
                    <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                    {taskDue ? format(parseLocalDate(taskDue), "PPP") : "Pick a date"}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 z-[60]" align="start">
                  <Calendar
                    mode="single"
                    selected={taskDue ? parseLocalDate(taskDue) : undefined}
                    onSelect={(date) => setTaskDue(date ? format(date, "yyyy-MM-dd") : "")}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        )}

        <Button
          onClick={handleSubmit}
          size="sm"
          disabled={submitting}
          className="w-full text-xs font-semibold"
        >
          Log Activity{showFollowUp && taskText.trim() ? " + Create Task" : ""}
        </Button>
      </div>
    </div>
  );
}
