import React from "react";
import { cn } from "@/lib/utils";

export function RetroGrid({
  className,
  angle = 65,
}: {
  className?: string;
  angle?: number;
}) {
  return (
    <div
      className={cn(
        "pointer-events-none absolute size-full overflow-hidden [perspective:200px]",
        className,
      )}
    >
      {/* Grid */}
      <div
        style={{ "--grid-angle": `${angle}deg` } as React.CSSProperties}
        className="absolute inset-0 [transform:rotateX(var(--grid-angle))]"
      >
        <div
          className={cn(
            "animate-grid",
            "[background-repeat:repeat] [background-size:60px_60px] [height:300vh] [inset:0%_0px] [margin-left:-200%] [transform-origin:100%_0_0] [width:600vw]",
            "[background-image:linear-gradient(to_right,hsl(var(--primary)/0.15)_1px,transparent_0),linear-gradient(to_bottom,hsl(var(--primary)/0.15)_1px,transparent_0)]",
          )}
        />
      </div>

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-t from-background to-transparent to-90%" />
    </div>
  );
}
