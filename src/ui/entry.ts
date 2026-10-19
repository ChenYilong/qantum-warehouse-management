import { NAV_ITEMS } from "./nav-section";

/**
 * Where a visit starts (AC 84): opening the projects list (`/sites`, no query) as the first page of a visit in a
 * browser tab lands on the first tab instead. Not yet configurable: the first tab is the tab bar's first entry. A
 * reload, a later visit to Projects in the same tab, or a link with a filter shows the list.
 */
export const ENTRY_KEY = "team-leader:entered";

export function entryRedirect(pathname: string, search: string, entered: boolean): string | null {
  if (entered || pathname !== "/sites" || search !== "") return null;
  const first = NAV_ITEMS[0]?.href ?? "/sites";
  return first === "/sites" ? null : first;
}
