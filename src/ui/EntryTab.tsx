"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ENTRY_KEY, entryRedirect } from "./entry";

/**
 * Starts a visit on the first tab (AC 84). Mounted once per page load in the root layout; the first load in a
 * browser tab marks the visit, so tapping Projects or reloading later never moves away. With storage blocked the
 * visit can't be told apart, so it stays where it is.
 */
export function EntryTab() {
  const router = useRouter();
  useEffect(() => {
    let entered: boolean;
    try {
      entered = sessionStorage.getItem(ENTRY_KEY) !== null;
      sessionStorage.setItem(ENTRY_KEY, "1");
    } catch {
      return;
    }
    const target = entryRedirect(window.location.pathname, window.location.search, entered);
    if (target) router.replace(target);
  }, [router]);
  return null;
}
