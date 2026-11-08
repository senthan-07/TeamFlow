import { cn } from "../../lib/utils";

/**
 * An exploded isometric view of a TeamFlow board: canvas, chat, files and call are the
 * four layers of one surface. Pure SVG; colours come from the --struct-* tokens so it
 * renders in graphite (light) or cerulean (dark).
 */

const W = 340; // plate width
const H = W / 2; // 2:1 isometric projection
const T = 10; // plate thickness
const CX = 270;
const LAYERS = [
  { key: "A", name: "Canvas", spec: "6 inks · live cursors", cy: 130 },
  { key: "B", name: "Chat", spec: "Typing · history", cy: 240 },
  { key: "C", name: "Files", spec: "25 MB · drag and drop", cy: 350 },
  { key: "D", name: "Call", spec: "Up to 06 · screen share", cy: 460 },
] as const;
const COLLAPSED = (LAYERS[0].cy + LAYERS[3].cy) / 2;

/** Maps a 100×100 artwork space onto a plate's top face. */
const faceMatrix = (cy: number) => `matrix(${W / 200} ${-H / 200} ${W / 200} ${H / 200} ${CX - W / 2} ${cy})`;

function Plate({ cy, children }: { cy: number; children: React.ReactNode }) {
  const L = [CX - W / 2, cy];
  const Tp = [CX, cy - H / 2];
  const R = [CX + W / 2, cy];
  const B = [CX, cy + H / 2];
  const p = (...pts: number[][]) => pts.map((q) => q.join(",")).join(" ");
  return (
    <>
      <polygon points={p(L, B, [B[0], B[1] + T], [L[0], L[1] + T])} fill="var(--struct-left)" />
      <polygon points={p(B, R, [R[0], R[1] + T], [B[0], B[1] + T])} fill="var(--struct-right)" />
      <polygon points={p(L, Tp, R, B)} fill="var(--struct-top)" stroke="var(--struct-edge)" strokeWidth="1" />
      <g transform={faceMatrix(cy)} fill="none" stroke="var(--struct-ink)" strokeLinecap="round" strokeLinejoin="round">
        {children}
      </g>
    </>
  );
}

const ns = { vectorEffect: "non-scaling-stroke" as const, strokeWidth: 1.4 };

function CanvasArt() {
  const dots = [];
  for (let x = 10; x <= 90; x += 10) for (let y = 10; y <= 90; y += 10) dots.push(<circle key={`${x}-${y}`} cx={x} cy={y} r="0.7" fill="var(--struct-ink)" stroke="none" opacity="0.35" />);
  return (
    <>
      {dots}
      <rect x="16" y="14" width="26" height="22" rx="1.5" {...ns} />
      <path d="M14 74 C28 36 42 34 52 58 S74 84 86 40" {...ns} strokeWidth={2} />
      <path d="M58 16 L84 16 M58 24 L76 24" {...ns} opacity="0.6" />
    </>
  );
}

function ChatArt() {
  const rows = [
    [12, 12, 46],
    [38, 32, 50],
    [12, 52, 34],
    [30, 72, 58],
  ];
  return (
    <>
      {rows.map(([x, y, w]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x - 4} cy={y + 6} r="2.6" {...ns} />
          <rect x={x} y={y} width={w} height="12" rx="3" {...ns} />
        </g>
      ))}
    </>
  );
}

function FilesArt() {
  return (
    <>
      {[14, 40, 66].map((x) => (
        <path key={x} d={`M${x} 18 h14 l6 6 v26 h-20 Z M${x + 14} 18 v6 h6`} {...ns} />
      ))}
      <rect x="14" y="66" width="72" height="4" rx="2" {...ns} opacity="0.5" />
      <rect x="14" y="66" width="44" height="4" rx="2" fill="var(--struct-ink)" stroke="none" opacity="0.7" />
    </>
  );
}

function CallArt() {
  const tiles = [
    [12, 12],
    [52, 12],
    [12, 54],
    [52, 54],
  ];
  return (
    <>
      {tiles.map(([x, y], i) => (
        <g key={i}>
          <rect x={x} y={y} width="36" height="34" rx="3" {...ns} />
          <circle cx={x + 18} cy={y + 14} r="5" {...ns} />
          <path d={`M${x + 9} ${y + 30} q9 -10 18 0`} {...ns} />
        </g>
      ))}
      {/* The one live element: someone is speaking. */}
      <rect x="11" y="11" width="38" height="36" rx="4" stroke="var(--signal)" {...ns} strokeWidth={2} />
    </>
  );
}

const ART = [CanvasArt, ChatArt, FilesArt, CallArt];

export default function IsoStack({ animated = true, labels = true, className }: { animated?: boolean; labels?: boolean; className?: string }) {
  return (
    <svg viewBox="0 0 700 600" className={cn("h-auto w-full", className)} aria-hidden="true">
      {/* Guide rails between the layers */}
      <g className={animated ? "iso-label" : undefined} stroke="var(--line-strong)" strokeDasharray="2 5" strokeWidth="1">
        {[CX - W / 2, CX, CX + W / 2].map((x) => (
          <line key={x} x1={x} x2={x} y1={LAYERS[0].cy + (x === CX ? H / 2 : 0)} y2={LAYERS[3].cy + (x === CX ? H / 2 : 0)} />
        ))}
      </g>

      {/* Bottom layer first: higher plates sit in front. */}
      {[...LAYERS].reverse().map((layer) => {
        const i = LAYERS.indexOf(layer);
        const Art = ART[i];
        return (
          <g
            key={layer.key}
            className={animated ? "iso-plate" : undefined}
            style={{ ["--from" as string]: `${COLLAPSED - layer.cy}px`, ["--i" as string]: 3 - i }}
          >
            <Plate cy={layer.cy}>
              <Art />
            </Plate>
            {labels && (
              <g className={cn("max-sm:hidden", animated && "iso-label")} style={{ ["--i" as string]: i }}>
                <line x1={CX + W / 2 + 6} x2={CX + W / 2 + 34} y1={layer.cy} y2={layer.cy} stroke="var(--line-strong)" />
                <text x={CX + W / 2 + 42} y={layer.cy - 2} fontSize="11" letterSpacing="1.6" fill="var(--ink)" className="font-mono uppercase">
                  [{layer.key} · {layer.name}]
                </text>
                <text x={CX + W / 2 + 42} y={layer.cy + 14} fontSize="9.5" letterSpacing="1.4" fill="var(--label)" className="font-mono uppercase">
                  {layer.spec}
                </text>
                {layer.key === "D" && <circle cx={CX + W / 2 + 34} cy={layer.cy} r="3.5" fill="var(--signal)" />}
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}
