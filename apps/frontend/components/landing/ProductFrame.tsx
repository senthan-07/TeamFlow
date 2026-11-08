import { ArrowUp, Eraser, Highlighter, PanelRightClose, PenLine, Undo2 } from "lucide-react";
import { LogoMark } from "../ui/Logo";
import HeroSheet from "./HeroSheet";

/** The product as the hero image: a TeamFlow board, built from real UI, drawing live. */

const PEOPLE = [
  { initials: "PS", color: "#2f4bd8", name: "Priya" },
  { initials: "MR", color: "#d9432a", name: "Marco" },
  { initials: "LK", color: "#8b3fa8", name: "Lena" },
];

const MESSAGES = [
  { who: PEOPLE[0], time: "10:42", text: "Here's the new sign-up flow. Onboarding feels like one step too many." },
  { who: PEOPLE[1], time: "10:43", text: "Agreed. What if we open their first board straight away?" },
  { who: PEOPLE[2], time: "10:43", text: "I'll pull last month's drop-off numbers." },
];

function Dot({ p, size = 26 }: { p: (typeof PEOPLE)[number]; size?: number }) {
  return (
    <span
      className="inline-grid shrink-0 place-items-center rounded-full text-[10px] font-semibold text-white ring-2 ring-paper"
      style={{ width: size, height: size, background: p.color }}
    >
      {p.initials}
    </span>
  );
}

export default function ProductFrame() {
  return (
    <div className="relative overflow-hidden rounded-[18px] border border-line-strong bg-paper shadow-[0_40px_120px_-40px_var(--glow),0_1px_0_var(--hairline)]">
      {/* Board header */}
      <div className="flex h-12 items-center gap-3 border-b border-line px-3 sm:px-4">
        <LogoMark className="h-6 w-6" />
        <span className="h-4 w-px bg-line" />
        <span className="truncate text-[13px] font-semibold tracking-[-0.02em] text-ink">Onboarding v2</span>
        <span className="meta hidden !text-[10px] md:inline">[Board · 03 here]</span>
        <div className="ml-auto flex items-center gap-2.5">
          <div className="hidden -space-x-1.5 sm:flex">
            {PEOPLE.map((p) => (
              <Dot key={p.initials} p={p} size={24} />
            ))}
          </div>
          <span className="inline-flex h-7 items-center gap-1.5 rounded-md bg-ink px-2.5 text-[12px] font-semibold text-paper">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-signal opacity-70" />
              <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-signal" />
            </span>
            Join call
          </span>
          <PanelRightClose className="hidden h-4 w-4 text-muted sm:block" />
        </div>
      </div>

      <div className="flex">
        {/* Toolbar */}
        <div className="hidden w-12 shrink-0 flex-col items-center gap-1.5 border-r border-line py-3 sm:flex">
          <span className="grid h-8 w-8 place-items-center rounded-md bg-signal text-on-signal">
            <PenLine className="h-4 w-4" />
          </span>
          {[Highlighter, Eraser].map((Icon, i) => (
            <span key={i} className="grid h-8 w-8 place-items-center rounded-md text-ink-2">
              <Icon className="h-4 w-4" />
            </span>
          ))}
          <span className="my-1 h-px w-5 bg-line" />
          {["var(--fg)", "#2f4bd8", "#d9432a", "#0e8a6a"].map((c) => (
            <span key={c} className="h-3.5 w-3.5 rounded-full" style={{ background: c }} />
          ))}
          <span className="my-1 h-px w-5 bg-line" />
          <Undo2 className="h-4 w-4 text-muted" />
        </div>

        {/* Canvas: the real drawing demo, interactive */}
        <div className="relative min-w-0 flex-1 bg-sheet">
          <HeroSheet bare />
          {/* Call dock */}
          <div className="pointer-events-none absolute bottom-3 left-3 hidden gap-1.5 rounded-xl border border-line bg-paper/90 p-1.5 backdrop-blur md:flex">
            {PEOPLE.map((p, i) => (
              <span
                key={p.initials}
                className={`grid h-12 w-[4.5rem] place-items-center rounded-lg bg-sheet-2 ${i === 1 ? "ring-2 ring-signal" : ""}`}
              >
                <Dot p={p} />
              </span>
            ))}
          </div>
        </div>

        {/* Chat panel */}
        <aside className="hidden w-[17rem] shrink-0 flex-col border-l border-line lg:flex">
          <div className="flex gap-4 border-b border-line px-4 pt-3 text-[12px] font-medium">
            <span className="border-b-2 border-signal pb-2 text-ink">Chat</span>
            <span className="text-muted">Files 2</span>
            <span className="text-muted">People 3</span>
          </div>
          <ol className="flex-1 space-y-3.5 px-4 py-4">
            {MESSAGES.map((m) => (
              <li key={m.text} className="flex gap-2.5">
                <Dot p={m.who} />
                <div className="min-w-0">
                  <p className="text-[12px] font-semibold text-ink">
                    {m.who.name} <span className="font-normal text-label">{m.time}</span>
                  </p>
                  <p className="mt-0.5 text-[12px] leading-snug text-ink-2">{m.text}</p>
                </div>
              </li>
            ))}
            <li className="flex items-center gap-1.5 pl-9 text-[11px] text-label">
              <span className="flex gap-0.5">
                {[0, 1, 2].map((i) => (
                  <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-label" style={{ animationDelay: `${i * 120}ms` }} />
                ))}
              </span>
              Priya is typing
            </li>
          </ol>
          <div className="m-3 flex items-center justify-between rounded-md border border-line-strong px-3 py-2 text-[12px] text-label">
            Message the board
            <span className="grid h-6 w-6 place-items-center rounded bg-ink text-paper">
              <ArrowUp className="h-3 w-3" />
            </span>
          </div>
        </aside>
      </div>
    </div>
  );
}
