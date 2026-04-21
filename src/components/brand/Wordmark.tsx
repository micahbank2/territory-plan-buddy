// Simple text wordmark replacing the prior brand logo.
// Uses gradient-text utility (already defined in index.css).
interface WordmarkProps {
  className?: string;
}
export function Wordmark({ className = "" }: WordmarkProps) {
  return (
    <span className={`font-black tracking-tight gradient-text ${className}`}>
      TerritoryPlan
    </span>
  );
}
