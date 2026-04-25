import { useState } from "react";

function fmt(n: number): string {
  return "$" + Math.round(n).toLocaleString();
}

interface EditableCellProps {
  value: number;
  onChange: (v: number) => void;
  isCurrency?: boolean;
  ariaLabel?: string;
}

export function EditableCell({
  value,
  onChange,
  isCurrency = true,
  ariaLabel,
}: EditableCellProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");

  if (editing) {
    return (
      <input
        autoFocus
        type="number"
        aria-label={ariaLabel}
        className="w-full bg-transparent text-right font-mono text-sm border-b border-primary outline-none py-0.5 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => {
          onChange(parseInt(draft) || 0);
          setEditing(false);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            onChange(parseInt(draft) || 0);
            setEditing(false);
          }
          if (e.key === "Escape") setEditing(false);
        }}
      />
    );
  }

  return (
    <span
      role="button"
      tabIndex={0}
      aria-label={ariaLabel}
      onClick={() => {
        setDraft(String(value || ""));
        setEditing(true);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          setDraft(String(value || ""));
          setEditing(true);
        }
      }}
      className="cursor-pointer hover:text-primary hover:bg-primary/5 rounded px-1.5 py-0.5 -mx-1.5 transition-colors font-mono text-sm border border-transparent hover:border-primary/20"
      title="Click to edit"
    >
      {isCurrency ? fmt(value) : value.toLocaleString()}
    </span>
  );
}
