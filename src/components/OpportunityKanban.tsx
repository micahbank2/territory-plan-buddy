import { useMemo, useState, useEffect } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/hooks/useOpportunities";

const KANBAN_STAGES = ["Develop", "Discovery", "Validate", "Propose", "Negotiate", "Closed Won"];

const stageColors: Record<string, string> = {
  Develop: "border-t-slate-400",
  Discovery: "border-t-blue-500",
  Validate: "border-t-violet-500",
  Propose: "border-t-amber-500",
  Negotiate: "border-t-orange-500",
  "Closed Won": "border-t-emerald-500",
};

const typeColors: Record<string, string> = {
  "Net New": "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
  Renewal: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
  "Order Form": "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
};

interface ProspectInfo {
  name: string;
  website: string;
  customLogo?: string;
}

interface Props {
  opportunities: Opportunity[];
  prospectMap: Map<string, ProspectInfo>;
  onCardClick: (id: string) => void;
  onStageChange: (id: string, newStage: string) => void;
}

// --- Card logo ---
function CardLogo({ website, accountName, size = 20 }: { website?: string; accountName?: string; size?: number }) {
  const [logoError, setLogoError] = useState(false);
  const domain = website?.trim().replace(/^https?:\/\//, "").replace(/\/.*$/, "").trim() || "";
  const clearbitUrl = domain ? `https://logo.clearbit.com/${domain}` : "";
  const initial = (accountName || "?")[0].toUpperCase();

  useEffect(() => { setLogoError(false); }, [domain]);

  if (!domain || logoError) return (
    <div className="rounded bg-primary/10 flex items-center justify-center shrink-0 text-primary font-bold" style={{ width: size, height: size, fontSize: size * 0.45 }}>
      {initial}
    </div>
  );
  return <img src={clearbitUrl} alt="" className="rounded bg-muted object-contain shrink-0" style={{ width: size, height: size }} onError={() => setLogoError(true)} />;
}

// --- Single draggable card ---
function KanbanCard({ opp, prospectMap, onClick, isDragOverlay }: {
  opp: Opportunity;
  prospectMap: Map<string, ProspectInfo>;
  onClick: () => void;
  isDragOverlay?: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: opp.id });

  const style = isDragOverlay ? {} : {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const prospect = opp.prospect_id ? prospectMap.get(opp.prospect_id) : undefined;
  const website = (opp as any).website || prospect?.website || "";
  const accountLabel = prospect?.name || "";
  const today = new Date().toISOString().split("T")[0];
  const isPastDue = opp.close_date && opp.close_date < today;

  return (
    <div
      ref={isDragOverlay ? undefined : setNodeRef}
      style={style}
      {...(isDragOverlay ? {} : { ...attributes, ...listeners })}
      onClick={(e) => {
        // Don't open drawer if we just finished dragging
        if (!isDragging) {
          e.stopPropagation();
          onClick();
        }
      }}
      className={cn(
        "rounded-lg border border-border bg-card p-3 cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow",
        isDragging && !isDragOverlay && "opacity-30",
        isDragOverlay && "shadow-lg ring-2 ring-primary/20 rotate-[2deg]"
      )}
    >
      {/* Name + logo */}
      <div className="flex items-start gap-2 mb-2">
        <CardLogo website={website} accountName={accountLabel || opp.name} size={22} />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground truncate leading-tight">{opp.name}</p>
          {accountLabel && (
            <p className="text-xs text-muted-foreground truncate">{accountLabel}</p>
          )}
        </div>
      </div>

      {/* ACV + type */}
      <div className="flex items-center justify-between gap-2 mb-1.5">
        <span className="text-sm font-mono font-bold text-foreground">
          ${(opp.potential_value || 0).toLocaleString()}
        </span>
        <Badge className={`${typeColors[opp.type] || "bg-muted text-foreground"} border-0 text-[10px] px-1.5 py-0`}>
          {opp.type}
        </Badge>
      </div>

      {/* Close date */}
      {opp.close_date && (
        <p className={cn("text-xs", isPastDue ? "text-red-600 dark:text-red-400 font-medium" : "text-muted-foreground")}>
          Close: {opp.close_date}
        </p>
      )}
    </div>
  );
}

// --- Droppable column ---
function KanbanColumn({ stage, opps, prospectMap, onCardClick, totalACV }: {
  stage: string;
  opps: Opportunity[];
  prospectMap: Map<string, ProspectInfo>;
  onCardClick: (id: string) => void;
  totalACV: number;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });

  return (
    <div className="flex flex-col min-w-[260px] w-[260px] shrink-0">
      {/* Column header */}
      <div className={cn("rounded-t-lg border-t-[3px] px-3 py-2 bg-muted/40 border border-border border-b-0", stageColors[stage] || "border-t-slate-400")}>
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold uppercase tracking-wider text-foreground">{stage}</h3>
          <span className="text-xs font-mono text-muted-foreground">{opps.length}</span>
        </div>
      </div>

      {/* Cards area */}
      <div
        ref={setNodeRef}
        className={cn(
          "flex-1 min-h-[120px] p-2 space-y-2 border border-border border-t-0 rounded-b-lg bg-muted/10 transition-colors overflow-y-auto",
          isOver && "bg-primary/5 border-primary/30"
        )}
        style={{ maxHeight: "calc(100vh - 300px)" }}
      >
        <SortableContext items={opps.map(o => o.id)} strategy={verticalListSortingStrategy}>
          {opps.map(opp => (
            <KanbanCard
              key={opp.id}
              opp={opp}
              prospectMap={prospectMap}
              onClick={() => onCardClick(opp.id)}
            />
          ))}
        </SortableContext>

        {opps.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-muted-foreground italic">
            No deals
          </div>
        )}
      </div>

      {/* Column total */}
      <div className="px-3 py-1.5 text-xs font-mono font-semibold text-muted-foreground border border-border border-t-0 rounded-b-lg bg-muted/20 -mt-px">
        ${totalACV.toLocaleString()}
      </div>
    </div>
  );
}

