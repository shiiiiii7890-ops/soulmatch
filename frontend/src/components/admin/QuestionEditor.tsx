import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, RotateCcw, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiDelete, apiGet, apiPut, errMsg } from "@/lib/api";
import type { QuestionKey } from "@/lib/options";
import type { Questions } from "@/lib/types";

const META: { key: QuestionKey; name: string; multi: boolean }[] = [
  { key: "personality", name: "Personality (pick one)", multi: false },
  { key: "qualities", name: "Qualities (pick many)", multi: true },
  { key: "vibe", name: "Dating vibe (pick one)", multi: false },
  { key: "lifestyle", name: "Lifestyle (pick many)", multi: true },
  { key: "intention", name: "Relationship type (pick one)", multi: false },
];

function OptionEditor({ options, onChange, testId }: { options: string[]; onChange: (o: string[]) => void; testId: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (!v) return;
    if (v.length > 40) return void toast.error("Options can be at most 40 characters");
    if (options.some((o) => o.toLowerCase() === v.toLowerCase())) return void toast.error("That option already exists");
    onChange([...options, v]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2" data-testid={`${testId}-options`}>
        {options.map((o) => (
          <span key={o} className="inline-flex items-center gap-1 rounded-full border border-sand bg-blush px-3 py-1 text-sm text-ink">
            {o}
            <button type="button" aria-label={`Remove ${o}`} onClick={() => onChange(options.filter((x) => x !== o))} className="rounded-full p-0.5 text-ink-muted hover:bg-white hover:text-bad">
              <X className="size-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="flex gap-2">
        <Input
          value={draft} placeholder="Add an option…" className="h-10 max-w-xs" data-testid={`${testId}-new`}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
        />
        <Button type="button" variant="outline" className="h-10 rounded-full" onClick={add} data-testid={`${testId}-add`}><Plus className="size-4" /> Add</Button>
      </div>
    </div>
  );
}

export function QuestionEditor() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["admin-questions"], queryFn: () => apiGet<Questions>("/admin/questions") });
  const [f, setF] = useState<Questions | null>(null);

  useEffect(() => { if (q.data) setF(q.data); }, [q.data]);

  const done = (r: Questions, msg: string) => {
    setF(r);
    qc.setQueryData(["admin-questions"], r);
    qc.invalidateQueries({ queryKey: ["public-form"] });
    toast.success(msg);
  };
  const save = useMutation({
    mutationFn: (body: Questions) => apiPut<Questions>("/admin/questions", body),
    onSuccess: (r) => done(r, "Questions saved — the live form is updated"),
    onError: (e) => toast.error(errMsg(e)),
  });
  const reset = useMutation({
    mutationFn: () => apiDelete<Questions>("/admin/questions"),
    onSuccess: (r) => done(r, "Questions reset to defaults"),
    onError: (e) => toast.error(errMsg(e)),
  });

  const patch = (k: QuestionKey, v: Partial<Questions[QuestionKey]>) => setF((p) => (p ? { ...p, [k]: { ...p[k], ...v } } : p));
  const dirty = !!f && !!q.data && JSON.stringify(f) !== JSON.stringify(q.data);

  return (
    <div className="space-y-5 rounded-2xl border border-sand bg-white p-6" data-testid="question-editor">
      <div>
        <p className="font-semibold text-ink">Form questions</p>
        <p className="mt-1 text-sm text-ink-muted">
          Change the question wording and the answer options people can choose. Changes go live on the registration form as soon as you save.
          The same options are used for "ideal partner" preferences. People who already applied keep their original answers.
        </p>
      </div>
      {!f ? (
        <div className="flex justify-center py-6"><Loader2 className="size-5 animate-spin text-wine" /></div>
      ) : (
        <>
          {META.map(({ key, name }) => (
            <div key={key} className="space-y-3 rounded-xl border border-sand p-4" data-testid={`qe-${key}`}>
              <p className="overline text-rose">{name}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor={`qe-${key}-title`}>Question</Label>
                  <Input id={`qe-${key}-title`} className="h-10" maxLength={80} value={f[key].title} onChange={(e) => patch(key, { title: e.target.value })} data-testid={`qe-${key}-title`} />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor={`qe-${key}-hint`}>Helper text <span className="font-normal text-ink-muted">(optional)</span></Label>
                  <Input id={`qe-${key}-hint`} className="h-10" maxLength={140} value={f[key].hint} onChange={(e) => patch(key, { hint: e.target.value })} data-testid={`qe-${key}-hint`} />
                </div>
              </div>
              <OptionEditor options={f[key].options} onChange={(o) => patch(key, { options: o })} testId={`qe-${key}`} />
            </div>
          ))}
          <div className="flex flex-wrap gap-3">
            <Button className="rounded-full" disabled={!dirty || save.isPending} onClick={() => save.mutate(f)} data-testid="qe-save">
              {save.isPending && <Loader2 className="size-4 animate-spin" />} Save questions
            </Button>
            <Button variant="ghost" className="rounded-full" disabled={reset.isPending} onClick={() => { if (window.confirm("Reset all question wording and options to the defaults?")) reset.mutate(); }} data-testid="qe-reset">
              <RotateCcw className="size-4" /> Reset to defaults
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
