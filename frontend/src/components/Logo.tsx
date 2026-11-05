import { cn } from "@/lib/utils";

export function Logo({ light = false, className }: { light?: boolean; className?: string }) {
  return (
    <span className={cn("font-display text-2xl tracking-tight", light ? "text-ivory" : "text-wine-deep", className)} data-testid="brand-logo">
      Soul<span className={cn("italic", light ? "text-rose-light" : "text-rose")}>Match</span>
    </span>
  );
}