// --- Main kanban board ---
export function OpportunityKanban({ opportunities, prospectMap, onCardClick, onStageChange }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const columnData = useMemo(() => {
    const byStage: Record<string, Opportunity[]> = {};
    for (const stage of KANBAN_STAGES) byStage[stage] = [];
    for (const opp of opportunities) {
      if (byStage[opp.stage]) {
        byStage[opp.stage].push(opp);
      }
      // Won maps to Closed Won column
      if (opp.stage === "Won" && byStage["Closed Won"]) {
        byStage["Closed Won"].push(opp);
      }
    }
    return byStage;
  }, [opportunities]);

  const activeOpp = activeId ? opportunities.find(o => o.id === activeId) : undefined;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(event.active.id as string);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const oppId = active.id as string;
    const opp = opportunities.find(o => o.id === oppId);
    if (!opp) return;

    // Determine target stage - over.id could be a stage name (column) or another card id
    let targetStage: string | null = null;

    // Check if dropped on a column directly
    if (KANBAN_STAGES.includes(over.id as string)) {
      targetStage = over.id as string;
    } else {
      // Dropped on a card - find which column that card is in
      const targetOpp = opportunities.find(o => o.id === over.id);
      if (targetOpp && KANBAN_STAGES.includes(targetOpp.stage)) {
        targetStage = targetOpp.stage;
      } else if (targetOpp?.stage === "Won") {
        targetStage = "Closed Won";
      }
    }

    if (targetStage && targetStage !== opp.stage && !(opp.stage === "Won" && targetStage === "Closed Won")) {
      onStageChange(oppId, targetStage);
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-3 overflow-x-auto pb-4 pt-1">
        {KANBAN_STAGES.map(stage => (
          <KanbanColumn
            key={stage}
            stage={stage}
            opps={columnData[stage] || []}
            prospectMap={prospectMap}
            onCardClick={onCardClick}
            totalACV={(columnData[stage] || []).reduce((s, o) => s + (o.potential_value || 0), 0)}
          />
        ))}
      </div>

      <DragOverlay>
        {activeOpp ? (
          <KanbanCard
            opp={activeOpp}
            prospectMap={prospectMap}
            onClick={() => {}}
            isDragOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
