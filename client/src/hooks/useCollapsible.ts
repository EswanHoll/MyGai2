import { useState, useCallback } from "react";

/**
 * A hook that manages a boolean open/closed state persisted in localStorage.
 * Used for collapsible sections on the Overview page.
 */
export function useCollapsible(key: string, defaultOpen = true): [boolean, (v: boolean) => void] {
  const [open, setOpenState] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (stored === null) return defaultOpen;
      return stored === "true";
    } catch {
      return defaultOpen;
    }
  });

  const setOpen = useCallback(
    (v: boolean) => {
      setOpenState(v);
      try {
        localStorage.setItem(key, String(v));
      } catch {
        // localStorage unavailable — silently ignore
      }
    },
    [key]
  );

  return [open, setOpen];
}
