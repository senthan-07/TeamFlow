import { FileText, ImageIcon, MicOff } from "lucide-react";
import { cn } from "../../lib/utils";
import IsoStack from "./IsoStack";

function Cell({ index, title, body, className, children }: { index: string; title: string; body: string; className?: string; children: React.ReactNode }) {
  return (
    <li className={cn("group relative flex flex-col overflow-hidden rounded-[18px] border border-line bg-sheet", className)}>
      <div className="relative z-10 p-6 sm:p-7">
        <p className="meta">{index}</p>
        <h3 className="mt-4 font-serif text-[30px] leading-[1.02] tracking-[-0.02em] text-ink">{title}</h3>
        <p className="mt-2 max-w-[40ch] text-[15px] leading-relaxed text-ink-2">{body}</p>
      </div>
      <div className="relative mt-auto">{children}</div>
    </li>
  );
}

const chip = (color: string) => ({ background: color });

export default function Bento() {
  return (
    <ul className="grid gap-4 md:grid-cols-6">
      <Cell
        index="01 / 06"
        title="A sheet the whole team draws on"
        body="Strokes stream to everyone while they're being drawn, in each person's own ink, with named cursors so you know who's pointing where."
        className="md:col-span-4 md:row-span-2"
      >
        <div className="relative px-6 pb-6 sm:px-10">
          <IsoStack animated={false} labels={false} className="mx-auto max-w-[30rem]" />
          {/* Named cursors over the sketch */}
          <span className="absolute top-[18%] left-[58%] flex items-start gap-1">
            <svg width="14" height="18" viewBox="0 0 14 20" aria-hidden>
              <path d="M0 0 L0 17 L4.6 12.8 L7.7 19.7 L10.5 18.5 L7.5 11.8 L13.2 11.6 Z" fill="#2f4bd8" stroke="white" strokeWidth="1.3" />
            </svg>
            <span className="mt-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={chip("#2f4bd8")}>
              Priya
            </span>
          </span>
          <span className="absolute top-[46%] left-[24%] flex items-start gap-1">
            <svg width="14" height="18" viewBox="0 0 14 20" aria-hidden>
              <path d="M0 0 L0 17 L4.6 12.8 L7.7 19.7 L10.5 18.5 L7.5 11.8 L13.2 11.6 Z" fill="#d9432a" stroke="white" strokeWidth="1.3" />
            </svg>
            <span className="mt-3 rounded-full px-2 py-0.5 text-[11px] font-semibold text-white" style={chip("#d9432a")}>
              Marco
            </span>
          </span>
        </div>
      </Cell>

      <Cell index="02 / 06" title="Chat beside the sketch" body="The conversation stays with the drawing, so the context is still there next week." className="md:col-span-2">
        <div className="space-y-2 px-6 pb-6 sm:px-7">
          <p className="w-fit max-w-[85%] rounded-xl rounded-bl-sm border border-line bg-paper px-3 py-2 text-[13px] text-ink-2">
            Can we cut the onboarding step?
          </p>
          <p className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-ink px-3 py-2 text-[13px] text-paper">Yes, drafting it now.</p>
          <p className="flex items-center gap-1.5 pt-1 text-[12px] text-label">
            <span className="flex gap-0.5">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-1 w-1 animate-bounce rounded-full bg-label" style={{ animationDelay: `${i * 120}ms` }} />
              ))}
            </span>
            Lena is typing
          </p>
        </div>
      </Cell>

      <Cell index="03 / 06" title="Files in the same place" body="Screenshots, specs and PDFs, visible to everyone the moment they land." className="md:col-span-2">
        <ul className="space-y-1.5 px-6 pb-6 sm:px-7">
          {[
            { icon: FileText, name: "funnel-june.pdf", meta: "1.2 MB" },
            { icon: ImageIcon, name: "checkout-v3.png", meta: "uploading" },
          ].map(({ icon: Icon, name, meta }, i) => (
            <li key={name} className="flex items-center gap-3 rounded-lg border border-line bg-paper px-3 py-2">
              <Icon className="h-4 w-4 shrink-0 text-ink-2" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
                {i === 1 ? (
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-sheet-2">
                    <span className="block h-full w-[64%] rounded-full bg-signal" />
                  </span>
                ) : (
                  <span className="block text-[11px] text-label">{meta}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
      </Cell>

      <Cell index="04 / 06" title="Calls that start from the board" body="Up to six people, with screen sharing. Teammates see it's live and join in one click." className="md:col-span-2">
        <div className="grid grid-cols-2 gap-1.5 px-6 pb-6 sm:px-7">
          {[
            ["PS", "#2f4bd8"],
            ["MR", "#d9432a"],
            ["LK", "#8b3fa8"],
            ["AO", "#0e8a6a"],
          ].map(([initials, color], i) => (
            <span key={initials} className={cn("relative grid aspect-video place-items-center rounded-lg bg-sheet-2", i === 0 && "ring-2 ring-signal")}>
              <span className="grid h-8 w-8 place-items-center rounded-full text-[11px] font-semibold text-white" style={chip(color)}>
                {initials}
              </span>
              {i === 2 && (
                <span className="absolute right-1.5 bottom-1.5 grid h-4 w-4 place-items-center rounded bg-danger text-white">
                  <MicOff className="h-2.5 w-2.5" />
                </span>
              )}
            </span>
          ))}
        </div>
      </Cell>

      <Cell index="05 / 06" title="See who's here" body="Live presence on every board, and on the dashboard." className="md:col-span-2">
        <div className="flex items-center gap-3 px-6 pb-6 sm:px-7">
          <div className="flex -space-x-2">
            {["#2f4bd8", "#d9432a", "#8b3fa8"].map((c, i) => (
              <span key={c} className="relative h-9 w-9 rounded-full ring-2 ring-sheet" style={chip(c)}>
                {i < 2 && <span className="absolute -right-0.5 -bottom-0.5 h-2.5 w-2.5 rounded-full bg-signal ring-2 ring-sheet" />}
              </span>
            ))}
          </div>
          <span className="meta !text-ink-2">02 here now</span>
        </div>
      </Cell>

      <Cell index="06 / 06" title="Undo, redo, export" body="Keyboard shortcuts for every tool, and a PNG of the board in one click." className="md:col-span-2">
        <div className="flex flex-wrap gap-1.5 px-6 pb-6 sm:px-7">
          {["Ctrl Z", "Ctrl ⇧ Z", "P", "H", "E", "PNG"].map((k) => (
            <kbd key={k} className="rounded-md border border-line-strong bg-paper px-2 py-1 font-mono text-[11px] text-ink-2 shadow-[0_1px_0_var(--hairline-strong)]">
              {k}
            </kbd>
          ))}
        </div>
      </Cell>
    </ul>
  );
}
