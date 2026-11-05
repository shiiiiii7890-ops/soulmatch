import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Opt {
  value: string;
  label: string;
}

// "" is represented internally by the sentinel "__all" so base-ui always has a concrete value.
export function SimpleSelect({
  value, onChange, options, placeholder, testId, className,
}: { value: string; onChange: (v: string) => void; options: Opt[]; placeholder?: string; testId: string; className?: string }) {
  const all = placeholder !== undefined;
  const v = value === "" && all ? "__all" : value;
  const labels: Record<string, string> = Object.fromEntries(options.map((o) => [o.value, o.label]));
  if (all) labels["__all"] = placeholder ?? "All";
  return (
    <Select value={v} onValueChange={(x) => onChange(x === "__all" ? "" : x)}>
      <SelectTrigger className={cn("h-10 w-full bg-white", className)} data-testid={testId}>
        <SelectValue>{(x) => labels[x as string] ?? placeholder ?? "Select"}</SelectValue>
      </SelectTrigger>
      <SelectContent>
        {all && <SelectItem value="__all" data-testid={`${testId}-opt-all`}>{placeholder}</SelectItem>}
        {options.map((o) => (
          <SelectItem key={o.value} value={o.value} data-testid={`${testId}-opt-${o.value.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`}>
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export const toOpts = (xs: readonly string[]): Opt[] => xs.map((x) => ({ value: x, label: x }));
