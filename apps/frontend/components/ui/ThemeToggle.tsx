"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "../../hooks/useTheme";
import { useHydrated } from "../../hooks/useHydrated";
import { cn } from "../../lib/utils";

/** Switches between the bone (light) and jet (dark) palettes. */
export default function ThemeToggle({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const hydrated = useHydrated();
  const dark = hydrated && theme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light theme" : "Switch to dark theme"}
      title={dark ? "Light theme" : "Dark theme"}
      className={cn(
        "relative grid h-9 w-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-sheet-2 hover:text-ink",
        className,
      )}
    >
      <Sun className={cn("h-[17px] w-[17px] transition-[opacity,transform] duration-300", dark ? "scale-50 opacity-0" : "scale-100 opacity-100")} />
      <Moon className={cn("absolute h-[17px] w-[17px] transition-[opacity,transform] duration-300", dark ? "scale-100 opacity-100" : "scale-50 opacity-0")} />
    </button>
  );
}
