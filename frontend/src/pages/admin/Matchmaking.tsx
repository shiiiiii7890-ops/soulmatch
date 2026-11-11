import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useMutation, useQuery } from "@tanstack/react-query";
import { ChevronDown, Info, Loader2, Search, Share2, ShieldAlert, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PageTitle } from "@/components/admin/AdminLayout";
import { useInvalidateApps } from "@/components/admin/ApplicantSheet";
import { ProfileBlock } from "@/components/admin/Profile";
import { EmailPanel } from "@/components/admin/EmailPanel";
import { PosterPanel } from "@/components/admin/PosterPanel";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, EmailBadge, PaymentBadge, ScoreRing } from "@/components/common";
import { apiDelete, apiGet, apiPost, errMsg } from "@/lib/api";
import type { Application, AssignedMatch, AssignOut, Candidate, OkOut } from "@/lib/types";
import { fmtHeight } from "@/lib/height";
import { cn } from "@/lib/utils";

type Pane = "list" | "profile" | "pool";

function CandidateCard({ c, picked, onPick }: { c: Candidate; picked: boolean; onPick: () => void }) {
  const [open, setOpen] = useState(false);
  const a = c.application;
  return (
    <div className={cn("rounded-2xl border bg-white p-3 transition-[border-color,box-shadow] duration-150", picked ? "border-wine shadow-[0_0_0_3px_rgba(74,18,36,0.12)]" : "border-sand", !c.eligible && "bg-[#FFFBF5]")} data-testid={`candidate-${a.app_code}`}>
      <div className="flex items-center gap-3">
        <Checkbox checked={picked || c.assigned} disabled={c.assigned} onCheckedChange={onPick} data-testid={`candidate-select-${a.app_code}`} />
        <Avatar name={a.full_name} photoId={a.photo_id} size={40} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-ink">{a.full_name}</p>
          <p className="truncate text-xs text-ink-muted">{a.age} · {a.gender} · {a.college}</p>
          <div className="mt-1 flex flex-wrap gap-1">
            {c.assigned && <span className="rounded-full bg-wine px-2 py-0.5 text-[10px] text-white">Assigned</span>}
            {c.reverse_assigned && <span className="rounded-full bg-blush px-2 py-0.5 text-[10px] text-plum-muted">Already has them</span>}
            {c.issues.map((i) => <span key={i} className="rounded-full bg-[#FFF3E0] px-2 py-0.5 text-[10px] text-warn">{i}</span>)}
            {c.warnings.map((w) => <span key={w} className="rounded-full bg-[#FBE4E8] px-2 py-0.5 text-[10px] text-bad">{w}</span>)}
          </div>
        </div>
        <ScoreRing score={c.score} size={48} />
      </div>
      <button className="mt-2 flex w-full items-center justify-between text-[11px] font-semibold text-wine" onClick={() => setOpen(!open)} data-testid={`candidate-breakdown-toggle-${a.app_code}`}>
        {a.dating_vibe} · {a.personality} · {a.intention}
        <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="mt-2 space-y-1.5 border-t border-sand pt-2" data-testid={`candidate-breakdown-${a.app_code}`}>
          {c.breakdown.map((b) => (
            <div key={b.label} className="grid grid-cols-[80px_1fr_40px] items-center gap-2 text-[11px]">
              <span className="text-ink-muted">{b.label}</span>
              <div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-rose" style={{ width: `${(b.score / b.max) * 100}%` }} /></div>
              <span className="text-right font-mono">{b.score}/{b.max}</span>
              <span className="col-span-3 -mt-1 text-[10px] text-ink-muted">{b.note}</span>
            </div>
          ))}
          <div className="flex flex-wrap gap-1 pt-1">{a.qualities.map((q) => <span key={q} className="rounded-full bg-blush px-2 py-0.5 text-[10px] text-plum-muted">{q}</span>)}</div>
        </div>
      )}
    </div>
  );
}

