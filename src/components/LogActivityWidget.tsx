// Placeholder — Task 2 will replace this with the full implementation.
import type { InteractionLog, Task } from "@/data/prospects";

export interface LogActivityWidgetProps {
  prospectId: string;
  addInteraction: (prospectId: string, i: Omit<InteractionLog, "id">) => Promise<boolean>;
  addTask: (prospectId: string, t: Omit<Task, "id">) => Promise<boolean>;
  triggerLastTouchedBump?: () => Promise<void> | void;
}

export function LogActivityWidget(_props: LogActivityWidgetProps) {
  return null;
}
