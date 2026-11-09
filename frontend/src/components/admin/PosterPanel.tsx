import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { Check, Download, ImageDown, Loader2, Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { EmailBadge } from "@/components/common";
import { useInvalidateApps } from "@/components/admin/ApplicantSheet";
import { apiPost, errMsg } from "@/lib/api";
import { renderPoster } from "@/lib/poster";
import { cn } from "@/lib/utils";
import type { Application, AssignedMatch, EmailMarkOut } from "@/lib/types";

interface Item { key: string; name: string; blob: Blob; url: string }

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

export function PosterPanel({ person, matches }: { person: Application; matches: AssignedMatch[] }) {
  const inv = useInvalidateApps();
  const [items, setItems] = useState<Item[]>([]);
  const [busy, setBusy] = useState(true);
  const [idx, setIdx] = useState(0);
  const sig = person.id + "|" + matches.map((m) => m.match.id).join(",");

  useEffect(() => {
    let dead = false;
    const made: string[] = [];
    setBusy(true);
    setIdx(0);
    (async () => {
      try {
        const out: Item[] = [];
        for (let i = 0; i < matches.length; i++) {
          const m = matches[i].match;
          const blob = await renderPoster(person, m, i, matches.length);
          const url = URL.createObjectURL(blob);
          made.push(url);
          out.push({ key: m.id, name: `soulmatch-${slug(person.full_name.split(" ")[0])}-match${i + 1}-${slug(m.full_name.split(" ")[0])}.png`, blob, url });
        }
        if (!dead) setItems(out);
      } catch (e) {
        if (!dead) toast.error(errMsg(e, "Couldn't generate the poster"));
      } finally {
        if (!dead) setBusy(false);
      }
    })();
    return () => {
      dead = true;
      made.forEach((u) => URL.revokeObjectURL(u));
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig]);

  const mark = useMutation({
    mutationFn: () => apiPost<EmailMarkOut>(`/admin/emails/${person.id}/mark-sent`),
    onSuccess: (r) => { toast[r.duplicate ? "info" : "success"](r.duplicate ? "Already marked as sent" : "Marked as sent"); inv(); },
    onError: (e) => toast.error(errMsg(e)),
  });

  const cur = items[Math.min(idx, items.length - 1)];
  const download = (it: Item) => {
    const a = document.createElement("a");
    a.href = it.url;
    a.download = it.name;
    a.click();
  };
  const copyImage = async (it: Item) => {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": it.blob })]);
      toast.success("Poster copied — paste it straight into the DM");
    } catch {
      toast.error("Copy failed in this browser — use Download instead");
    }
  };
  const share = async (it: Item) => {
    const file = new File([it.blob], it.name, { type: "image/png" });
    if (navigator.canShare?.({ files: [file] })) {
      try { await navigator.share({ files: [file] }); } catch { /* cancelled */ }
    } else {
      toast.info("Sharing isn't supported here — use Download or Copy image");
    }
  };
  const downloadAll = async () => {
    for (const it of items) { download(it); await new Promise((r) => setTimeout(r, 350)); }
  };

  if (busy) return <div className="flex h-64 items-center justify-center" data-testid="poster-loading"><Loader2 className="size-5 animate-spin text-wine" /></div>;
  if (!cur) return <p className="rounded-xl bg-muted p-4 text-sm text-ink-muted" data-testid="poster-empty">Assign at least one match to generate a poster.</p>;

  return (
    <div className="space-y-4" data-testid="poster-panel">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <EmailBadge status={person.email_status} testId="poster-status" />
        <span className="text-xs text-ink-muted">{items.length} poster{items.length > 1 ? "s" : ""} · 1080×1350 (Instagram-ready)</span>
      </div>

      {items.length > 1 && (
        <div className="flex flex-wrap gap-2" data-testid="poster-tabs">
          {items.map((it, i) => (
            <button key={it.key} onClick={() => setIdx(i)} className={cn("rounded-full border px-3 py-1 text-xs font-semibold", i === idx ? "border-wine bg-wine text-white" : "border-sand text-ink hover:bg-muted")}>
              {i + 1}. {matches[i].match.full_name.split(" ")[0]}
            </button>
          ))}
        </div>
      )}

      <div className="flex justify-center rounded-2xl bg-ivory p-3">
        <img src={cur.url} alt={`Poster for ${matches[idx]?.match.full_name}`} className="max-h-[58vh] w-auto rounded-xl shadow-md" data-testid="poster-preview" />
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" className="rounded-full" onClick={() => download(cur)} data-testid="poster-download"><Download className="size-3.5" /> Download</Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => copyImage(cur)} data-testid="poster-copy"><ImageDown className="size-3.5" /> Copy image</Button>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => share(cur)} data-testid="poster-share"><Share2 className="size-3.5" /> Share</Button>
        {items.length > 1 && <Button size="sm" variant="outline" className="rounded-full" onClick={downloadAll} data-testid="poster-download-all"><Download className="size-3.5" /> Download all</Button>}
        <Button size="sm" variant="outline" className="rounded-full border-ok text-ok" disabled={mark.isPending || person.email_status === "sent"} onClick={() => mark.mutate()} data-testid="poster-mark-sent">
          {mark.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Check className="size-3.5" />} {person.email_status === "sent" ? "Sent" : "Mark as sent"}
        </Button>
      </div>
      <p className="text-xs text-ink-muted">Each poster is one match for {person.full_name.split(" ")[0]}. Send them in a private DM to this person only — they show the match's details and Instagram handle (no photo).</p>
    </div>
  );
}
