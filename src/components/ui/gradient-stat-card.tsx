import * as React from "react";
import { cn } from "@/lib/utils";
import { toneCard, type ToneName } from "@/lib/kpi-tones";

export interface GradientStatCardProps extends React.HTMLAttributes<HTMLDivElement> {
  label: React.ReactNode;
  value: React.ReactNode;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: ToneName | string;
  hint?: React.ReactNode;
  size?: "sm" | "md";
}

export function GradientStatCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
  size = "md",
  className,
  ...rest
}: GradientStatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl border bg-gradient-to-br shadow-sm transition-shadow hover:shadow-md",
        size === "sm" ? "p-3" : "p-4",
        toneCard(tone),
        className,
      )}
      {...rest}
    >
      <div className="flex items-center justify-between mb-2 gap-2">
        <span
          className={cn(
            "text-muted-foreground uppercase tracking-wider",
            size === "sm" ? "text-[10px]" : "text-xs",
          )}
        >
          {label}
        </span>
        {Icon && <Icon className="size-4 text-foreground/70 shrink-0" />}
      </div>
      <div
        className={cn(
          "font-bold text-foreground",
          size === "sm" ? "text-lg" : "text-2xl",
        )}
      >
        {value}
      </div>
      {hint != null && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export default GradientStatCard;
