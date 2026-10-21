"use client";

import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { noteNavigation, retractPush } from "./nav-history";

// Back and forward reach two places in either order: Next re-renders on popstate first, so the pathname effect can
// run before this file's popstate listener (then the listener takes back the push the effect made), or after it
// (then the effect skips the location the pop landed on). Before, a frame-based flag assumed the listener ran first,
// so a pop was recorded as a new visit and the back control lost the screen under it (AC 96).
let poppedTo: string | null = null;
let pushedTo: string | null = null;

/** Records push and pop for the back control. Renders nothing. Mount once, under a Suspense boundary. */
export function NavHistory() {
  const pathname = usePathname();
  const search = useSearchParams().toString();

  useEffect(() => {
    const onPop = () => {
      const here = window.location.pathname + window.location.search;
      if (pushedTo === here) {
        retractPush(here);
      } else {
        poppedTo = here;
      }
      pushedTo = null;
      noteNavigation(here, true);
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    const here = window.location.pathname + window.location.search;
    const popped = poppedTo === here;
    poppedTo = null;
    if (popped) return;
    pushedTo = here;
    noteNavigation(here, false);
  }, [pathname, search]);

  return null;
}
