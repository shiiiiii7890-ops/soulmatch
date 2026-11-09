// Draws a shareable "match card" poster on a canvas (runs in the admin's browser — nothing is uploaded).
// The poster deliberately shows no photo.
import { fmtFtIn } from "@/lib/height";
import type { Application } from "@/lib/types";

export const POSTER_W = 1080;
export const POSTER_H = 1350;

const SERIF = '"Playfair Display Variable", Georgia, serif';
const SANS = '"Plus Jakarta Sans Variable", "Helvetica Neue", Arial, sans-serif';
const C = { deep: "#2B0A15", wine: "#4A1224", rose: "#A3485E", roseLight: "#C87389", blush: "#FCEEF2", ivory: "#FAF6F0", muted: "#D6C1CA" };

type Ctx = CanvasRenderingContext2D;

async function loadFonts() {
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${SERIF}`),
      document.fonts.load(`600 30px ${SANS}`),
      document.fonts.load(`500 30px ${SANS}`),
      document.fonts.load(`700 30px ${SANS}`),
    ]);
  } catch {
    /* fall back to system fonts */
  }
}

function rrect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function heart(ctx: Ctx, cx: number, cy: number, size: number) {
  const s = size / 32;
  ctx.beginPath();
  ctx.moveTo(cx, cy + 12 * s);
  ctx.bezierCurveTo(cx - 20 * s, cy - 2 * s, cx - 12 * s, cy - 16 * s, cx, cy - 6 * s);
  ctx.bezierCurveTo(cx + 12 * s, cy - 16 * s, cx + 20 * s, cy - 2 * s, cx, cy + 12 * s);
  ctx.closePath();
}

function spaced(ctx: Ctx, px: number) {
  if ("letterSpacing" in ctx) (ctx as unknown as { letterSpacing: string }).letterSpacing = `${px}px`;
}

function fit(ctx: Ctx, text: string, maxW: number): string {
  if (ctx.measureText(text).width <= maxW) return text;
  let t = text;
  while (t.length > 1 && ctx.measureText(t + "…").width > maxW) t = t.slice(0, -1);
  return t.trimEnd() + "…";
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export async function renderPoster(person: Application, m: Application, index: number, total: number): Promise<Blob> {
  await loadFonts();
  const canvas = document.createElement("canvas");
  canvas.width = POSTER_W;
  canvas.height = POSTER_H;
  const ctx = canvas.getContext("2d")!;
  const W = POSTER_W;
  const first = person.full_name.split(" ")[0];

  // Background
  const bg = ctx.createLinearGradient(0, 0, 0, POSTER_H);
  bg.addColorStop(0, C.deep);
  bg.addColorStop(0.55, C.wine);
  bg.addColorStop(1, C.deep);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, POSTER_H);
  for (const [x, y, r, a] of [[930, 160, 460, 0.28], [90, 1180, 420, 0.2], [540, 560, 520, 0.12]] as const) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `rgba(200,115,137,${a})`);
    g.addColorStop(1, "rgba(200,115,137,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, POSTER_H);
  }
  // Soft floating hearts
  ctx.fillStyle = "rgba(255,200,215,0.10)";
  for (const [x, y, s] of [[110, 330, 44], [980, 420, 56], [80, 760, 34], [1000, 800, 40], [46, 1010, 50], [1034, 1090, 40], [230, 90, 28], [850, 70, 32]] as const) {
    heart(ctx, x, y, s);
    ctx.fill();
  }

  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";

  // Logo + tagline
  ctx.font = `700 66px ${SERIF}`;
  const soulW = ctx.measureText("Soul").width;
  const matchW = ctx.measureText("Match").width;
  const lx = W / 2 - (soulW + matchW) / 2;
  ctx.textAlign = "left";
  ctx.fillStyle = C.ivory;
  ctx.fillText("Soul", lx, 112);
  ctx.fillStyle = C.roseLight;
  ctx.font = `italic 700 66px ${SERIF}`;
  ctx.fillText("Match", lx + soulW, 112);
  ctx.textAlign = "center";
  ctx.font = `600 20px ${SANS}`;
  ctx.fillStyle = C.muted;
  spaced(ctx, 6);
  ctx.fillText("FIND YOUR PERSON.", W / 2 + 3, 152);
  spaced(ctx, 0);

  // Greeting + "match x of y" pill
  ctx.font = `600 32px ${SANS}`;
  ctx.fillStyle = C.blush;
  ctx.fillText(fit(ctx, `${first}, meet your match`, 900), W / 2, 222);
  const pill = `MATCH ${index + 1} OF ${total}`;
  ctx.font = `700 18px ${SANS}`;
  spaced(ctx, 3);
  const pw = ctx.measureText(pill).width + 44;
  ctx.fillStyle = "rgba(200,115,137,0.28)";
  rrect(ctx, W / 2 - pw / 2, 244, pw, 38, 19);
  ctx.fill();
  ctx.fillStyle = C.blush;
  ctx.fillText(pill, W / 2 + 1, 269);
  spaced(ctx, 0);

  // Photo
  const cx = W / 2, cy = 490, r = 170;
  const ring = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  ring.addColorStop(0, "#FF9DB8");
  ring.addColorStop(1, "#E5497F");
  ctx.beginPath();
  ctx.arc(cx, cy, r + 20, 0, Math.PI * 2);
  ctx.fillStyle = ring;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, r + 7, 0, Math.PI * 2);
  ctx.fillStyle = C.ivory;
  ctx.fill();
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.clip();
  // No photo on the poster: a monogram keeps it private and still personal.
  const mono = ctx.createLinearGradient(cx - r, cy - r, cx + r, cy + r);
  mono.addColorStop(0, "#B85572");
  mono.addColorStop(1, "#7A2C45");
  ctx.fillStyle = mono;
  ctx.fillRect(cx - r, cy - r, r * 2, r * 2);
  ctx.fillStyle = C.blush;
  ctx.font = `700 124px ${SERIF}`;
  ctx.textAlign = "center";
  ctx.fillText(initials(m.full_name), cx, cy + 44);
  ctx.restore();
  // Heart badge
  ctx.beginPath();
  ctx.arc(cx + 128, cy + 128, 42, 0, Math.PI * 2);
  ctx.fillStyle = "#E5497F";
  ctx.fill();
  ctx.lineWidth = 6;
  ctx.strokeStyle = C.ivory;
  ctx.stroke();
  ctx.fillStyle = "#FFFFFF";
  heart(ctx, cx + 128, cy + 130, 40);
  ctx.fill();

  // Name + basics
  ctx.textAlign = "center";
  let size = 68;
  ctx.font = `700 ${size}px ${SERIF}`;
  while (ctx.measureText(m.full_name).width > 900 && size > 36) {
    size -= 2;
    ctx.font = `700 ${size}px ${SERIF}`;
  }
  ctx.fillStyle = C.ivory;
  ctx.fillText(m.full_name, W / 2, 762);
  ctx.font = `500 30px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText([`${m.age} yrs`, fmtFtIn(m.height_cm)].join("   •   "), W / 2, 810);

  // Details panel
  const px = 90, py = 846, pwid = 900, ph = 272, pad = 28;
  ctx.fillStyle = "rgba(255,255,255,0.08)";
  rrect(ctx, px, py, pwid, ph, 28);
  ctx.fill();
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = "rgba(255,255,255,0.16)";
  ctx.stroke();
  ctx.textAlign = "left";
  const inner = pwid - pad * 2;
  const label = (t: string, x: number, y: number) => {
    ctx.font = `700 17px ${SANS}`;
    ctx.fillStyle = C.roseLight;
    spaced(ctx, 3);
    ctx.fillText(t, x, y);
    spaced(ctx, 0);
  };
  const value = (t: string, x: number, y: number, maxW: number) => {
    ctx.font = `600 28px ${SANS}`;
    ctx.fillStyle = "#FFFFFF";
    ctx.fillText(fit(ctx, t, maxW), x, y);
  };
  const x0 = px + pad;
  label("UNIVERSITY", x0, py + 42);
  value(`${m.college} · ${m.course}`, x0, py + 80, inner);
  const colW = inner / 2 - 10;
  label("HOMETOWN", x0, py + 128);
  value([m.hometown, m.share_religion && m.religion ? m.religion : ""].filter(Boolean).join(" · "), x0, py + 166, colW);
  label("DATING VIBE", x0 + inner / 2 + 10, py + 128);
  value(m.dating_vibe, x0 + inner / 2 + 10, py + 166, colW);

  // Quality chips (as many as fit on one line)
  ctx.font = `600 22px ${SANS}`;
  let cxp = x0;
  const chipY = py + 196;
  for (const q of m.qualities ?? []) {
    const w = ctx.measureText(q).width + 36;
    if (cxp + w > x0 + inner) break;
    ctx.fillStyle = "rgba(200,115,137,0.30)";
    rrect(ctx, cxp, chipY, w, 46, 23);
    ctx.fill();
    ctx.strokeStyle = "rgba(255,200,215,0.35)";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.fillStyle = C.blush;
    ctx.fillText(q, cxp + 18, chipY + 31);
    cxp += w + 12;
  }

  // Instagram call-to-action
  ctx.textAlign = "center";
  ctx.font = `700 18px ${SANS}`;
  ctx.fillStyle = C.muted;
  spaced(ctx, 4);
  ctx.fillText("SAY HI ON INSTAGRAM", W / 2 + 2, 1160);
  spaced(ctx, 0);
  const handle = "@" + m.instagram.replace(/^@/, "");
  ctx.font = `700 40px ${SANS}`;
  const hw = Math.min(ctx.measureText(handle).width + 100, 900);
  const pg = ctx.createLinearGradient(W / 2 - hw / 2, 0, W / 2 + hw / 2, 0);
  pg.addColorStop(0, "#F0638F");
  pg.addColorStop(1, "#E5497F");
  ctx.fillStyle = pg;
  rrect(ctx, W / 2 - hw / 2, 1180, hw, 72, 36);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.fillText(fit(ctx, handle, hw - 60), W / 2, 1229);

  // Footer
  ctx.font = `500 22px ${SANS}`;
  ctx.fillStyle = C.muted;
  ctx.fillText("Be yourself, start with a simple hello. Team SoulMatch", W / 2, 1296);
  ctx.font = `500 17px ${SANS}`;
  ctx.fillStyle = "rgba(214,193,202,0.65)";
  ctx.fillText("Shared only with you based on your consent. Please don't forward.", W / 2, 1326);

  return await new Promise<Blob>((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not create image"))), "image/png"));
}
