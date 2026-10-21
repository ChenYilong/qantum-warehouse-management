import { ABOUT_PATH, ACTIONS_PATH, CALENDAR_PATH, MAP_PATH, MATERIALS_PATH } from "./format";
import { NAV } from "./messages";

/**
 * Same-document screens, oldest first. The back control pops when the screen it names is the one underneath,
 * so the browser restores that page instead of opening it as a new visit (which paints the Loading screen).
 */
const stack: string[] = [];
const listeners = new Set<() => void>();

/** For `useSyncExternalStore`: the back control re-reads the screen underneath whenever the stack moves. */
export function subscribeNavHistory(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function changed(): void {
  for (const listener of listeners) listener();
}

/** The screen this visit came from, or null when this is the first one (opened directly, or reloaded). */
export function previousScreen(): string | null {
  return stack[stack.length - 2] ?? null;
}

/**
 * True when this visit has a screen under the current one in this tab, so a back control can pop to it like the
 * browser's own back (or a swipe back) instead of opening a fixed page as a new visit (AC 96).
 */
export function canGoBack(): boolean {
  return stack.length >= 2;
}

/** Drops the stack. Tests call this between cases; a full page load starts empty on its own. */
export function clearNavHistory(): void {
  stack.splice(0, stack.length);
  changed();
}

/**
 * Takes back a push of `href` that was really a back or forward (AC 96): Next re-renders on popstate before other
 * listeners run, so the route effect can record the screen a pop lands on as a new visit before the pop is seen.
 * Only the top entry, and only when it is that screen.
 */
export function retractPush(href: string): void {
  const key = locationKey(href);
  if (stack.length > 0 && stack[stack.length - 1] === key) {
    stack.pop();
    changed();
  }
}

export function noteNavigation(href: string, popped: boolean): void {
  const key = locationKey(href);
  if (popped) {
    const index = stack.lastIndexOf(key);
    // Browser back or forward to a screen we still have: drop whatever was above it. An entry we never
    // recorded (forward after we had already trimmed, or a restored document) becomes the whole stack,
    // so a later back control does not pretend to know the page under it.
    if (index >= 0) stack.splice(index + 1);
    else stack.splice(0, stack.length, key);
    changed();
    return;
  }
  if (stack[stack.length - 1] !== key) {
    stack.push(key);
    changed();
  }
}

/** The top-level pages a back control can name by where they are. */
const TOP_LEVEL: Readonly<Record<string, string>> = {
  [MAP_PATH]: NAV.map,
  [CALENDAR_PATH]: NAV.calendar,
  "/sites": NAV.sites,
  [ABOUT_PATH]: NAV.about,
  [MATERIALS_PATH]: NAV.materials,
  [ACTIONS_PATH]: NAV.actions,
};

/**
 * Where a back control leads (AC 85): back where the visit came from. The page's own target when nothing came before
 * (opened directly), when the screen underneath is that target already (its link may carry a query or an anchor), or
 * when it is a screen the control can't name; otherwise the top-level page underneath, by its name.
 */
export function backTarget(fallback: { readonly href: string; readonly name: string }, previous: string | null): { readonly href: string; readonly name: string } {
  if (previous === null) return fallback;
  const { pathname } = parts(previous);
  if (pathname === parts(fallback.href).pathname) return fallback;
  const name = TOP_LEVEL[pathname];
  return name ? { href: previous, name } : fallback;
}

/** True when `backHref` is the screen under the current one. A link with no query still matches that screen. */
export function returnsToPrevious(backHref: string): boolean {
  const under = stack[stack.length - 2];
  if (under === undefined) return false;
  const previous = parts(under);
  const target = parts(backHref);
  if (previous.pathname !== target.pathname) return false;
  if (target.search === "") return true;
  return previous.search === target.search;
}

function locationKey(href: string): string {
  const { pathname, search } = parts(href);
  return pathname + search;
}

function parts(href: string): { pathname: string; search: string } {
  const url = new URL(href, "http://localhost");
  return { pathname: url.pathname, search: url.search };
}
