import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronDown, X } from "lucide-react";

interface MultiSelectProps {
  options: string[];
  selected: string[];
  onChange: (val: string[]) => void;
  placeholder: string;
}

export function MultiSelect({ options, selected, onChange, placeholder }: MultiSelectProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (val: string) => {
    if (selected.includes(val)) {
      onChange(selected.filter((s) => s !== val));
    } else {
      onChange([...selected, val]);
    }
  };

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-2 px-5 py-2.5 text-sm font-semibold rounded-xl border-2 min-w-[120px] justify-between",
          "bg-card/80 backdrop-blur-sm text-foreground hover:bg-muted hover:border-primary/30 hover:shadow-md transition-all",
          selected.length > 0 ? "border-primary/50 bg-primary/5 shadow-sm" : "border-border/60"
        )}
      >
        <span className={cn("truncate", selected.length === 0 && "text-muted-foreground")}>
          {selected.length === 0
            ? placeholder
            : selected.length === 1
            ? selected[0]
            : `${placeholder} (${selected.length})`}
        </span>
        <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
      </button>
      {open && (
        <div className="absolute top-full left-0 right-auto sm:right-auto mt-1.5 z-50 w-60 max-w-[calc(100vw-2rem)] bg-card border border-border rounded-xl shadow-xl py-1.5 max-h-72 overflow-auto">
          {options.map((opt) => (
            <button
              key={opt}
              onClick={() => toggle(opt)}
              className={cn(
                "w-full text-left px-4 py-2.5 text-sm hover:bg-muted transition-colors flex items-center gap-3",
                selected.includes(opt) ? "text-foreground font-medium" : "text-foreground"
              )}
            >
              <div
                className={cn(
                  "w-4 h-4 rounded border-2 flex items-center justify-center shrink-0 transition-colors",
                  selected.includes(opt)
                    ? "bg-primary border-primary"
                    : "border-muted-foreground/30"
                )}
              >
                {selected.includes(opt) && (
                  <svg className="w-2.5 h-2.5 text-primary-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
              {opt}
            </button>
          ))}
        </div>
      )}
      {selected.length > 0 && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onChange([]);
          }}
          className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-muted-foreground rounded-full flex items-center justify-center hover:bg-foreground transition-colors"
        >
          <X className="w-3 h-3 text-background" />
        </button>
      )}
    </div>
  );
}
