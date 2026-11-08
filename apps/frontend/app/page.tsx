import SiteHeader from "../components/landing/SiteHeader";
import ProductFrame from "../components/landing/ProductFrame";
import Bento from "../components/landing/Bento";
import { ButtonLink } from "../components/ui/Button";
import Logo from "../components/ui/Logo";

const STEPS = [
  { title: "Create a board", body: "Name it. It's ready the moment you press create." },
  { title: "Invite by email", body: "Add teammates. The board appears on their dashboard." },
  { title: "Work it out together", body: "Draw, chat, share files and call, in one place." },
];

const pill = "rounded-full px-6";

export default function Home() {
  return (
    <div className="overflow-x-clip">
      <SiteHeader />

      <main>
        {/* ---- Hero: the product is the image ------------------------------------ */}
        <section className="relative">
          {/* Drafting grid that fades out from the top */}
          <div
            aria-hidden
            className="hairline-grid pointer-events-none absolute inset-x-0 top-0 h-[44rem] [mask-image:radial-gradient(ellipse_70%_60%_at_50%_0%,black,transparent)]"
          />
          <div className="relative mx-auto max-w-[88rem] px-4 pt-16 text-center sm:px-8 lg:pt-24">
            <p className="meta rise">[01 · Realtime whiteboard]</p>
            <h1 className="display rise mx-auto mt-7 text-ink" style={{ ["--d" as string]: "80ms" }}>
              One board for the sketch,
              <span className="display-dim">the chat and the call.</span>
            </h1>
            <p className="rise mx-auto mt-8 max-w-[46ch] text-[18px] leading-relaxed text-ink-2" style={{ ["--d" as string]: "160ms" }}>
              A shared whiteboard with chat, files and video built in. Invite your team and work it out on the same sheet, in
              real time.
            </p>
            <div className="rise mt-9 flex flex-wrap items-center justify-center gap-3" style={{ ["--d" as string]: "240ms" }}>
              <ButtonLink href="/register" size="lg" className={pill}>
                Create a free board
              </ButtonLink>
              <ButtonLink href="/login" variant="secondary" size="lg" className={pill}>
                Sign in
              </ButtonLink>
            </div>
          </div>

          <div className="rise relative mx-auto mt-16 max-w-[80rem] px-4 sm:px-8 lg:mt-20" style={{ ["--d" as string]: "380ms" }}>
            {/* Soft light behind the window */}
            <div aria-hidden className="pointer-events-none absolute inset-x-[8%] top-[6%] -z-10 h-[70%] rounded-[50%] bg-[var(--glow)] blur-[90px]" />
            <ProductFrame />
            <p className="meta mt-5 text-center">[Try it · draw anywhere on the sheet]</p>
          </div>
        </section>

        {/* ---- Product ----------------------------------------------------------- */}
        <section id="product" className="mx-auto max-w-[88rem] scroll-mt-20 px-4 pt-28 pb-24 sm:px-8 lg:pt-40 lg:pb-32">
          <div className="mb-14 grid gap-8 border-t border-line pt-6 lg:grid-cols-12">
            <p className="meta lg:col-span-3">[02 · Product]</p>
            <h2 className="display-md text-ink lg:col-span-9">
              Everything the meeting needs,
              <span className="display-dim">on the board itself.</span>
            </h2>
          </div>
          <Bento />
        </section>

        {/* ---- How it works -------------------------------------------------------- */}
        <section id="how" className="mx-auto max-w-[88rem] scroll-mt-20 px-4 pb-24 sm:px-8 lg:pb-32">
          <div className="grid gap-8 border-t border-line pt-6 lg:grid-cols-12">
            <p className="meta lg:col-span-3">[03 · How it works]</p>
            <h2 className="display-md text-ink lg:col-span-9">
              Up and running
              <span className="display-dim">in a minute.</span>
            </h2>
          </div>
          <ol className="mt-14 grid gap-4 md:grid-cols-3">
            {STEPS.map((step, i) => (
              <li key={step.title} className="rounded-[18px] border border-line p-7">
                <p className="font-serif text-[72px] leading-none text-line-strong italic">{String(i + 1).padStart(2, "0")}</p>
                <h3 className="mt-6 text-lg font-semibold tracking-[-0.01em] text-ink">{step.title}</h3>
                <p className="mt-2 max-w-[34ch] leading-relaxed text-ink-2">{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* ---- Close --------------------------------------------------------------- */}
        <section className="relative overflow-hidden border-t border-line">
          <div aria-hidden className="pointer-events-none absolute inset-x-[20%] top-1/2 -z-10 h-64 -translate-y-1/2 rounded-[50%] bg-[var(--glow)] blur-[100px]" />
          <div className="mx-auto max-w-[88rem] px-4 py-28 text-center sm:px-8 lg:py-36">
            <p className="meta">[04 · Start]</p>
            <h2 className="display-md mx-auto mt-6 max-w-[16ch] text-ink">
              Open a board.
              <span className="display-dim">Invite the room.</span>
            </h2>
            <ButtonLink href="/register" size="lg" className={`${pill} mt-10`}>
              Create a free board
            </ButtonLink>
          </div>
        </section>
      </main>

      <footer className="border-t border-line">
        <div className="mx-auto flex max-w-[88rem] flex-col gap-6 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <Logo />
          <p className="meta">Next.js · Socket.IO · WebRTC</p>
          <p className="meta">© {new Date().getFullYear()} TeamFlow</p>
        </div>
      </footer>
    </div>
  );
}
