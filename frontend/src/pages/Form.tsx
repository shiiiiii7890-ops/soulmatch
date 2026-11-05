import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, ArrowRight, CheckCircle2, Copy, Info, Loader2, Lock, Pencil, QrCode } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Logo } from "@/components/Logo";
import { ChipGroup } from "@/components/common";
import { ImageUpload } from "@/components/ImageUpload";
import { SimpleSelect, toOpts } from "@/components/SimpleSelect";
import { apiPost, errMsg } from "@/lib/api";
import { copyText, usePublicForm } from "@/lib/hooks";
import { DATING_VIBES, GENDERS, INTENTIONS, LIFESTYLES, PERSONALITIES, QUALITIES, inr } from "@/lib/options";
import type { ApplicationCreated, ApplicationIn, Gender, Personality, Preferences } from "@/lib/types";
import { cn } from "@/lib/utils";

interface Draft {
  full_name: string; age: string; gender: string; height_cm: string; mobile: string; email: string;
  photo_id: string | null; college: string; course: string; city: string; hometown: string; instagram: string;
  religion: string; share_religion: boolean;
  personality: string; qualities: string[]; dating_vibe: string; lifestyle: string[]; intention: string;
  preferences: Preferences;
  utr: string; screenshot_id: string | null;
  c1: boolean; c2: boolean; c3: boolean;
}

const EMPTY: Draft = {
  full_name: "", age: "", gender: "", height_cm: "", mobile: "", email: "", photo_id: null, college: "", course: "",
  city: "", hometown: "", instagram: "", religion: "", share_religion: false,
  personality: "", qualities: [], dating_vibe: "", lifestyle: [], intention: "",
  preferences: {
    surprise_me: false, genders: [], age_min: 18, age_max: 30, height_min: 150, height_max: 195, personalities: [],
    qualities: [], vibes: [], lifestyles: [], intentions: [], college: "", location: "",
  },
  utr: "", screenshot_id: null,
  c1: false, c2: false, c3: false,
};
const KEY = "soulmatch-draft-v1";
const STEPS = ["Basic details", "About you", "Ideal partner", "Payment", "Review"];
const TITLES = ["Let's start with you.", "Describe yourself.", "Your ideal partner.", "Registration payment.", "Review & submit."];
const AGES = Array.from({ length: 23 }, (_, i) => String(18 + i));
const HEIGHTS = Array.from({ length: 15 }, (_, i) => String(140 + i * 5));
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MOBILE_RE = /^(\+?91)?[6-9]\d{9}$/;

type Errors = Record<string, string>;

function validate(step: number, d: Draft): Errors {
  const e: Errors = {};
  if (step === 0) {
    if (d.full_name.trim().length < 2) e.full_name = "Enter your full name";
    const age = Number(d.age);
    if (!d.age || Number.isNaN(age)) e.age = "Enter your age";
    else if (age < 18) e.age = "You must be 18 or older to join";
    else if (age > 99) e.age = "Enter a valid age";
    if (!d.gender) e.gender = "Select your gender";
    const h = Number(d.height_cm);
    if (!h || h < 120 || h > 230) e.height_cm = "Height in cm (120–230)";
    if (!MOBILE_RE.test(d.mobile.replace(/[\s-]/g, ""))) e.mobile = "Enter a valid 10-digit mobile number";
    if (!EMAIL_RE.test(d.email.trim())) e.email = "Enter a valid email address";
    if (!d.photo_id) e.photo_id = "Upload a profile photo";
    for (const k of ["college", "course", "city", "hometown"] as const) if (!d[k].trim()) e[k] = "Required";
    if (!/^@?[A-Za-z0-9._]{1,30}$/.test(d.instagram.trim())) e.instagram = "Enter a valid Instagram username";
  }
  if (step === 1) {
    if (!d.personality) e.personality = "Pick one";
    if (!d.qualities.length) e.qualities = "Pick at least one quality";
    if (!d.dating_vibe) e.dating_vibe = "Pick your vibe";
    if (!d.lifestyle.length) e.lifestyle = "Pick at least one";
    if (!d.intention) e.intention = "Pick one";
  }
  if (step === 2) {
    const p = d.preferences;
    if (!p.surprise_me && !p.genders.length) e.genders = "Choose a preferred gender, or pick 'surprise me'";
    if (p.age_min > p.age_max) e.age_range = "Minimum age can't be above maximum";
    if (p.height_min > p.height_max) e.height_range = "Minimum height can't be above maximum";
  }
  if (step === 3) {
    if (!d.screenshot_id) e.screenshot_id = "Upload your payment screenshot";
    if (!/^[A-Za-z0-9]{6,30}$/.test(d.utr.trim())) e.utr = "Enter the UTR / transaction reference (6–30 letters or digits)";
  }
  if (step === 4 && !(d.c1 && d.c2 && d.c3)) e.consent = "Please confirm all three to continue";
  return e;
}

