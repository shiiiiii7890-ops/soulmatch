import { useState } from "react";
import { HeartHandshake, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Avatar, EmailBadge, PaymentBadge } from "@/components/common";
import { ProfileBlock } from "@/components/admin/Profile";
import { apiDelete, apiGet, apiPost, errMsg } from "@/lib/api";
import { fmtDateTime } from "@/lib/options";
import type { Application, OkOut } from "@/lib/types";
import { cn } from "@/lib/utils";

export function useInvalidateApps() {
  const qc = useQueryClient();
  return () => {
    for (const k of ["admin-apps", "admin-app", "admin-candidates", "admin-matches", "admin-email"]) qc.invalidateQueries({ queryKey: [k] });
  };
}

export function ApplicantSheet({ appId, onClose }: { appId: string | null; onClose: () => void }) {
  const inv = useInvalidateApps();
  const [note, setNote] = useState("");
  const [confirmDel, setConfirmDel] = useState(false);
  const { data: a, isLoading } = useQuery({
    queryKey: ["admin-app", appId], queryFn: () => apiGet<Application>(`/admin/applications/${appId}`), enabled: !!appId,
  });
  const review = useMutation({
    mutationFn: (status: "verified" | "rejected") => apiPost<Application>(`/admin/applications/${appId}/payment`, { status, note }),
    onSuccess: (r) => { toast.success(r.payment.status === "verified" ? "Payment verified" : "Payment rejected"); setNote(""); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const del = useMutation({
    mutationFn: () => apiDelete<OkOut>(`/admin/applications/${appId}`),
    onSuccess: (r) => { toast.success(r.message); setConfirmDel(false); onClose(); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <Sheet open={!!appId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="w-full overflow-y-auto bg-white p-0 data-[side=right]:sm:max-w-xl" data-testid="applicant-sheet">
        <SheetTitle className="sr-only">Entry details</SheetTitle>
        {isLoading || !a ? (
          <div className="flex h-60 items-center justify-center"><Loader2 className="size-6 animate-spin text-wine" /></div>
        ) : (
          <div className="space-y-6 p-6">
            <div className="flex items-start gap-4">
              {a.photo_id ? (
                <a href={`/api/admin/files/${a.photo_id}`} target="_blank" rel="noreferrer"><img src={`/api/admin/files/${a.photo_id}`} alt={a.full_name} className="h-28 w-24 rounded-2xl object-cover" data-testid="applicant-photo" /></a>
              ) : <Avatar name={a.full_name} size={96} />}
              <div className="min-w-0 flex-1">
                <p className="font-mono text-xs text-ink-muted" data-testid="applicant-app-code">{a.app_code}</p>
                <h2 className="text-2xl text-wine-deep" data-testid="applicant-name">{a.full_name}</h2>
                <div className="mt-2 flex flex-wrap gap-1.5"><PaymentBadge status={a.payment.status} testId="applicant-payment-badge" /><EmailBadge status={a.email_status} /></div>
                <p className="mt-2 text-xs text-ink-muted">Submitted {fmtDateTime(a.created_at)} · {a.match_count} matches</p>
              </div>
            </div>
            <Link to={`/admin/matching?app=${a.id}`} className={cn(buttonVariants({ size: "sm" }), "rounded-full")} data-testid="applicant-open-matching"><HeartHandshake className="size-3.5" /> Find matches</Link>

            <section className="space-y-3 rounded-2xl border border-sand p-4" data-testid="applicant-payment-section">
              <div className="flex items-center justify-between"><h3 className="font-sans font-semibold text-ink">Payment proof</h3><PaymentBadge status={a.payment.status} /></div>
              <div className="flex gap-4">
                {a.payment.screenshot_id ? (
                  <a href={`/api/admin/files/${a.payment.screenshot_id}`} target="_blank" rel="noreferrer">
                    <img src={`/api/admin/files/${a.payment.screenshot_id}`} alt="Payment screenshot" className="h-40 w-28 rounded-xl border border-sand object-cover" data-testid="applicant-payment-screenshot" />
                  </a>
                ) : <div className="flex h-40 w-28 items-center justify-center rounded-xl bg-muted text-center text-[11px] text-ink-muted">No screenshot</div>}
                <dl className="space-y-2 text-sm">
                  <div><dt className="text-[11px] text-ink-muted">UTR</dt><dd className="font-mono font-semibold" data-testid="applicant-utr">{a.payment.utr}</dd></div>
                  <div><dt className="text-[11px] text-ink-muted">Submitted</dt><dd>{fmtDateTime(a.payment.submitted_at)}</dd></div>
                  {a.payment.reviewed_at && <div><dt className="text-[11px] text-ink-muted">Reviewed</dt><dd>{fmtDateTime(a.payment.reviewed_at)}</dd></div>}
                  {a.payment.note && <div><dt className="text-[11px] text-ink-muted">Note</dt><dd>{a.payment.note}</dd></div>}
                </dl>
              </div>
              <Input placeholder="Note (optional)" value={note} onChange={(e) => setNote(e.target.value)} data-testid="payment-review-note" />
              <div className="flex gap-2">
                <Button size="sm" className="rounded-full bg-ok hover:bg-ok/90" disabled={review.isPending || a.payment.status === "verified"} onClick={() => review.mutate("verified")} data-testid="payment-verify-button">Verify payment</Button>
                <Button size="sm" variant="outline" className="rounded-full border-bad text-bad" disabled={review.isPending || a.payment.status === "rejected"} onClick={() => review.mutate("rejected")} data-testid="payment-reject-button">Reject</Button>
              </div>
            </section>

            <ProfileBlock a={a} />

            <div className="border-t border-sand pt-4">
              {confirmDel ? (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#FBE4E8] p-3 text-sm text-bad">
                  Delete this entry permanently?
                  <Button size="sm" variant="destructive" onClick={() => del.mutate()} disabled={del.isPending} data-testid="applicant-delete-confirm">Delete</Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmDel(false)}>Cancel</Button>
                </div>
              ) : (
                <Button size="sm" variant="ghost" className="text-bad" onClick={() => setConfirmDel(true)} data-testid="applicant-delete-button"><Trash2 className="size-3.5" /> Delete entry</Button>
              )}
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