export default function Matchmaking() {
  const [sp, setSp] = useSearchParams();
  const inv = useInvalidateApps();
  const [q, setQ] = useState("");
  const [onlyVerified, setOnlyVerified] = useState(true);
  const [selId, setSelId] = useState<string | null>(sp.get("app"));
  const [override, setOverride] = useState(false);
  const [mutual, setMutual] = useState(true);
  const [picked, setPicked] = useState<string[]>([]);
  const [poolQ, setPoolQ] = useState("");
  const [pane, setPane] = useState<Pane>(sp.get("app") ? "profile" : "list");
  const [emailOpen, setEmailOpen] = useState(false);

  const listQs = useMemo(() => {
    const p = new URLSearchParams();
    if (onlyVerified) p.set("payment_status", "verified");
    if (q.trim()) p.set("q", q.trim());
    return p.toString();
  }, [onlyVerified, q]);
  const list = useQuery({ queryKey: ["admin-apps", listQs], queryFn: () => apiGet<Application[]>(`/admin/applications?${listQs}`) });
  const sel = useQuery({ queryKey: ["admin-app", selId], queryFn: () => apiGet<Application>(`/admin/applications/${selId}`), enabled: !!selId });
  const assigned = useQuery({ queryKey: ["admin-matches", selId], queryFn: () => apiGet<AssignedMatch[]>(`/admin/applications/${selId}/matches`), enabled: !!selId });
  const pool = useQuery({
    queryKey: ["admin-candidates", selId, override],
    queryFn: () => apiGet<Candidate[]>(`/admin/matchmaking/${selId}/candidates?include_all=${override}`), enabled: !!selId,
  });

  const choose = (id: string) => {
    setSelId(id);
    setPicked([]);
    setPane("profile");
    const n = new URLSearchParams(sp); n.set("app", id); setSp(n, { replace: true });
  };

  const assign = useMutation({
    mutationFn: () => apiPost<AssignOut>("/admin/matches", { applicant_id: selId, match_ids: picked, mutual, override }),
    onSuccess: (r) => {
      if (r.created) toast.success(`${r.created} assignment${r.created === 1 ? "" : "s"} created`);
      r.skipped.forEach((s) => toast.warning(s));
      setPicked([]);
      inv();
    },
    onError: (e) => toast.error(errMsg(e)),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete<OkOut>(`/admin/matches/${id}`),
    onSuccess: () => { toast.success("Match removed"); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const pickedIneligible = (pool.data ?? []).filter((c) => picked.includes(c.application.id) && !c.eligible).length;
  const filteredPool = (pool.data ?? []).filter((c) => !poolQ.trim() || `${c.application.full_name} ${c.application.app_code} ${c.application.college}`.toLowerCase().includes(poolQ.trim().toLowerCase()));
  const a = sel.data;

  return (
    <div className="animate-fade-in">
      <PageTitle title="Matching" />

      <div className="mb-4 flex rounded-full border border-sand bg-white p-1 lg:hidden" data-testid="mm-pane-tabs">
        {(["list", "profile", "pool"] as Pane[]).map((p) => (
          <button key={p} onClick={() => setPane(p)} className={cn("flex-1 rounded-full py-2 text-sm capitalize transition-colors", pane === p ? "bg-wine text-white" : "text-ink-muted")} data-testid={`mm-tab-${p}`}>
            {p === "list" ? "Applicants" : p === "profile" ? "Profile" : "Match pool"}
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)_minmax(0,1.1fr)]">
        {/* Left: applicants */}
        <section className={cn("rounded-2xl border border-sand bg-white p-3 lg:block", pane !== "list" && "hidden")} data-testid="mm-applicant-list">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-muted" />
            <Input className="h-10 pl-9" placeholder="Search applicants" value={q} onChange={(e) => setQ(e.target.value)} data-testid="mm-search-input" />
          </div>
          <label className="mt-2 flex items-center gap-2 px-1 text-xs text-ink-muted">
            <Checkbox checked={onlyVerified} onCheckedChange={(v) => setOnlyVerified(!!v)} data-testid="mm-only-verified" /> Verified payments only
          </label>
          <div className="mt-3 max-h-[70vh] space-y-1 overflow-y-auto pr-1">
            {list.isLoading && <Loader2 className="mx-auto my-6 size-5 animate-spin text-wine" />}
            {(list.data ?? []).map((x) => (
              <button key={x.id} onClick={() => choose(x.id)} className={cn("flex w-full items-center gap-3 rounded-xl p-2 text-left transition-colors", selId === x.id ? "bg-blush" : "hover:bg-ivory")} data-testid={`mm-applicant-${x.app_code}`}>
                <Avatar name={x.full_name} photoId={x.photo_id} size={36} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{x.full_name}</p>
                  <p className="truncate text-[11px] text-ink-muted">{x.age} · {x.gender} · {x.college}</p>
                </div>
                <span className={cn("rounded-full px-2 py-0.5 font-mono text-[11px]", x.match_count ? "bg-wine text-white" : "bg-muted text-ink-muted")}>{x.match_count}</span>
              </button>
            ))}
            {list.data?.length === 0 && <p className="py-8 text-center text-xs text-ink-muted">No applicants found.</p>}
          </div>
        </section>

        {/* Center: profile */}
        <section className={cn("rounded-2xl border border-sand bg-white p-5 lg:block", pane !== "profile" && "hidden")} data-testid="mm-profile-panel">
          {!selId ? (
            <div className="flex h-64 flex-col items-center justify-center text-center text-sm text-ink-muted"><Info className="mb-2 size-5" />Select an applicant to start matching.</div>
          ) : !a ? (
            <Loader2 className="mx-auto my-10 size-5 animate-spin text-wine" />
          ) : (
            <div className="space-y-5">
              <div className="flex items-start gap-4">
                <Avatar name={a.full_name} photoId={a.photo_id} size={72} />
                <div className="min-w-0">
                  <h2 className="text-2xl text-wine-deep" data-testid="mm-selected-name">{a.full_name}</h2>
                  <p className="text-sm text-ink-muted">{a.age} · {a.gender} · {fmtHeight(a.height_cm)} · {a.college}, {a.course}{a.year ? ` (${a.year})` : ""}</p>
                  <div className="mt-2 flex flex-wrap gap-1.5"><PaymentBadge status={a.payment.status} /><EmailBadge status={a.email_status} /></div>
                </div>
              </div>

              <div className="rounded-2xl border border-sand p-4" data-testid="mm-assigned-list">
                <div className="mb-2 flex items-center justify-between">
                  <p className="font-semibold text-ink">Assigned matches <span className="font-mono text-ink-muted">({assigned.data?.length ?? 0})</span></p>
                  <Button size="sm" variant="outline" className="rounded-full" disabled={!assigned.data?.length} onClick={() => setEmailOpen(true)} data-testid="mm-share-result-button"><Share2 className="size-3.5" /> Share result</Button>
                </div>
                {assigned.data?.length === 0 && <p className="text-xs text-ink-muted">No matches yet — pick from the match pool.</p>}
                <div className="space-y-1.5">
                  {(assigned.data ?? []).map((m) => (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl bg-ivory p-2" data-testid={`mm-assigned-${m.match.app_code}`}>
                      <Avatar name={m.match.full_name} photoId={m.match.photo_id} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{m.match.full_name}</p>
                        <p className="text-[11px] text-ink-muted">{m.score}% est.{m.override && " · manual override"}</p>
                      </div>
                      <button onClick={() => remove.mutate(m.id)} disabled={remove.isPending} className="rounded-full p-1.5 text-ink-muted hover:bg-[#FBE4E8] hover:text-bad" aria-label="Remove match" data-testid={`mm-remove-${m.match.app_code}`}><X className="size-4" /></button>
                    </div>
                  ))}
                </div>
              </div>
              <ProfileBlock a={a} />
            </div>
          )}
        </section>

        {/* Right: pool */}
        <section className={cn("flex flex-col rounded-2xl border border-sand bg-white p-3 lg:flex", pane !== "pool" && "hidden")} data-testid="mm-pool-panel">
          <div className="flex items-start gap-2 rounded-xl bg-blush p-3 text-[11px] text-plum-muted">
            <Info className="mt-0.5 size-3.5 shrink-0" /> Compatibility is an estimate based on mutual preferences (gender, age, height, personality, qualities, vibe, intention, lifestyle) — not a guarantee. Use your judgement.
          </div>
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Input className="h-9 flex-1" placeholder="Filter pool" value={poolQ} onChange={(e) => setPoolQ(e.target.value)} data-testid="mm-pool-search" />
            <label className="flex items-center gap-2 text-xs text-ink"><Checkbox checked={override} onCheckedChange={(v) => { setOverride(!!v); setPicked([]); }} data-testid="mm-override-toggle" /><ShieldAlert className="size-3.5 text-warn" /> Show unverified too</label>
          </div>
          <div className="mt-3 max-h-[62vh] flex-1 space-y-2 overflow-y-auto pr-1">
            {!selId && <p className="py-10 text-center text-xs text-ink-muted">Select an applicant first.</p>}
            {pool.isLoading && <Loader2 className="mx-auto my-6 size-5 animate-spin text-wine" />}
            {filteredPool.map((c) => (
              <CandidateCard key={c.application.id} c={c} picked={picked.includes(c.application.id)} onPick={() => setPicked((p) => (p.includes(c.application.id) ? p.filter((x) => x !== c.application.id) : [...p, c.application.id]))} />
            ))}
            {selId && pool.data?.length === 0 && <p className="py-10 text-center text-xs text-ink-muted" data-testid="mm-pool-empty">No verified entries yet. Tick "Show unverified too" to see everyone.</p>}
          </div>
          <div className="mt-3 space-y-2 border-t border-sand pt-3">
            {pickedIneligible > 0 && <p className="text-[11px] text-warn" data-testid="mm-override-warning">{pickedIneligible} selected applicant(s) haven't been payment-verified — they'll be assigned as a manual override.</p>}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs text-ink"><Checkbox checked={mutual} onCheckedChange={(v) => setMutual(!!v)} data-testid="mm-mutual-toggle" /> Also match them back (mutual)</label>
              <Button className="rounded-full" disabled={!picked.length || assign.isPending} onClick={() => assign.mutate()} data-testid="mm-assign-button">
                {assign.isPending && <Loader2 className="size-4 animate-spin" />} Assign {picked.length || ""} selected
              </Button>
            </div>
          </div>
        </section>
      </div>

      <Dialog open={emailOpen} onOpenChange={setEmailOpen}>
        <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-2xl" data-testid="mm-email-dialog">
          <DialogHeader><DialogTitle className="font-display text-2xl text-wine-deep">Share result · {a?.full_name}</DialogTitle></DialogHeader>
          <Tabs defaultValue="poster">
            <TabsList>
              <TabsTrigger value="poster" data-testid="share-tab-poster">Poster (for DM)</TabsTrigger>
              <TabsTrigger value="email" data-testid="share-tab-email">Email</TabsTrigger>
            </TabsList>
            <TabsContent value="poster" className="pt-3">
              {emailOpen && a && <PosterPanel person={a} matches={assigned.data ?? []} />}
            </TabsContent>
            <TabsContent value="email" className="pt-3">
              {emailOpen && selId && <EmailPanel appId={selId} />}
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>
    </div>
  );
}
