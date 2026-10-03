import type { Stroke } from "@/lib/types";

const INK = "#17130f";
const FLAME = "#ff4b2b";
const COBALT = "#2440ff";
const SUN = "#ffc531";
const MINT = "#16c79a";
const BUBBLE = "#f05bb5";

function j(v: number, amt = 3.2) {
  return Math.round((v + (Math.random() - 0.5) * amt) * 10) / 10;
}

function poly(points: [number, number][], c = INK, w = 9): Stroke {
  const p: number[] = [];
  for (const [x, y] of points) p.push(j(x), j(y));
  return { c, w, p };
}

function arc(
  cx: number,
  cy: number,
  rx: number,
  ry: number,
  from: number,
  to: number,
  c = INK,
  w = 9,
  segs = 44,
): Stroke {
  const p: number[] = [];
  for (let i = 0; i <= segs; i++) {
    const t = from + ((to - from) * i) / segs;
    p.push(j(cx + Math.cos(t) * rx, 2.4), j(cy + Math.sin(t) * ry, 2.4));
  }
  return { c, w, p };
}

function ring(cx: number, cy: number, r: number, c = INK, w = 9): Stroke {
  return arc(cx, cy, r, r * 0.97, 0, Math.PI * 2.04, c, w, 40);
}

function dot(cx: number, cy: number, r: number, c = INK): Stroke {
  return { c, w: r * 2, p: [j(cx, 1), j(cy, 1), j(cx + 0.6, 1), j(cy + 0.6, 1)] };
}

function squiggle(
  x0: number,
  y0: number,
  x1: number,
  y1: number,
  amp: number,
  c = INK,
  w = 8,
  segs = 30,
): Stroke {
  const p: number[] = [];
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len = Math.hypot(dx, dy) || 1;
  const nx = -dy / len;
  const ny = dx / len;
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    const off = Math.sin(t * Math.PI * 3) * amp * Math.sin(t * Math.PI);
    p.push(j(x0 + dx * t + nx * off, 1.6), j(y0 + dy * t + ny * off, 1.6));
  }
  return { c, w, p };
}

function box(x: number, y: number, w: number, h: number, c = INK, lw = 8): Stroke[] {
  return [
    poly(
      [
        [x, y],
        [x + w, y],
        [x + w, y + h],
        [x, y + h],
        [x, y],
      ],
      c,
      lw,
    ),
  ];
}

export type Doodle = { prompt: string; strokes: Stroke[]; caption: string };

function catTaxes(): Doodle {
  const s: Stroke[] = [
    arc(400, 300, 148, 140, Math.PI * 0.08, Math.PI * 0.92, INK, 10, 30),
    poly(
      [
        [272, 214],
        [256, 96],
        [368, 172],
      ],
      INK,
      10,
    ),
    poly(
      [
        [528, 214],
        [546, 96],
        [436, 172],
      ],
      INK,
      10,
    ),
    arc(400, 300, 148, 140, Math.PI * 0.92, Math.PI * 2.08, INK, 10, 40),
    dot(344, 276, 13),
    dot(452, 276, 13),
    poly(
      [
        [386, 322],
        [412, 322],
        [399, 344],
        [386, 322],
      ],
      FLAME,
      8,
    ),
    squiggle(352, 372, 448, 372, 10, INK, 7),
    poly(
      [
        [258, 300],
        [150, 274],
      ],
      INK,
      6,
    ),
    poly(
      [
        [258, 328],
        [146, 336],
      ],
      INK,
      6,
    ),
    poly(
      [
        [542, 300],
        [650, 272],
      ],
      INK,
      6,
    ),
    poly(
      [
        [542, 328],
        [654, 340],
      ],
      INK,
      6,
    ),
    ...box(700, 168, 236, 320, COBALT, 9),
    poly(
      [
        [726, 226],
        [910, 226],
      ],
      COBALT,
      7,
    ),
    poly(
      [
        [726, 268],
        [880, 268],
      ],
      COBALT,
      7,
    ),
    poly(
      [
        [726, 310],
        [906, 310],
      ],
      COBALT,
      7,
    ),
    poly(
      [
        [726, 392],
        [860, 392],
      ],
      FLAME,
      9,
    ),
    ring(880, 420, 26, MINT, 8),
    poly(
      [
        [868, 420],
        [878, 432],
        [896, 408],
      ],
      MINT,
      8,
    ),
  ];
  return { prompt: "A cat filing its taxes", caption: "entry 03 · 4 votes", strokes: s };
}

