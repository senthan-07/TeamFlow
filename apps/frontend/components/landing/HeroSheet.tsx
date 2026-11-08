"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import { cn } from "../../lib/utils";
import { AvatarStack } from "../ui/Avatar";

/* ------------------------------------------------------------------------------------
 * A live, drawable board for the landing page. Two teammates annotate a wireframe on
 * load (one orchestrated moment), then the sheet is yours to draw on.
 * Everything is in a 640×440 viewBox so it scales crisply at any width.
 * ---------------------------------------------------------------------------------- */

const PRIYA = { id: "priya", name: "Priya", color: "var(--marker-ultramarine)" };
const MARCO = { id: "marco", name: "Marco", color: "var(--marker-vermilion)" };
const YOU = "var(--marker-emerald)";

type Pt = [number, number];

// Hand-drawn wireframe (static, rendered on the server so the sheet is never blank).
const BOXES = [
  "M52 122 C90 119 160 121 199 120 C201 145 200 175 200 199 C160 201 95 200 51 200 C49 175 50 148 52 122 Z",
  "M247 121 C290 118 350 121 394 120 C396 146 395 176 395 200 C350 202 290 200 246 201 C244 176 245 147 247 121 Z",
  "M442 120 C485 118 545 121 589 121 C591 146 590 175 590 200 C545 202 485 200 441 200 C439 176 440 147 442 120 Z",
];
const ARROWS = [
  "M205 160 C220 158 230 161 240 160 M232 153 L241 160 L232 167",
  "M400 160 C415 158 425 161 435 160 M427 153 L436 160 L427 167",
];
const LABELS: { x: number; text: string }[] = [
  { x: 125, text: "Sign up" },
  { x: 320, text: "Onboarding" },
  { x: 515, text: "First board" },
];

// Annotations drawn live.
const ANIMATED = {
  circle:
    "M320 104 C380 100 418 128 414 162 C410 200 365 222 315 220 C262 218 224 196 228 160 C232 126 270 106 322 102 C340 101 352 104 360 108",
  connector: "M300 224 C296 232 292 238 288 246",
  arc: "M125 114 C170 28 470 28 512 110",
  head: "M498 100 L513 113 L519 95",
} as const;
type AnimatedId = keyof typeof ANIMATED;

type Segment =
  | { kind: "glide"; to: Pt; start: number; end: number }
  | { kind: "draw"; path: AnimatedId; start: number; end: number };

// Timeline (ms from start). Each cursor follows its own list of segments.
const TIMELINE: Record<"priya" | "marco", { from: Pt; segments: Segment[] }> = {
  priya: {
    from: [560, 330],
    segments: [
      { kind: "glide", to: [320, 104], start: 0, end: 520 },
      { kind: "draw", path: "circle", start: 560, end: 1750 },
      { kind: "glide", to: [300, 224], start: 1750, end: 1900 },
      { kind: "draw", path: "connector", start: 1900, end: 2080 },
      { kind: "glide", to: [392, 268], start: 2100, end: 2600 },
    ],
  },
  marco: {
    from: [92, 340],
    segments: [
      { kind: "glide", to: [125, 114], start: 1600, end: 2250 },
      { kind: "draw", path: "arc", start: 2250, end: 3350 },
      { kind: "glide", to: [498, 100], start: 3350, end: 3450 },
      { kind: "draw", path: "head", start: 3450, end: 3700 },
      { kind: "glide", to: [560, 70], start: 3800, end: 4300 },
    ],
  },
};
const REVEALS = [
  { id: "note", start: 2100, end: 2600 },
  { id: "straight", start: 3700, end: 4100 },
];
const CHAT_AT = 4000;
const START_DELAY = 500;
const END = 4400;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 2);

/** Smooth freehand path: quadratic curves through midpoints of the raw points. */
function smoothPath(points: Pt[]): string {
  if (points.length === 1) return `M${points[0][0]} ${points[0][1]} l0.1 0`;
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, y] = points[i];
    const [nx, ny] = points[i + 1];
    d += ` Q${x} ${y} ${(x + nx) / 2} ${(y + ny) / 2}`;
  }
  const last = points[points.length - 1];
  return `${d} L${last[0]} ${last[1]}`;
}

function Cursor({ name, color, innerRef }: { name: string; color: string; innerRef: (el: SVGGElement | null) => void }) {
  const width = name.length * 7 + 18;
  return (
    <g ref={innerRef} style={{ willChange: "transform" }}>
      <path
        d="M0 0 L0 17 L4.6 12.8 L7.7 19.7 L10.5 18.5 L7.5 11.8 L13.2 11.6 Z"
        fill={color}
        stroke="white"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <rect x="11" y="18" width={width} height="19" rx="9.5" fill={color} />
      <text x={11 + width / 2} y="31.2" textAnchor="middle" fontSize="11.5" fontWeight="600" fill="white" className="font-sans">
        {name}
      </text>
    </g>
  );
}

