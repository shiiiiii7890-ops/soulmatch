import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { slug } from "@/lib/options";
import { Badge } from "@/components/ui/badge";
import { EMAIL_LABEL, PAYMENT_LABEL } from "@/lib/options";
import type { EmailStatus, PaymentStatus } from "@/lib/types";

interface ChipGroupProps<T extends string> {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  multiple?: boolean;
  max?: number;
  testId: string;
  disabled?: boolean;
}

export function ChipGroup<T extends string>({ options, value, onChange, multiple = true, max, testId, disabled }: ChipGroupProps<T>) {
  const toggle = (o: T) => {
    if (!multiple) return onChange([o]);
    if (value.includes(o)) return onChange(value.filter((x) => x !== o));
    if (max && value.length >= max) return;
    onChange([...value, o]);
  };
  return (
    <div className={cn("flex flex-wrap gap-2", disabled && "pointer-events-none opacity-45")} role={multiple ? "group" : "radiogroup"} data-testid={testId}>
      {options.map((o) => {
        const on = value.includes(o);
        return (
          <button
            type="button"
            key={o}
            onClick={() => toggle(o)}
            aria-pressed={on}
            data-testid={`${testId}-${slug(o)}`}
            className={cn(
              "inline-flex min-h-11 items-center gap-1.5 rounded-full border px-4 text-sm transition-[background-color,border-color,color,transform] duration-150 active:scale-[0.97]",
              on ? "border-wine bg-wine text-white" : "border-sand bg-white text-ink hover:border-rose-light hover:bg-blush",
            )}
          >
            {on && <Check className="size-3.5" />}
            {o}
          </button>
        );
      })}
    </div>
  );
}

const PAY_STYLE: Record<PaymentStatus, string> = {
  pending: "bg-[#FFF3E0] text-warn",
  verified: "bg-[#E3F4EA] text-ok",
  rejected: "bg-[#FBE4E8] text-bad",
};
export function PaymentBadge({ status, testId }: { status: PaymentStatus; testId?: string }) {
  return <Badge className={cn("rounded-full border-0 font-medium", PAY_STYLE[status])} data-testid={testId ?? "payment-status-badge"}>{PAYMENT_LABEL[status]}</Badge>;
}

const EMAIL_STYLE: Record<EmailStatus, string> = {
  no_matches: "bg-muted text-ink-muted",
  pending: "bg-[#FFF3E0] text-warn",
  sent: "bg-[#E3F4EA] text-ok",
};
export function EmailBadge({ status, testId }: { status: EmailStatus; testId?: string }) {
  return <Badge className={cn("rounded-full border-0 font-medium", EMAIL_STYLE[status])} data-testid={testId ?? "email-status-badge"}>{EMAIL_LABEL[status]}</Badge>;
}

export function Avatar({ name, photoId, size = 44, className }: { name: string; photoId?: string | null; size?: number; className?: string }) {
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  return photoId ? (
    <img src={`/api/admin/files/${photoId}`} alt={name} style={{ width: size, height: size }} className={cn("shrink-0 rounded-full object-cover ring-2 ring-white", className)} />
  ) : (
    <span style={{ width: size, height: size }} className={cn("inline-flex shrink-0 items-center justify-center rounded-full bg-blush-card font-display text-wine ring-2 ring-white", className)}>
      {initials}
    </span>
  );
}

export function ScoreRing({ score, size = 52 }: { score: number; size?: number }) {
  const r = size / 2 - 4;
  const c = 2 * Math.PI * r;
  const color = score >= 75 ? "#1E6B48" : score >= 50 ? "#A3485E" : "#8F5000";
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }} data-testid="compat-score-ring">
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#F3ECE6" strokeWidth="4" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="4" fill="none" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c - (c * score) / 100}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.22,1,0.36,1)" }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center font-mono text-xs font-semibold text-ink">{score}%</span>
    </div>
  );
}