function angryPizza(): Doodle {
  const s: Stroke[] = [
    poly(
      [
        [250, 130],
        [740, 130],
        [498, 540],
        [250, 130],
      ],
      SUN,
      12,
    ),
    arc(496, 150, 250, 46, Math.PI, Math.PI * 2, FLAME, 20, 30),
    ring(420, 240, 34, FLAME, 12),
    ring(580, 268, 28, FLAME, 12),
    ring(500, 400, 30, FLAME, 12),
    dot(436, 300, 12),
    dot(548, 316, 12),
    poly(
      [
        [406, 268],
        [458, 288],
      ],
      INK,
      10,
    ),
    poly(
      [
        [578, 284],
        [526, 302],
      ],
      INK,
      10,
    ),
    squiggle(452, 366, 546, 372, 12, INK, 9),
    squiggle(700, 470, 900, 520, 18, MINT, 9),
    ring(820, 200, 60, COBALT, 10),
    poly(
      [
        [760, 200],
        [700, 200],
      ],
      COBALT,
      8,
    ),
    poly(
      [
        [880, 200],
        [940, 200],
      ],
      COBALT,
      8,
    ),
    poly(
      [
        [820, 140],
        [820, 80],
      ],
      COBALT,
      8,
    ),
  ];
  return { prompt: "The last slice of pizza", caption: "entry 01 · 6 votes", strokes: s };
}

function shyGhost(): Doodle {
  const s: Stroke[] = [
    arc(470, 320, 180, 190, Math.PI, Math.PI * 2, INK, 12, 34),
    poly(
      [
        [290, 320],
        [290, 486],
      ],
      INK,
      12,
    ),
    squiggle(290, 486, 650, 486, 34, INK, 12, 24),
    poly(
      [
        [650, 486],
        [650, 320],
      ],
      INK,
      12,
    ),
    dot(404, 286, 15, COBALT),
    dot(536, 286, 15, COBALT),
    ring(470, 380, 34, FLAME, 10),
    squiggle(292, 350, 190, 400, 20, INK, 10, 18),
    squiggle(648, 350, 752, 402, 20, INK, 10, 18),
    ring(830, 180, 44, SUN, 10),
    poly(
      [
        [830, 108],
        [830, 78],
      ],
      SUN,
      8,
    ),
    poly(
      [
        [892, 140],
        [918, 120],
      ],
      SUN,
      8,
    ),
    poly(
      [
        [768, 140],
        [742, 120],
      ],
      SUN,
      8,
    ),
    squiggle(120, 540, 900, 560, 22, BUBBLE, 8, 26),
  ];
  return { prompt: "A ghost trying to be scary", caption: "entry 05 · 2 votes", strokes: s };
}

function mondayCoffee(): Doodle {
  const s: Stroke[] = [
    poly(
      [
        [330, 250],
        [660, 250],
        [620, 500],
        [370, 500],
        [330, 250],
      ],
      INK,
      12,
    ),
    arc(700, 350, 66, 66, -Math.PI * 0.45, Math.PI * 0.45, INK, 12, 20),
    squiggle(420, 210, 430, 90, 26, COBALT, 9, 20),
    squiggle(540, 210, 552, 70, 30, COBALT, 9, 22),
    dot(430, 340, 13),
    dot(560, 340, 13),
    squiggle(440, 430, 552, 430, 18, FLAME, 10, 16),
    poly(
      [
        [280, 530],
        [720, 530],
      ],
      INK,
      12,
    ),
    ring(860, 300, 70, SUN, 12),
    poly(
      [
        [860, 190],
        [860, 160],
      ],
      SUN,
      9,
    ),
    poly(
      [
        [950, 300],
        [980, 300],
      ],
      SUN,
      9,
    ),
    poly(
      [
        [930, 230],
        [954, 206],
      ],
      SUN,
      9,
    ),
    poly(
      [
        [790, 230],
        [766, 206],
      ],
      SUN,
      9,
    ),
    squiggle(90, 470, 250, 520, 26, MINT, 9, 18),
    squiggle(120, 160, 250, 120, 22, BUBBLE, 9, 18),
  ];
  return { prompt: "Monday morning", caption: "entry 02 · 5 votes", strokes: s };
}

export const DOODLES: Doodle[] = [catTaxes(), angryPizza(), shyGhost(), mondayCoffee()];
