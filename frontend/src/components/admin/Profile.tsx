import type { Application } from "@/lib/types";
import { fmtFtIn, fmtHeight } from "@/lib/height";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex flex-col">
      <dt className="text-[11px] text-ink-muted">{k}</dt>
      <dd className="break-all text-sm font-medium text-ink">{v || "—"}</dd>
    </div>
  );
}

function Chips({ items }: { items: string[] }) {
  if (!items.length) return <span className="text-sm text-ink-muted">Any</span>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((x) => <span key={x} className="rounded-full bg-blush px-2 py-0.5 text-[11px] text-plum-muted">{x}</span>)}
    </div>
  );
}

export function ProfileBlock({ a, compact }: { a: Application; compact?: boolean }) {
  const p = a.preferences;
  return (
    <div className="space-y-5" data-testid="profile-block">
      {!compact && (
        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Row k="Age" v={String(a.age)} /><Row k="Gender" v={a.gender} /><Row k="Height" v={fmtHeight(a.height_cm)} />
          <Row k="Mobile" v={a.mobile} /><Row k="Email" v={a.email} /><Row k="Instagram" v={"@" + a.instagram} />
          <Row k="College" v={a.college} /><Row k="Course" v={a.course} /><Row k="City" v={a.city} />
          <Row k="Hometown" v={a.hometown} /><Row k="Religion" v={a.religion ? `${a.religion}${a.share_religion ? " (shareable)" : " (private)"}` : ""} />
        </dl>
      )}
      <div className="space-y-2 rounded-2xl bg-ivory p-4">
        <p className="overline text-rose">About</p>
        <dl className="grid grid-cols-2 gap-3">
          <Row k="Personality" v={a.personality} /><Row k="Dating vibe" v={a.dating_vibe} />
          <Row k="Intention" v={a.intention} />
        </dl>
        <div><p className="mb-1 text-[11px] text-ink-muted">Qualities</p><Chips items={a.qualities} /></div>
        <div><p className="mb-1 text-[11px] text-ink-muted">Lifestyle</p><Chips items={a.lifestyle} /></div>
      </div>
      <div className="space-y-2 rounded-2xl bg-blush p-4">
        <p className="overline text-rose">Looking for {p.surprise_me && <span className="ml-1 rounded-full bg-wine px-2 py-0.5 text-[10px] normal-case tracking-normal text-white">Surprise me</span>}</p>
        <dl className="grid grid-cols-2 gap-3">
          <Row k="Gender" v={p.genders.join(", ") || "Any"} /><Row k="Age" v={`${p.age_min}–${p.age_max}`} />
          <Row k="Height" v={`${fmtFtIn(p.height_min)} – ${fmtFtIn(p.height_max)}`} /><Row k="Personality" v={p.personalities.join(", ") || "Any"} />
          {p.college && <Row k="College" v={p.college} />}{p.location && <Row k="Location" v={p.location} />}
        </dl>
        <div><p className="mb-1 text-[11px] text-ink-muted">Qualities</p><Chips items={p.qualities} /></div>
        <div><p className="mb-1 text-[11px] text-ink-muted">Vibe</p><Chips items={p.vibes} /></div>
        <div><p className="mb-1 text-[11px] text-ink-muted">Lifestyle</p><Chips items={p.lifestyles} /></div>
        <div><p className="mb-1 text-[11px] text-ink-muted">Intentions</p><Chips items={p.intentions} /></div>
      </div>
    </div>
  );
}
