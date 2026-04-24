import { Wordmark } from "@/components/brand/Wordmark";
import { Button } from "@/components/ui/button";
import { Plus, LogOut, Zap } from "lucide-react";
import { AddProspectDialog } from "@/components/AddProspectDialog";
import type { Prospect } from "@/data/prospects";

export function SkeletonRows({ count = 8 }: { count?: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <tr key={i} className="border-b border-border last:border-0">
          {Array.from({ length: 7 }).map((_, j) => (
            <td key={j} className="px-5 py-4">
              <div
                className="skeleton-shimmer rounded-md h-4 w-full"
                style={{ maxWidth: j === 0 ? 200 : 80 }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export function PlannerLoadingShell() {
  return (
    <div className="bg-background min-h-screen px-4 sm:px-8 pt-8 yext-grid-bg">
      <div className="h-8 w-48 skeleton-shimmer rounded-lg mb-6" />
      <div className="flex gap-2 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-24 skeleton-shimmer rounded-lg" />
        ))}
      </div>
      <div className="border border-border rounded-xl overflow-hidden bg-card/80 backdrop-blur-sm">
        <table className="w-full text-sm">
          <tbody>
            <SkeletonRows />
          </tbody>
        </table>
      </div>
    </div>
  );
}

export interface WelcomeScreenProps {
  isOwner: boolean;
  seeding: boolean;
  onSeed: () => void;
  onSignOut: () => void;
  data: Prospect[];
  add: (partial: Partial<Prospect>) => Promise<string>;
  addNote: (prospectId: string, text: string) => Promise<void>;
  inputClass: string;
  selectClass: string;
  showAdd: boolean;
  setShowAdd: (v: boolean) => void;
}

export function WelcomeScreen({
  isOwner,
  seeding,
  onSeed,
  onSignOut,
  data,
  add,
  addNote,
  inputClass,
  selectClass,
  showAdd,
  setShowAdd,
}: WelcomeScreenProps) {
  return (
    <div className="bg-background min-h-screen flex items-center justify-center yext-grid-bg">
      <div className="text-center space-y-6 max-w-md px-4">
        <Wordmark className="text-2xl block mx-auto" />
        <h1 className="text-3xl font-black text-foreground">Welcome to Territory Planner</h1>
        <p className="text-muted-foreground">
          {isOwner
            ? "You don't have any prospects yet. Would you like to start with the FY27 seed data (309 accounts)?"
            : "You don't have any prospects yet. Add your first prospect to get started!"}
        </p>
        <div className="flex gap-3 justify-center">
          {isOwner && (
            <Button onClick={onSeed} disabled={seeding} className="gap-2">
              <Zap className="w-4 h-4" /> {seeding ? "Importing..." : "Import Seed Data"}
            </Button>
          )}
          <Button variant="outline" onClick={() => setShowAdd(true)} className="gap-2">
            <Plus className="w-4 h-4" /> Start Fresh
          </Button>
          <Button variant="ghost" onClick={onSignOut} className="gap-2">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>
        </div>
        <AddProspectDialog
          open={showAdd}
          onOpenChange={setShowAdd}
          onAdd={add}
          onAddNote={addNote}
          existingNames={data.map((p) => p.name)}
          inputClass={inputClass}
          selectClass={selectClass}
        />
      </div>
    </div>
  );
}