function Field({ label, error, children, id, optional }: { label: string; error?: string; children: React.ReactNode; id: string; optional?: boolean }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-sm font-semibold text-ink">
        {label} {optional && <span className="font-normal text-ink-muted">(optional)</span>}
      </Label>
      {children}
      {error && <p className="text-xs font-medium text-bad" data-testid={`error-${id}`}>{error}</p>}
    </div>
  );
}

function Section({ title, hint, error, children, testId }: { title: string; hint?: string; error?: string; children: React.ReactNode; testId?: string }) {
  return (
    <div className="space-y-3" data-testid={testId}>
      <div>
        <h3 className="font-sans text-base font-semibold text-ink">{title}</h3>
        {hint && <p className="text-xs text-ink-muted">{hint}</p>}
      </div>
      {children}
      {error && <p className="text-xs font-medium text-bad">{error}</p>}
    </div>
  );
}

function ReviewBlock({ title, rows, onEdit, testId }: { title: string; rows: [string, string][]; onEdit: () => void; testId: string }) {
  return (
    <div className="rounded-2xl border border-sand bg-white p-5" data-testid={testId}>
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-display text-lg text-wine-deep">{title}</h3>
        <button type="button" onClick={onEdit} className="inline-flex items-center gap-1 text-xs font-semibold text-wine" data-testid={`${testId}-edit`}>
          <Pencil className="size-3" /> Edit
        </button>
      </div>
      <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        {rows.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="text-xs text-ink-muted">{k}</dt>
            <dd className="font-medium text-ink">{v || "—"}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

export default function Register() {
  const { data: cfg, isLoading } = usePublicForm();
  const [done, setDone] = useState<string | null>(null);
  const [shotUrl, setShotUrl] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState<Errors>({});
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [d, setD] = useState<Draft>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      return raw ? { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>), utr: "", screenshot_id: null, c1: false, c2: false, c3: false } : EMPTY;
    } catch {
      return EMPTY;
    }
  });

  useEffect(() => {
    localStorage.setItem(KEY, JSON.stringify(d));
  }, [d]);

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }));
  const setPref = <K extends keyof Preferences>(k: K, v: Preferences[K]) => setD((p) => ({ ...p, preferences: { ...p.preferences, [k]: v } }));

  const submit = useMutation({
    mutationFn: (body: ApplicationIn) => apiPost<ApplicationCreated>("/applications", body),
    onSuccess: (res) => {
      localStorage.removeItem(KEY);
      setDone(res.app_code);
      window.scrollTo({ top: 0 });
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  const go = (to: number) => {
    setErrors({});
    setStep(to);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const next = () => {
    const e = validate(step, d);
    setErrors(e);
    if (Object.keys(e).length) {
      toast.error("Please fix the highlighted fields");
      return;
    }
    if (step < 4) return go(step + 1);
    submit.mutate({
      utr: d.utr.trim().toUpperCase(), screenshot_id: d.screenshot_id ?? "", full_name: d.full_name.trim(), age: Number(d.age), gender: d.gender as Gender,
      height_cm: Number(d.height_cm), mobile: d.mobile.trim(), email: d.email.trim(), photo_id: d.photo_id ?? "",
      college: d.college.trim(), course: d.course.trim(), city: d.city.trim(), hometown: d.hometown.trim(),
      instagram: d.instagram.trim(), religion: d.religion.trim(), share_religion: d.share_religion && !!d.religion.trim(),
      personality: d.personality as Personality, qualities: d.qualities, dating_vibe: d.dating_vibe,
      lifestyle: d.lifestyle, intention: d.intention, preferences: d.preferences,
      consent_accurate: true, consent_matchmaking: true, consent_share_contact: true,
    });
  };

  const p = d.preferences;
  const closed = !isLoading && !cfg?.open;
  const fee = cfg?.fee ?? 0;

  return (
    <div className="min-h-screen bg-ivory pb-28">
      <header className="sticky top-0 z-30 border-b border-sand bg-ivory/90 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-5">
          <Logo />
          <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted"><Lock className="size-3.5" /> Private & secure</span>
        </div>
        {!closed && !done && (
          <div className="mx-auto max-w-3xl px-5 pb-4" data-testid="register-progress">
            <div className="flex gap-2">
              {STEPS.map((s, i) => (
                <div key={s} className="flex-1">
                  <div className={cn("h-1.5 rounded-full transition-[background-color] duration-300", i <= step ? "bg-wine" : "bg-sand")} />
                  <p className={cn("mt-1.5 hidden text-[11px] sm:block", i === step ? "font-semibold text-wine" : "text-ink-muted")}>{i + 1}. {s}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-ink-muted sm:hidden" data-testid="register-step-label">Step {step + 1} of 5 · {STEPS[step]}</p>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-3xl px-5 pt-8">
        {isLoading ? (
          <div className="flex justify-center py-24"><Loader2 className="size-6 animate-spin text-wine" /></div>
        ) : done ? (
          <div className="animate-fade-up rounded-[2rem] bg-wine-deep p-8 text-center text-ivory sm:p-12" data-testid="register-done">
            <CheckCircle2 className="mx-auto size-10 text-rose-light" />
            <h1 className="mt-4 text-3xl tracking-tight sm:text-4xl">You're officially in! Your SoulMatch journey starts now.</h1>
            <p className="mt-4 text-[#D6C1CA]">Your application ID</p>
            <p className="mt-1 font-mono text-2xl font-semibold" data-testid="register-done-app-code">{done}</p>
            <p className="mx-auto mt-5 max-w-md text-sm text-[#D6C1CA]">Payment status: <span className="font-semibold text-ivory" data-testid="register-done-payment-status">Pending verification</span>. Our team will verify your payment manually and email your matches once results are out.</p>
            <p className="mx-auto mt-4 max-w-md text-xs text-[#C2AAB4]">We don't keep your data after this round's results are declared — if you join the next round, you'll need to fill in your details again.</p>
          </div>
        ) : closed ? (
          <div className="mt-10 rounded-[2rem] bg-wine-deep p-10 text-center text-ivory" data-testid="register-closed">
            <Lock className="mx-auto size-8 text-rose-light" />
            <h1 className="mt-4 text-3xl tracking-tight">Registrations Are Currently Closed ❤️</h1>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <p className="overline text-rose">SoulMatch registration · {inr(fee)}</p>
              <h1 className="mt-2 text-3xl tracking-tight text-wine-deep sm:text-4xl">{TITLES[step]}</h1>
            </div>
            {step === 0 && (
              <p className="mb-6 flex gap-2 rounded-2xl bg-blush p-4 text-sm text-plum-muted" data-testid="register-data-notice">
                <Info className="mt-0.5 size-4 shrink-0" /> We don't keep your data after a round's results are declared. If you take part in the next round, you'll need to fill in your details again.
              </p>
            )}
            <AnimatePresence mode="wait">
              <motion.div key={step} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
                {step === 0 && (
                  <div className="space-y-6 rounded-[1.75rem] border border-sand bg-white p-5 sm:p-8" data-testid="register-step-1">
                    <ImageUpload
                      endpoint="/public/upload?kind=photo" fileId={d.photo_id} previewUrl={photoUrl} round testId="photo-upload"
                      label="Profile photograph" hint="A clear, recent photo of just you · JPG/PNG/WEBP · max 5 MB"
                      onUploaded={(id, url) => { set("photo_id", id); setPhotoUrl(url); }}
                    />
                    {errors.photo_id && <p className="-mt-3 text-xs font-medium text-bad" data-testid="error-photo_id">{errors.photo_id}</p>}
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Full name" id="full_name" error={errors.full_name}>
                        <Input id="full_name" className="h-11 bg-white" value={d.full_name} onChange={(e) => set("full_name", e.target.value)} data-testid="input-full-name" />
                      </Field>
                      <div className="grid grid-cols-2 gap-3">
                        <Field label="Age" id="age" error={errors.age}>
                          <Input id="age" inputMode="numeric" className="h-11 bg-white" value={d.age} onChange={(e) => set("age", e.target.value.replace(/\D/g, "").slice(0, 2))} data-testid="input-age" />
                        </Field>
                        <Field label="Height (cm)" id="height_cm" error={errors.height_cm}>
                          <Input id="height_cm" inputMode="numeric" placeholder="e.g. 168" className="h-11 bg-white" value={d.height_cm} onChange={(e) => set("height_cm", e.target.value.replace(/\D/g, "").slice(0, 3))} data-testid="input-height" />
                        </Field>
                      </div>
                      <Field label="Gender" id="gender" error={errors.gender}>
                        <ChipGroup options={GENDERS} value={d.gender ? [d.gender as Gender] : []} onChange={(v) => set("gender", v[0] ?? "")} multiple={false} testId="chips-gender" />
                      </Field>
                      <Field label="Mobile number" id="mobile" error={errors.mobile}>
                        <Input id="mobile" inputMode="tel" placeholder="98XXXXXXXX" className="h-11 bg-white" value={d.mobile} onChange={(e) => set("mobile", e.target.value.slice(0, 14))} data-testid="input-mobile" />
                      </Field>
                      <Field label="Email address" id="email" error={errors.email}>
                        <Input id="email" type="email" className="h-11 bg-white" value={d.email} onChange={(e) => set("email", e.target.value)} data-testid="input-email" />
                      </Field>
                      <Field label="Instagram username" id="instagram" error={errors.instagram}>
                        <Input id="instagram" placeholder="@yourhandle" className="h-11 bg-white" value={d.instagram} onChange={(e) => set("instagram", e.target.value)} data-testid="input-instagram" />
                      </Field>
                      <Field label="College / University" id="college" error={errors.college}>
                        <Input id="college" className="h-11 bg-white" value={d.college} onChange={(e) => set("college", e.target.value)} data-testid="input-college" />
                      </Field>
                      <Field label="Course / Branch" id="course" error={errors.course}>
                        <Input id="course" className="h-11 bg-white" value={d.course} onChange={(e) => set("course", e.target.value)} data-testid="input-course" />
                      </Field>
                      <Field label="Current city" id="city" error={errors.city}>
                        <Input id="city" className="h-11 bg-white" value={d.city} onChange={(e) => set("city", e.target.value)} data-testid="input-city" />
                      </Field>
                      <Field label="Hometown / State" id="hometown" error={errors.hometown}>
                        <Input id="hometown" className="h-11 bg-white" value={d.hometown} onChange={(e) => set("hometown", e.target.value)} data-testid="input-hometown" />
                      </Field>
                      <Field label="Religion" id="religion" optional>
                        <Input id="religion" className="h-11 bg-white" value={d.religion} onChange={(e) => set("religion", e.target.value)} data-testid="input-religion" />
                      </Field>
                      <label className="flex items-start gap-3 self-end rounded-xl bg-blush px-4 py-3 text-sm text-ink">
                        <Checkbox checked={d.share_religion} onCheckedChange={(v) => set("share_religion", !!v)} disabled={!d.religion.trim()} data-testid="checkbox-share-religion" />
                        Share my religion with my matches
                      </label>
                    </div>
                  </div>
                )}

                {step === 1 && (
                  <div className="space-y-8 rounded-[1.75rem] border border-sand bg-white p-5 sm:p-8" data-testid="register-step-2">
                    <Section title="Personality" error={errors.personality}>
                      <ChipGroup options={PERSONALITIES} value={d.personality ? [d.personality as Personality] : []} onChange={(v) => set("personality", v[0] ?? "")} multiple={false} testId="chips-personality" />
                    </Section>
                    <Section title="Choose your qualities" hint="Pick as many as feel like you" error={errors.qualities}>
                      <ChipGroup options={QUALITIES} value={d.qualities} onChange={(v) => set("qualities", v)} testId="chips-qualities" />
                    </Section>
                    <Section title="Dating vibe" error={errors.dating_vibe}>
                      <ChipGroup options={DATING_VIBES} value={d.dating_vibe ? [d.dating_vibe] : []} onChange={(v) => set("dating_vibe", v[0] ?? "")} multiple={false} testId="chips-vibe" />
                    </Section>
                    <Section title="Lifestyle" hint="Select all that apply" error={errors.lifestyle}>
                      <ChipGroup options={LIFESTYLES} value={d.lifestyle} onChange={(v) => set("lifestyle", v)} testId="chips-lifestyle" />
                    </Section>
                    <Section title="Relationship intention" error={errors.intention}>
                      <ChipGroup options={INTENTIONS} value={d.intention ? [d.intention] : []} onChange={(v) => set("intention", v[0] ?? "")} multiple={false} testId="chips-intention" />
                    </Section>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-8 rounded-[1.75rem] border border-sand bg-white p-5 sm:p-8" data-testid="register-step-3">
                    <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border px-5 py-4 transition-colors", p.surprise_me ? "border-wine bg-blush" : "border-sand")}>
                      <Checkbox checked={p.surprise_me} onCheckedChange={(v) => setPref("surprise_me", !!v)} data-testid="checkbox-surprise-me" />
                      <span>
                        <span className="block font-semibold text-ink">No strict preferences — surprise me!</span>
                        <span className="text-xs text-ink-muted">You can still pick a few below as gentle hints.</span>
                      </span>
                    </label>
                    <Section title="Preferred gender" hint="Select one or more" error={errors.genders}>
                      <ChipGroup options={GENDERS} value={p.genders} onChange={(v) => setPref("genders", v)} testId="chips-pref-gender" />
                    </Section>
                    <div className="grid gap-6 sm:grid-cols-2">
                      <Section title="Preferred age range" error={errors.age_range}>
                        <div className="flex items-center gap-2">
                          <SimpleSelect value={String(p.age_min)} onChange={(v) => setPref("age_min", Number(v))} options={toOpts(AGES)} testId="select-pref-age-min" />
                          <span className="text-ink-muted">to</span>
                          <SimpleSelect value={String(p.age_max)} onChange={(v) => setPref("age_max", Number(v))} options={toOpts(AGES)} testId="select-pref-age-max" />
                        </div>
                      </Section>
                      <Section title="Preferred height range (cm)" error={errors.height_range}>
                        <div className="flex items-center gap-2">
                          <SimpleSelect value={String(p.height_min)} onChange={(v) => setPref("height_min", Number(v))} options={toOpts(HEIGHTS)} testId="select-pref-height-min" />
                          <span className="text-ink-muted">to</span>
                          <SimpleSelect value={String(p.height_max)} onChange={(v) => setPref("height_max", Number(v))} options={toOpts(HEIGHTS)} testId="select-pref-height-max" />
                        </div>
                      </Section>
                    </div>
                    <Section title="Preferred personality traits" hint="Personality type and qualities you're drawn to">
                      <ChipGroup options={PERSONALITIES} value={p.personalities} onChange={(v) => setPref("personalities", v)} testId="chips-pref-personality" />
                      <ChipGroup options={QUALITIES} value={p.qualities} onChange={(v) => setPref("qualities", v)} testId="chips-pref-qualities" />
                    </Section>
                    <Section title="Preferred dating vibe">
                      <ChipGroup options={DATING_VIBES} value={p.vibes} onChange={(v) => setPref("vibes", v)} testId="chips-pref-vibe" />
                    </Section>
                    <Section title="Preferred lifestyle">
                      <ChipGroup options={LIFESTYLES} value={p.lifestyles} onChange={(v) => setPref("lifestyles", v)} testId="chips-pref-lifestyle" />
                    </Section>
                    <Section title="Preferred relationship intentions">
                      <ChipGroup options={INTENTIONS} value={p.intentions} onChange={(v) => setPref("intentions", v)} testId="chips-pref-intention" />
                    </Section>
                    <div className="grid gap-5 sm:grid-cols-2">
                      <Field label="Preferred college / university" id="pref_college" optional>
                        <Input id="pref_college" className="h-11 bg-white" value={p.college} onChange={(e) => setPref("college", e.target.value)} data-testid="input-pref-college" />
                      </Field>
                      <Field label="Preferred location" id="pref_location" optional>
                        <Input id="pref_location" className="h-11 bg-white" value={p.location} onChange={(e) => setPref("location", e.target.value)} data-testid="input-pref-location" />
                      </Field>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="grid gap-5 md:grid-cols-[1fr_1.1fr]" data-testid="register-step-payment">
                    <div className="rounded-[1.75rem] bg-wine-deep p-6 text-ivory" data-testid="payment-qr-card">
                      <div className="flex items-baseline justify-between">
                        <span className="text-sm text-[#D6C1CA]">Registration fee</span>
                        <span className="font-display text-4xl" data-testid="payment-fee">{inr(fee)}</span>
                      </div>
                      <div className="mt-5 flex aspect-square items-center justify-center overflow-hidden rounded-2xl bg-white p-3">
                        {cfg?.has_qr ? (
                          <img src="/api/public/qr" alt="UPI QR code" className="size-full object-contain" data-testid="payment-qr-image" />
                        ) : (
                          <div className="text-center text-ink-muted" data-testid="payment-qr-missing"><QrCode className="mx-auto size-10 text-rose-light" /><p className="mt-2 text-xs">Pay using the UPI ID below</p></div>
                        )}
                      </div>
                      {cfg?.upi_id && (
                        <div className="mt-5 rounded-xl bg-white/10 p-3">
                          <p className="text-xs text-[#D6C1CA]">UPI ID {cfg.payee_name && `· ${cfg.payee_name}`}</p>
                          <div className="mt-1 flex items-center justify-between gap-2">
                            <span className="truncate font-mono text-sm" data-testid="payment-upi-id">{cfg.upi_id}</span>
                            <button type="button" onClick={() => copyText(cfg.upi_id).then(() => toast.success("UPI ID copied"))} className="inline-flex items-center gap-1 rounded-full bg-ivory px-3 py-1.5 text-xs font-semibold text-wine-deep transition-transform active:scale-95" data-testid="payment-copy-upi-button">
                              <Copy className="size-3" /> Copy
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                    <div className="space-y-5 rounded-[1.75rem] border border-sand bg-white p-6" data-testid="payment-proof-card">
                      <h2 className="font-display text-xl text-wine-deep">Upload payment proof</h2>
                      <ImageUpload
                        endpoint="/public/upload?kind=payment" fileId={d.screenshot_id} previewUrl={shotUrl} testId="payment-screenshot"
                        label="Payment screenshot" hint="Must show amount, date and UTR · max 5 MB"
                        onUploaded={(id, url) => { set("screenshot_id", id); setShotUrl(url); }}
                      />
                      {errors.screenshot_id && <p className="-mt-2 text-xs font-medium text-bad" data-testid="error-screenshot_id">{errors.screenshot_id}</p>}
                      <Field label="UTR / transaction reference" id="utr" error={errors.utr}>
                        <Input id="utr" className="h-11 font-mono uppercase" placeholder="12-digit UTR number" value={d.utr} onChange={(e) => set("utr", e.target.value.replace(/\s/g, ""))} data-testid="payment-utr-input" />
                      </Field>
                      <p className="text-xs leading-relaxed text-ink-muted">Uploading proof doesn't confirm payment — our team verifies every transaction manually.</p>
                    </div>
                  </div>
                )}

                {step === 4 && (
                  <div className="space-y-4" data-testid="register-step-4">
                    <ReviewBlock title="Basic details" testId="review-basic" onEdit={() => go(0)} rows={[
                      ["Name", d.full_name], ["Age", d.age], ["Gender", d.gender], ["Height", d.height_cm ? `${d.height_cm} cm` : ""],
                      ["Mobile", d.mobile], ["Email", d.email], ["College", d.college], ["Course", d.course], ["City", d.city],
                      ["Hometown", d.hometown], ["Instagram", d.instagram ? "@" + d.instagram.replace(/^@/, "") : ""],
                      ["Religion", d.religion ? `${d.religion}${d.share_religion ? " (shared with matches)" : " (private)"}` : ""],
                      ["Photo", d.photo_id ? "Uploaded ✓" : ""],
                    ]} />
                    <ReviewBlock title="Payment" testId="review-payment" onEdit={() => go(3)} rows={[
                      ["Fee", inr(fee)], ["UTR", d.utr.toUpperCase()], ["Screenshot", d.screenshot_id ? "Uploaded ✓" : ""],
                    ]} />
                    <ReviewBlock title="About you" testId="review-about" onEdit={() => go(1)} rows={[
                      ["Personality", d.personality], ["Dating vibe", d.dating_vibe], ["Qualities", d.qualities.join(", ")],
                      ["Lifestyle", d.lifestyle.join(", ")], ["Intention", d.intention],
                    ]} />
                    <ReviewBlock title="Ideal partner" testId="review-partner" onEdit={() => go(2)} rows={[
                      ["Surprise me", p.surprise_me ? "Yes" : "No"], ["Gender", p.genders.join(", ")],
                      ["Age range", `${p.age_min}–${p.age_max}`], ["Height range", `${p.height_min}–${p.height_max} cm`],
                      ["Personality", p.personalities.join(", ")], ["Qualities", p.qualities.join(", ")],
                      ["Dating vibe", p.vibes.join(", ")], ["Lifestyle", p.lifestyles.join(", ")],
                      ["Intentions", p.intentions.join(", ")], ["College", p.college], ["Location", p.location],
                    ]} />
                    <div className="space-y-3 rounded-2xl border border-sand bg-blush p-5" data-testid="consent-block">
                      {([
                        ["c1", "I confirm the information I've provided is accurate."],
                        ["c2", "I consent to SoulMatch using my information for matchmaking."],
                        ["c3", "I understand my name, profile details and Instagram username may be shared with my assigned matches only. My email and phone number are never shared with matches."],
                      ] as const).map(([k, t]) => (
                        <label key={k} className="flex cursor-pointer items-start gap-3 text-sm text-ink">
                          <Checkbox checked={d[k]} onCheckedChange={(v) => set(k, !!v)} className="mt-0.5" data-testid={`consent-${k}`} />
                          {t}
                        </label>
                      ))}
                      {errors.consent && <p className="text-xs font-medium text-bad" data-testid="error-consent">{errors.consent}</p>}
                      <p className="pt-1 text-xs text-ink-muted">All entries are permanently deleted once this round's results are declared.</p>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </main>

      {!closed && !isLoading && !done && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-sand bg-ivory/95 backdrop-blur-xl">
          <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-5 py-3">
            <Button variant="ghost" className="h-12 rounded-full px-5" disabled={step === 0} onClick={() => go(step - 1)} data-testid="register-back-button">
              <ArrowLeft className="size-4" /> Back
            </Button>
            <Button className="h-12 flex-1 rounded-full px-6 sm:flex-none" onClick={next} disabled={submit.isPending} data-testid={step === 4 ? "register-submit-button" : "register-next-button"}>
              {submit.isPending ? <Loader2 className="size-4 animate-spin" /> : null}
              {step === 4 ? "Submit form" : "Continue"} {!submit.isPending && <ArrowRight className="size-4" />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
