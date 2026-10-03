"use client";

import { useEffect, useRef } from "react";
import type { Stroke } from "@/lib/types";
import { LOGICAL_H, LOGICAL_W, renderStrokes, strokePoints, strokeSignature } from "@/lib/sketch";

type Props = {
  strokes: Stroke[];
  className?: string;
  /** Replay the drawing stroke-by-stroke. */
  animate?: boolean;
  /** Replay duration in ms. */
  duration?: number;
  quality?: number;
};

export function DrawingView({ strokes, className, animate = false, duration = 1600, quality = 1 }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sig = strokeSignature(strokes);
  const lastSig = useRef<string>("");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    if (lastSig.current === sig && !animate) return;
    lastSig.current = sig;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(quality, 0, 0, quality, 0, 0);

    if (!animate) {
      renderStrokes(ctx, strokes);
      return;
    }

    const total = Math.max(1, strokePoints(strokes));
    const startedAt = performance.now();
    let raf = 0;
    const step = (now: number) => {
      const t = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - t, 1.6);
      renderStrokes(ctx, strokes, Math.ceil(total * eased));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sig, animate, duration]);

  return (
    <canvas
      ref={canvasRef}
      width={LOGICAL_W * quality}
      height={LOGICAL_H * quality}
      style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}` }}
      className={className}
      aria-label="A player's drawing"
      role="img"
    />
  );
}
