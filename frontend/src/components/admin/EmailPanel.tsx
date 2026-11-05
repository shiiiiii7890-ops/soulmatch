import { useMutation, useQuery } from "@tanstack/react-query";
import { Check, ClipboardCopy, FileText, Loader2, Mail } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailBadge } from "@/components/common";
import { useInvalidateApps } from "@/components/admin/ApplicantSheet";
import { apiGet, apiPost, errMsg } from "@/lib/api";
import { copyRich, copyText } from "@/lib/hooks";
import { fmtDateTime } from "@/lib/options";
import type { EmailMarkOut, EmailPreview } from "@/lib/types";

export function EmailPanel({ appId }: { appId: string }) {
  const inv = useInvalidateApps();
  const { data: p, isLoading } = useQuery({ queryKey: ["admin-email", appId], queryFn: () => apiGet<EmailPreview>(`/admin/emails/${appId}/preview`) });
  const mark = useMutation({
    mutationFn: () => apiPost<EmailMarkOut>(`/admin/emails/${appId}/mark-sent`),
    onSuccess: (r) => { toast[r.duplicate ? "info" : "success"](r.duplicate ? "Already marked as sent" : "Marked as sent"); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (isLoading || !p) return <div className="flex h-40 items-center justify-center"><Loader2 className="size-5 animate-spin text-wine" /></div>;
  const copy = (fn: () => Promise<void>, what: string) => fn().then(() => toast.success(`${what} copied`)).catch(() => toast.error("Copy failed — clipboard blocked by browser"));
  const mailto = `mailto:${p.to}?subject=${encodeURIComponent(p.subject)}&body=${encodeURIComponent(p.text)}`;

  return (
    <div className="space-y-4" data-testid="email-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <EmailBadge status={p.status} testId="email-panel-status" />
        {p.sent_at && <span className="text-xs text-ink-muted">Marked sent {fmtDateTime(p.sent_at)}</span>}
      </div>
      {p.match_count === 0 ? (
        <p className="rounded-xl bg-muted p-4 text-sm text-ink-muted" data-testid="email-no-matches">Assign at least one match to generate this email.</p>
      ) : (
        <>
          <div className="space-y-2 rounded-xl border border-sand bg-ivory p-3 text-sm">
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate"><span className="text-ink-muted">To: </span><span className="font-medium" data-testid="email-to">{p.to}</span></span>
              <button className="shrink-0 text-xs font-semibold text-wine" onClick={() => copy(() => copyText(p.to), "Email address")} data-testid="email-copy-to">Copy</button>
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="min-w-0 truncate"><span className="text-ink-muted">Subject: </span><span className="font-medium" data-testid="email-subject">{p.subject}</span></span>
              <button className="shrink-0 text-xs font-semibold text-wine" onClick={() => copy(() => copyText(p.subject), "Subject")} data-testid="email-copy-subject">Copy</button>
            </div>
          </div>
          <iframe title="Email preview" srcDoc={p.html} className="h-[440px] w-full rounded-xl border border-sand bg-ivory" sandbox="" data-testid="email-preview-iframe" />
          <div className="flex flex-wrap gap-2">
            <Button size="sm" className="rounded-full" onClick={() => copy(() => copyRich(p.html, p.text), "Email")} data-testid="email-copy-rich"><ClipboardCopy className="size-3.5" /> Copy email</Button>
            <Button size="sm" variant="outline" className="rounded-full" onClick={() => copy(() => copyText(p.text), "Plain text")} data-testid="email-copy-text"><FileText className="size-3.5" /> Copy plain text</Button>
            <a href={mailto} className="inline-flex h-7 items-center gap-1 rounded-full border border-border px-2.5 text-sm font-medium hover:bg-muted" data-testid="email-open-mail-app"><Mail className="size-3.5" /> Open in mail app</a>
            <Button size="sm" variant="outline" className="rounded-full border-ok text-ok" disabled={mark.isPending || p.status === "sent"} onClick={() => mark.mutate()} data-testid="email-mark-sent-button">
              {mark.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} {p.status === "sent" ? "Sent" : "Mark as sent"}
            </Button>
          </div>
          <p className="text-xs text-ink-muted">"Copy email" keeps the formatting — paste it straight into Gmail or Outlook and send it to this person only.</p>
        </>
      )}
    </div>
  );
}
