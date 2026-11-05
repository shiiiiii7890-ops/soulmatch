import { useRef, useState } from "react";
import { ImagePlus, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { apiUpload, errMsg } from "@/lib/api";
import type { UploadOut } from "@/lib/types";
import { cn } from "@/lib/utils";

const MAX = 5 * 1024 * 1024;
const TYPES = ["image/jpeg", "image/png", "image/webp"];

interface Props {
  endpoint: string; // e.g. "/public/upload?kind=photo"
  fileId: string | null;
  onUploaded: (fileId: string, previewUrl: string) => void;
  previewUrl?: string | null;
  label: string;
  hint?: string;
  testId: string;
  round?: boolean;
}

export function ImageUpload({ endpoint, fileId, onUploaded, previewUrl, label, hint, testId, round }: Props) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const pick = async (file: File | undefined) => {
    if (!file) return;
    if (!TYPES.includes(file.type)) return toast.error("Please choose a JPG, PNG or WEBP image");
    if (file.size > MAX) return toast.error("Image must be 5 MB or smaller");
    setBusy(true);
    try {
      const res = await apiUpload<UploadOut>(endpoint, file);
      onUploaded(res.file_id, URL.createObjectURL(file));
    } catch (e) {
      toast.error(errMsg(e, "Upload failed"));
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = "";
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        data-testid={`${testId}-button`}
        className={cn(
          "group relative flex shrink-0 items-center justify-center overflow-hidden border-2 border-dashed border-rose-light/60 bg-blush transition-[border-color,transform] duration-200 hover:border-wine active:scale-[0.98]",
          round ? "size-24 rounded-full" : "h-32 w-28 rounded-2xl",
        )}
      >
        {previewUrl ? (
          <img src={previewUrl} alt="Uploaded preview" className="absolute inset-0 size-full object-cover" data-testid={`${testId}-preview`} />
        ) : busy ? (
          <Loader2 className="size-6 animate-spin text-wine" />
        ) : (
          <ImagePlus className="size-6 text-wine" />
        )}
      </button>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-muted">{hint ?? "JPG, PNG or WEBP · max 5 MB"}</p>
        {fileId && (
          <button type="button" onClick={() => ref.current?.click()} className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-wine" data-testid={`${testId}-replace`}>
            <RefreshCw className="size-3" /> {previewUrl ? "Replace" : "Uploaded ✓ · Replace"}
          </button>
        )}
      </div>
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => pick(e.target.files?.[0])} data-testid={`${testId}-input`} />
    </div>
  );
}
