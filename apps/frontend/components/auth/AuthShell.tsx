import Logo from "../ui/Logo";
import IsoStack from "../landing/IsoStack";
import ThemeToggle from "../ui/ThemeToggle";

export default function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <div className="flex flex-col px-4 sm:px-10">
        <div className="flex h-16 items-center justify-between border-b border-line">
          <Logo />
          <p className="meta hidden sm:block">[00 · Account]</p>
        </div>
        <main className="flex flex-1 items-center justify-center py-12">
          <div className="w-full max-w-[24rem]">{children}</div>
        </main>
        <p className="meta border-t border-line py-5">© {new Date().getFullYear()} TeamFlow</p>
      </div>

      {/* The board, in layers: what you're signing in to. */}
      <aside className="hairline-grid relative hidden flex-col border-l border-line lg:flex">
        <div className="flex h-16 items-center justify-between border-b border-line bg-paper px-10">
          <p className="meta">[01 · Realtime whiteboard]</p>
          <ThemeToggle />
        </div>
        <div className="flex flex-1 items-center justify-center p-10">
          <IsoStack labels={false} className="max-w-[30rem]" />
        </div>
        <div className="grid grid-cols-3 border-t border-line bg-paper">
          {[
            ["01 / Sync", "Live"],
            ["02 / Call", "06 max"],
            ["03 / Files", "25 MB"],
          ].map(([k, v], i) => (
            <div key={k} className={`px-10 py-5 ${i ? "border-l border-line" : ""}`}>
              <p className="meta">{k}</p>
              <p className="mt-1 text-[15px] font-medium text-ink">{v}</p>
            </div>
          ))}
        </div>
      </aside>
    </div>
  );
}