/** `bare`: no frame or overlays, for embedding inside the product-window mock. */
export default function HeroSheet({ interactive = true, bare = false, className }: { interactive?: boolean; bare?: boolean; className?: string }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const pathRefs = useRef<Partial<Record<AnimatedId, SVGPathElement | null>>>({});
  const cursorRefs = useRef<Partial<Record<"priya" | "marco", SVGGElement | null>>>({});
  const revealRefs = useRef<Record<string, SVGTextElement | null>>({});

  const rootRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [showChat, setShowChat] = useState(!interactive);
  const [strokes, setStrokes] = useState<Pt[][]>([]);
  const drawing = useRef<Pt[] | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!interactive || !rootRef.current) return;
    const io = new IntersectionObserver(([e]) => e.isIntersecting && (setInView(true), io.disconnect()), { threshold: 0.45 });
    io.observe(rootRef.current);
    return () => io.disconnect();
  }, [interactive]);

  // ---- Orchestrated intro (plays once, when the sheet comes into view) ------------
  useEffect(() => {
    const paths = pathRefs.current;
    const lengths = {} as Record<AnimatedId, number>;
    (Object.keys(ANIMATED) as AnimatedId[]).forEach((id) => {
      const el = paths[id];
      if (!el) return;
      lengths[id] = el.getTotalLength();
      el.style.strokeDasharray = `${lengths[id]}`;
      el.style.opacity = "1";
    });

    const pointOn = (id: AnimatedId, p: number): Pt => {
      const pt = paths[id]!.getPointAtLength(lengths[id] * p);
      return [pt.x, pt.y];
    };

    const render = (t: number) => {
      (Object.keys(TIMELINE) as ("priya" | "marco")[]).forEach((who) => {
        const { from, segments } = TIMELINE[who];
        let pos: Pt = from;
        for (const seg of segments) {
          if (t < seg.start) break;
          const p = clamp01((t - seg.start) / (seg.end - seg.start));
          if (seg.kind === "glide") {
            const e = easeInOut(p);
            pos = [pos[0] + (seg.to[0] - pos[0]) * e, pos[1] + (seg.to[1] - pos[1]) * e];
          } else {
            const e = easeOut(p);
            paths[seg.path]!.style.strokeDashoffset = `${lengths[seg.path] * (1 - e)}`;
            pos = pointOn(seg.path, e);
          }
        }
        cursorRefs.current[who]?.setAttribute("transform", `translate(${pos[0]} ${pos[1]})`);
      });
      REVEALS.forEach(({ id, start, end }) => {
        const el = revealRefs.current[id];
        if (el) el.style.opacity = `${clamp01((t - start) / (end - start))}`;
      });
    };

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!interactive || reduce) {
      render(END);
      setShowChat(true);
      return;
    }

    render(0);
    if (!inView) return;
    let raf = 0;
    let startedAt = 0;
    const tick = (now: number) => {
      if (!startedAt) startedAt = now + START_DELAY;
      const t = Math.max(0, now - startedAt);
      render(t);
      if (t >= CHAT_AT) setShowChat(true);
      if (t < END) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [interactive, inView]);

  // ---- Your turn: freehand drawing ----------------------------------------------
  const toSvg = useCallback((e: React.PointerEvent): Pt => {
    const svg = svgRef.current!;
    const pt = svg.createSVGPoint();
    pt.x = e.clientX;
    pt.y = e.clientY;
    const { x, y } = pt.matrixTransform(svg.getScreenCTM()!.inverse());
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }, []);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || e.button !== 0) return;
    (e.target as Element).setPointerCapture(e.pointerId);
    drawing.current = [toSvg(e)];
    force((n) => n + 1);
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!drawing.current) return;
    const [x, y] = toSvg(e);
    const [lx, ly] = drawing.current[drawing.current.length - 1];
    if (Math.hypot(x - lx, y - ly) < 1.5) return;
    drawing.current.push([x, y]);
    force((n) => n + 1);
  };
  const onPointerUp = () => {
    const stroke = drawing.current;
    drawing.current = null;
    if (stroke) setStrokes((s) => [...s.slice(-40), stroke]);
  };

  const hasDrawn = strokes.length > 0 || !!drawing.current;

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      <div className={cn("relative overflow-hidden", bare ? "bg-transparent" : "rounded-[var(--radius-panel)] border border-line bg-paper")}>
        <svg
          ref={svgRef}
          viewBox="0 0 640 440"
          className={cn("block h-auto w-full touch-none select-none", interactive && "cursor-crosshair")}
          role={interactive ? "img" : "presentation"}
          aria-label={
            interactive
              ? "A shared board: Priya circles the onboarding step and writes 'cut this step?', Marco draws an arrow from sign up straight to the first board. You can draw here too."
              : undefined
          }
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerUp}
        >
          <defs>
            <pattern id="hero-dots" width="22" height="22" patternUnits="userSpaceOnUse">
              <circle cx="11" cy="11" r="1" fill="var(--dot)" />
            </pattern>
          </defs>
          <rect width="640" height="440" fill="url(#hero-dots)" />

          {/* Wireframe in pencil */}
          <text x="50" y="44" fontSize="28" fontWeight="700" fill="var(--ink)" className="font-hand">
            new user flow, v2
          </text>
          <g fill="none" stroke="var(--ink-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            {BOXES.map((d) => (
              <path key={d} d={d} />
            ))}
            {ARROWS.map((d) => (
              <path key={d} d={d} />
            ))}
          </g>
          {LABELS.map((l) => (
            <text key={l.text} x={l.x} y="168" textAnchor="middle" fontSize="25" fontWeight="500" fill="var(--ink)" className="font-hand">
              {l.text}
            </text>
          ))}

          {/* Live annotations (hidden until the timeline runs, so there's no flash on load) */}
          <g fill="none" strokeLinecap="round" strokeLinejoin="round">
            {(["circle", "connector"] as const).map((id) => (
              <path
                key={id}
                ref={(el) => {
                  pathRefs.current[id] = el;
                }}
                d={ANIMATED[id]}
                stroke={PRIYA.color}
                strokeWidth="3"
                style={{ opacity: 0 }}
              />
            ))}
            {(["arc", "head"] as const).map((id) => (
              <path
                key={id}
                ref={(el) => {
                  pathRefs.current[id] = el;
                }}
                d={ANIMATED[id]}
                stroke={MARCO.color}
                strokeWidth="3"
                style={{ opacity: 0 }}
              />
            ))}
          </g>
          <text
            ref={(el) => {
              revealRefs.current.note = el;
            }}
            x="236"
            y="270"
            fontSize="28"
            fontWeight="700"
            fill={PRIYA.color}
            className="font-hand"
            style={{ opacity: 0 }}
          >
            cut this step?
          </text>
          <text
            ref={(el) => {
              revealRefs.current.straight = el;
            }}
            x="318"
            y="82"
            textAnchor="middle"
            fontSize="26"
            fontWeight="700"
            fill={MARCO.color}
            className="font-hand"
            style={{ opacity: 0 }}
          >
            straight in
          </text>

          {/* Visitor strokes */}
          <g fill="none" stroke={YOU} strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
            {strokes.map((s, i) => (
              <path key={i} d={smoothPath(s)} />
            ))}
            {drawing.current && <path d={smoothPath(drawing.current)} />}
          </g>

          {interactive && (
            <text
              x="604"
              y="414"
              textAnchor="end"
              fontSize="24"
              fontWeight="500"
              fill="var(--muted)"
              className="font-hand transition-opacity duration-300"
              style={{ opacity: hasDrawn ? 0 : 1 }}
            >
              your turn, draw anywhere
            </text>
          )}

          <Cursor name={PRIYA.name} color={PRIYA.color} innerRef={(el) => void (cursorRefs.current.priya = el)} />
          <Cursor name={MARCO.name} color={MARCO.color} innerRef={(el) => void (cursorRefs.current.marco = el)} />
        </svg>

        {/* Call in progress */}
        {!bare && <div className="pointer-events-none absolute top-3 right-3 hidden items-center gap-2 sm:flex rounded-full border border-line bg-sheet/90 py-1 pr-3 pl-1 shadow-sheet backdrop-blur">
          <AvatarStack
            size="xs"
            users={[
              { id: "priya", name: "Priya Shah", color: PRIYA.color },
              { id: "marco", name: "Marco Ruiz", color: MARCO.color },
              { id: "lena", name: "Lena Koch", color: "var(--marker-plum)" },
            ]}
          />
          <span className="meta flex items-center gap-1.5 !text-ink-2">
            <span className="h-1.5 w-1.5 rounded-full bg-signal" />
            Live · 03
          </span>
        </div>}

        {interactive && strokes.length > 0 && (
          <button
            type="button"
            onClick={() => setStrokes([])}
            className="absolute right-3 bottom-3 inline-flex items-center gap-1.5 rounded-full border border-line bg-paper/95 px-3 py-1.5 text-xs font-medium text-ink-2 backdrop-blur hover:text-ink"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Clear your drawing
          </button>
        )}
      </div>

      {/* Chat, pinned beside the sketch */}
      {!bare && <div
        aria-hidden={!showChat}
        className={cn(
          "absolute -bottom-6 left-4 hidden w-[17.5rem] rounded-[var(--radius-panel)] border border-line bg-paper p-3 shadow-float sm:block",
          "transition-[opacity,transform] duration-500 ease-[var(--ease-out-quint)]",
          showChat ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        )}
      >
        <div className="flex items-start gap-2.5">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full text-[11px] font-semibold text-white" style={{ background: MARCO.color }}>
            MR
          </span>
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink">
              Marco <span className="font-normal text-muted">just now</span>
            </p>
            <p className="mt-0.5 text-[13px] leading-snug text-ink-2">
              What if we skip onboarding and open their first board straight away?
            </p>
          </div>
        </div>
      </div>}
    </div>
  );
}
