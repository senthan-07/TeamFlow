"use client";

import { useEffect, useState } from "react";

/**
 * True after the first client render. The persisted auth store reads localStorage
 * synchronously when the module loads, so once mounted the session is known. Gating on
 * this (instead of a store flag) also keeps server and client markup identical.
 */
export function useHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  return hydrated;
}
