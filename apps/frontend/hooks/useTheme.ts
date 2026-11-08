"use client";

import { useCallback, useSyncExternalStore } from "react";

export type ThemeChoice = "light" | "dark" | "system";
export type Theme = "light" | "dark";

const KEY = "theme";
const EVENT = "themechange";

function readChoice(): ThemeChoice {
  try {
    const v = localStorage.getItem(KEY);
    return v === "light" || v === "dark" ? v : "system";
  } catch {
    return "system";
  }
}

function resolve(choice: ThemeChoice): Theme {
  if (choice !== "system") return choice;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function subscribe(cb: () => void) {
  const mq = window.matchMedia("(prefers-color-scheme: dark)");
  mq.addEventListener("change", cb);
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb); // other tabs
  return () => {
    mq.removeEventListener("change", cb);
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}

/** Resolved theme ("light" | "dark") plus a setter. Server render assumes light. */
export function useTheme() {
  const theme = useSyncExternalStore<Theme>(subscribe, () => resolve(readChoice()), () => "light");

  const setTheme = useCallback((choice: ThemeChoice) => {
    try {
      if (choice === "system") localStorage.removeItem(KEY);
      else localStorage.setItem(KEY, choice);
    } catch {
      /* storage blocked: still apply for this page view */
    }
    const root = document.documentElement;
    if (choice === "system") root.removeAttribute("data-theme");
    else root.setAttribute("data-theme", choice);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return { theme, setTheme };
}

