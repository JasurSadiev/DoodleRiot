"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { Stroke } from "@/lib/types";
import { LOGICAL_H, LOGICAL_W, renderStrokes } from "@/lib/sketch";

const PENS = [
  { id: "#17130f", name: "Ink" },
  { id: "#ff4b2b", name: "Flame" },
  { id: "#2440ff", name: "Cobalt" },
  { id: "#ffc531", name: "Sun" },
  { id: "#16c79a", name: "Mint" },
  { id: "#f05bb5", name: "Bubble" },
  { id: "#8a5cff", name: "Grape" },
  { id: "#ffffff", name: "Paper" },
];

const NIBS = [
  { w: 4, label: "S" },
  { w: 10, label: "M" },
  { w: 22, label: "L" },
  { w: 44, label: "XL" },
];

type Props = {
  initialStrokes: Stroke[];
  onCommit: (strokes: Stroke[]) => void;
  disabled?: boolean;
};

export function SketchPad({ initialStrokes, onCommit, disabled }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const strokesRef = useRef<Stroke[]>(initialStrokes ?? []);
  const redoRef = useRef<Stroke[]>([]);
  const currentRef = useRef<Stroke | null>(null);
  const drawingRef = useRef(false);
  const hydrated = useRef(false);

  const [pen, setPen] = useState(PENS[0].id);
  const [customColor, setCustomColor] = useState("#9b4de0");
  const [hexInput, setHexInput] = useState("#9b4de0");
  const [nib, setNib] = useState(NIBS[1].w);
  const [eraser, setEraser] = useState(false);
  const [count, setCount] = useState(initialStrokes?.length ?? 0);

  const repaint = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    const all = currentRef.current ? [...strokesRef.current, currentRef.current] : strokesRef.current;
    renderStrokes(ctx, all);
  }, []);

  useEffect(() => {
    if (hydrated.current) return;
    hydrated.current = true;
    strokesRef.current = initialStrokes ?? [];
    setCount(strokesRef.current.length);
    repaint();
  }, [initialStrokes, repaint]);

  useEffect(() => {
    if (disabled) {
      currentRef.current = null;
      drawingRef.current = false;
      repaint();
    }
  }, [disabled, repaint]);

  const commit = useCallback(() => {
    setCount(strokesRef.current.length);
    onCommit(strokesRef.current);
  }, [onCommit]);

  const pointFrom = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * LOGICAL_W;
    const y = ((e.clientY - rect.top) / rect.height) * LOGICAL_H;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10] as const;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    const [x, y] = pointFrom(e);
    redoRef.current = [];
    currentRef.current = { c: eraser ? "#000000" : pen, w: eraser ? nib * 2.4 : nib, p: [x, y], e: eraser };
    drawingRef.current = true;
    repaint();
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled || !drawingRef.current || !currentRef.current) return;
    const [x, y] = pointFrom(e);
    const p = currentRef.current.p;
    const dx = x - p[p.length - 2];
    const dy = y - p[p.length - 1];
    if (p.length >= 4000) return;
    if (Math.hypot(dx, dy) < 3) return;
    p.push(x, y);
    repaint();
  };

  const endStroke = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    if (currentRef.current) {
      strokesRef.current = [...strokesRef.current, currentRef.current];
      currentRef.current = null;
    }
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* pointer already released */
    }
    repaint();
    commit();
  };

  const undo = () => {
    if (strokesRef.current.length === 0) return;
    const popped = strokesRef.current[strokesRef.current.length - 1];
    strokesRef.current = strokesRef.current.slice(0, -1);
    redoRef.current = [...redoRef.current, popped];
    repaint();
    commit();
  };

  const redo = () => {
    if (redoRef.current.length === 0) return;
    const next = redoRef.current[redoRef.current.length - 1];
    redoRef.current = redoRef.current.slice(0, -1);
    strokesRef.current = [...strokesRef.current, next];
    repaint();
    commit();
  };

  const clear = () => {
    if (strokesRef.current.length === 0) return;
    redoRef.current = [...strokesRef.current];
    strokesRef.current = [];
    repaint();
    commit();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="w-full">
      <div className="relative overflow-hidden rounded-[22px] border-[3px] border-ink bg-white shadow-[6px_6px_0_0_var(--color-ink)]">
        <div className="pointer-events-none absolute inset-0 z-10 rounded-[19px] ring-1 ring-inset ring-ink/10" />
        <canvas
          ref={canvasRef}
          width={LOGICAL_W * 2}
          height={LOGICAL_H * 2}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endStroke}
          onPointerCancel={endStroke}
          onPointerLeave={endStroke}
          className={`block w-full bg-white ${disabled ? "cursor-not-allowed opacity-95" : "cursor-crosshair"}`}
          style={{ aspectRatio: `${LOGICAL_W} / ${LOGICAL_H}`, touchAction: "none" }}
        />
        {count === 0 && !disabled && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center">
            <p className="display rotate-[-4deg] text-[clamp(1.4rem,4vw,2.6rem)] text-ink/15">
              scribble here
            </p>
          </div>
        )}
        {disabled && (
          <div className="hatch-light absolute inset-0 grid place-items-center bg-ink/55">
            <p className="display rotate-[-3deg] rounded-xl border-[3px] border-ink bg-sun px-4 py-2 text-2xl text-ink shadow-[4px_4px_0_0_var(--color-ink)]">
              PENCILS DOWN
            </p>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-ink bg-paper p-1.5 shadow-[3px_3px_0_0_var(--color-ink)]">
          {PENS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.name}
              aria-label={p.name}
              disabled={disabled}
              onClick={() => {
                setPen(p.id);
                setEraser(false);
              }}
              className={`h-8 w-8 rounded-full border-[3px] border-ink transition-transform duration-150 hover:-translate-y-0.5 disabled:opacity-40 ${
                !eraser && pen === p.id ? "scale-110 ring-[3px] ring-cobalt ring-offset-2 ring-offset-paper" : ""
              }`}
              style={{ background: p.id }}
            />
          ))}
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-ink bg-paper p-1.5 shadow-[3px_3px_0_0_var(--color-ink)]">
          <label
            title="Pick any color"
            className={`relative grid h-8 w-8 shrink-0 cursor-pointer place-items-center overflow-hidden rounded-full border-[3px] border-ink disabled:opacity-40 ${
              !eraser && pen === customColor ? "ring-[3px] ring-cobalt ring-offset-2 ring-offset-paper" : ""
            }`}
            style={{ background: customColor }}
          >
            <span className="pointer-events-none rounded-full bg-white/85 px-1 text-[12px] font-bold leading-4 text-ink">+</span>
            <input
              type="color"
              aria-label="Pick a custom pen color"
              value={customColor}
              disabled={disabled}
              onChange={(e) => {
                setCustomColor(e.target.value);
                setHexInput(e.target.value);
                setPen(e.target.value);
                setEraser(false);
              }}
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0 disabled:cursor-not-allowed"
            />
          </label>
          <input
            type="text"
            aria-label="Custom pen hex color"
            value={hexInput}
            maxLength={7}
            disabled={disabled}
            onChange={(e) => {
              const value = e.target.value;
              setHexInput(value);
              if (/^#[0-9a-fA-F]{6}$/.test(value)) {
                setCustomColor(value);
                setPen(value);
                setEraser(false);
              }
            }}
            onBlur={() => setHexInput(customColor)}
            className="h-8 w-[78px] rounded-md border-2 border-ink bg-white px-1.5 font-mono text-[11px] font-bold uppercase text-ink disabled:opacity-40"
          />
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border-[3px] border-ink bg-paper p-1.5 shadow-[3px_3px_0_0_var(--color-ink)]">
          {NIBS.map((n) => (
            <button
              key={n.w}
              type="button"
              disabled={disabled}
              onClick={() => setNib(n.w)}
              className={`grid h-8 w-9 place-items-center rounded-lg border-2 border-ink font-mono text-[11px] font-bold transition-colors disabled:opacity-40 ${
                nib === n.w ? "bg-ink text-paper" : "bg-white text-ink hover:bg-sun"
              }`}
            >
              {n.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={() => setEraser((v) => !v)}
          className={`press h-11 rounded-xl border-[3px] border-ink px-3 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-40 ${
            eraser ? "bg-cobalt text-white" : "bg-white text-ink"
          }`}
        >
          Eraser
        </button>
        <button
          type="button"
          disabled={disabled || count === 0}
          onClick={undo}
          className="press h-11 rounded-xl border-[3px] border-ink bg-white px-3 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-40"
        >
          Undo
        </button>
        <button
          type="button"
          disabled={disabled || redoRef.current.length === 0}
          onClick={redo}
          className="press h-11 rounded-xl border-[3px] border-ink bg-white px-3 font-mono text-xs font-bold uppercase shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-40"
        >
          Redo
        </button>
        <button
          type="button"
          disabled={disabled || count === 0}
          onClick={clear}
          className="press h-11 rounded-xl border-[3px] border-ink bg-flame px-3 font-mono text-xs font-bold uppercase text-white shadow-[3px_3px_0_0_var(--color-ink)] disabled:opacity-40"
        >
          Clear
        </button>
        <span className="ml-auto font-mono text-[11px] uppercase tracking-widest text-paper/60">
          {count} strokes
        </span>
      </div>
    </div>
  );
}
