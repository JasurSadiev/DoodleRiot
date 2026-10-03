import type { Stroke } from "@/lib/types";

export const LOGICAL_W = 1000;
export const LOGICAL_H = 625;

export function strokePoints(strokes: Stroke[]): number {
  let n = 0;
  for (const s of strokes) n += s.p.length / 2;
  return n;
}

/** Cheap signature so canvases skip redraws when nothing actually changed. */
export function strokeSignature(strokes: Stroke[]): string {
  let sig = `${strokes.length}`;
  for (const s of strokes) sig += `|${s.c}${s.w}${s.p.length}${s.e ? "e" : ""}`;
  return sig;
}

function drawPath(ctx: CanvasRenderingContext2D, s: Stroke, count: number) {
  ctx.globalCompositeOperation = s.e ? "destination-out" : "source-over";
  ctx.strokeStyle = s.c;
  ctx.fillStyle = s.c;
  ctx.lineWidth = s.w;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  const n = Math.max(1, Math.min(count, Math.floor(s.p.length / 2))) * 2;
  if (n <= 2) {
    ctx.beginPath();
    ctx.arc(s.p[0] ?? 0, s.p[1] ?? 0, Math.max(0.6, s.w / 2), 0, Math.PI * 2);
    ctx.fill();
    return;
  }

  ctx.beginPath();
  ctx.moveTo(s.p[0], s.p[1]);
  if (n === 4) {
    ctx.lineTo(s.p[2], s.p[3]);
  } else {
    for (let i = 2; i < n - 2; i += 2) {
      const cx = (s.p[i] + s.p[i + 2]) / 2;
      const cy = (s.p[i + 1] + s.p[i + 3]) / 2;
      ctx.quadraticCurveTo(s.p[i], s.p[i + 1], cx, cy);
    }
    ctx.lineTo(s.p[n - 2], s.p[n - 1]);
  }
  ctx.stroke();
}

export function renderStrokes(
  ctx: CanvasRenderingContext2D,
  strokes: Stroke[],
  pointBudget: number = Number.POSITIVE_INFINITY,
  clear = true,
) {
  if (clear) {
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, LOGICAL_W, LOGICAL_H);
  }
  let budget = pointBudget;
  for (const s of strokes) {
    if (budget <= 0) break;
    const available = Math.floor(s.p.length / 2);
    const take = Math.min(budget, available);
    if (take <= 0) continue;
    drawPath(ctx, s, take);
    budget -= take;
  }
  ctx.globalCompositeOperation = "source-over";
}
