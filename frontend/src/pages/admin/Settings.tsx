import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ImagePlus, Loader2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle } from "@/components/admin/AdminLayout";
import { QuestionEditor } from "@/components/admin/QuestionEditor";
import { apiGet, apiPost, apiPut, apiUpload, errMsg } from "@/lib/api";
import type { EndRoundOut, Settings, SettingsIn } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const qc = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  const s = useQuery({ queryKey: ["admin-settings"], queryFn: () => apiGet<Settings>("/admin/settings") });
  const [f, setF] = useState<SettingsIn>({ form_open: false, fee: 199, upi_id: "", payee_name: "" });
  const [qrBust, setQrBust] = useState(0);
  const [endOpen, setEndOpen] = useState(false);
  const [confirm, setConfirm] = useState("");

  useEffect(() => {
    if (s.data) setF({ form_open: s.data.form_open, fee: s.data.fee, upi_id: s.data.upi_id, payee_name: s.data.payee_name });
  }, [s.data]);

  const refresh = () => { qc.invalidateQueries({ queryKey: ["admin-settings"] }); qc.invalidateQueries({ queryKey: ["public-form"] }); };
  const save = useMutation({
    mutationFn: (body: SettingsIn) => apiPut<Settings>("/admin/settings", body),
    onSuccess: (r) => { toast.success(r.form_open ? "Saved — form is OPEN" : "Saved — form is CLOSED"); refresh(); },
    onError: (e) => toast.error(errMsg(e)),
  });
  const qr = useMutation({
    mutationFn: (file: File) => apiUpload<Settings>("/admin/settings/qr", file),
    onSuccess: () => { toast.success("QR code updated"); setQrBust(Date.now()); refresh(); },
    onError: (e) => toast.error(errMsg(e, "Upload failed")),
  });
  const end = useMutation({
    mutationFn: () => apiPost<EndRoundOut>("/admin/end-round", { confirm: "DELETE" }),
    onSuccess: (r) => {
      toast.success(`Round ended — ${r.deleted_entries} entries deleted, form closed`);
      setEndOpen(false); setConfirm("");
      refresh();
      for (const k of ["admin-apps", "admin-app", "admin-candidates", "admin-matches", "admin-email"]) qc.invalidateQueries({ queryKey: [k] });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  return (
    <div className="animate-fade-in space-y-5">
      <PageTitle title="Form & settings" />

      <div className={cn("flex flex-wrap items-center justify-between gap-4 rounded-2xl border p-6", f.form_open ? "border-ok bg-[#E3F4EA]" : "border-sand bg-white")} data-testid="form-toggle-card">
        <div>
          <p className="text-sm text-ink-muted">Registration form is</p>
          <p className={cn("font-display text-3xl", f.form_open ? "text-ok" : "text-wine-deep")} data-testid="form-status-label">{f.form_open ? "Open" : "Closed"}</p>
          <p className="mt-1 text-xs text-ink-muted">{f.form_open ? "People can fill in the form right now." : "Visitors only see \"Forms are closed\"."}</p>
        </div>
        <Button className={cn("h-12 rounded-full px-6", f.form_open && "bg-bad hover:bg-bad/90")} disabled={save.isPending} onClick={() => save.mutate({ ...f, form_open: !f.form_open })} data-testid="form-toggle-button">
          {save.isPending && <Loader2 className="size-4 animate-spin" />} {f.form_open ? "Close form" : "Open form"}
        </Button>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <form className="space-y-4 rounded-2xl border border-sand bg-white p-6" onSubmit={(e) => { e.preventDefault(); save.mutate(f); }} data-testid="settings-form">
          <p className="font-semibold text-ink">Payment details</p>
          <p className="-mt-2 text-xs text-ink-muted">Registration is free for women — payment is only asked from everyone else.</p>
          <div className="space-y-1.5"><Label htmlFor="s-fee">Registration fee (₹)</Label><Input id="s-fee" inputMode="numeric" className="h-11" value={String(f.fee)} onChange={(e) => setF((p) => ({ ...p, fee: Number(e.target.value.replace(/\D/g, "")) || 0 }))} data-testid="settings-fee" /></div>
          <div className="space-y-1.5"><Label htmlFor="s-upi">UPI ID</Label><Input id="s-upi" className="h-11" placeholder="yourname@okaxis" value={f.upi_id} onChange={(e) => setF((p) => ({ ...p, upi_id: e.target.value }))} data-testid="settings-upi_id" /></div>
          <div className="space-y-1.5"><Label htmlFor="s-payee">Payee name</Label><Input id="s-payee" className="h-11" placeholder="SoulMatch" value={f.payee_name} onChange={(e) => setF((p) => ({ ...p, payee_name: e.target.value }))} data-testid="settings-payee_name" /></div>
          <Button type="submit" className="rounded-full" disabled={save.isPending} data-testid="settings-save-button">Save</Button>
        </form>
        <div className="space-y-3 rounded-2xl border border-sand bg-white p-6" data-testid="settings-qr-card">
          <p className="font-semibold text-ink">UPI QR code</p>
          <div className="flex aspect-square max-w-64 items-center justify-center overflow-hidden rounded-2xl border border-dashed border-rose-light bg-blush">
            {s.data?.qr_file_id ? <img src={`/api/public/qr?v=${qrBust || s.data.qr_file_id}`} alt="UPI QR" className="size-full object-contain" data-testid="settings-qr-preview" /> : <ImagePlus className="size-8 text-rose" />}
          </div>
          <Button variant="outline" className="rounded-full" onClick={() => fileRef.current?.click()} disabled={qr.isPending} data-testid="settings-qr-upload-button">
            {qr.isPending && <Loader2 className="size-4 animate-spin" />} {s.data?.qr_file_id ? "Replace QR" : "Upload QR"}
          </Button>
          <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" data-testid="settings-qr-input" onChange={(e) => { const file = e.target.files?.[0]; if (file) qr.mutate(file); e.target.value = ""; }} />
        </div>
      </div>

      <QuestionEditor />

      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-bad/30 bg-[#FFF7F8] p-6" data-testid="end-round-card">
        <div className="max-w-xl">
          <p className="font-semibold text-bad">End round & delete data</p>
          <p className="mt-1 text-sm text-ink-muted">After you've sent all match emails: closes the form and permanently deletes every entry, photo, payment screenshot and match. This can't be undone.</p>
        </div>
        <Button variant="destructive" className="rounded-full" onClick={() => setEndOpen(true)} data-testid="end-round-button"><Trash2 className="size-4" /> End round & delete data</Button>
      </div>

      <Dialog open={endOpen} onOpenChange={setEndOpen}>
        <DialogContent className="sm:max-w-md" data-testid="end-round-dialog">
          <DialogHeader><DialogTitle className="font-display text-2xl text-wine-deep">Delete all round data?</DialogTitle></DialogHeader>
          <p className="text-sm text-ink-muted">All entries, photos, payment screenshots and matches will be permanently deleted. Download the CSV first if you need a record.</p>
          <Label htmlFor="confirm-del" className="mt-2">Type DELETE to confirm</Label>
          <Input id="confirm-del" value={confirm} onChange={(e) => setConfirm(e.target.value)} data-testid="end-round-confirm-input" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setEndOpen(false)}>Cancel</Button>
            <Button variant="destructive" disabled={confirm !== "DELETE" || end.isPending} onClick={() => end.mutate()} data-testid="end-round-confirm-button">
              {end.isPending && <Loader2 className="size-4 animate-spin" />} Delete everything
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
