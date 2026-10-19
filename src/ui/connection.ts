/**
 * The header's Online switch's rules (AC 48). Pure, so the client island stays small and the wording is tested here.
 * Online needs three things: the browser says it has a network, the last health check answered, and the
 * person has not chosen to work offline. Until the first check answers the switch says "Checking", never Online.
 */

export type ConnectionState = "checking" | "online" | "offline";

export interface ConnectionFacts {
  /** `navigator.onLine`. False is reliable; true only means "some network". */
  readonly browserOnline: boolean;
  /** The person switched Online off on this tab. */
  readonly workOffline: boolean;
  /** When the health check last answered, as epoch ms. Null before any answer. */
  readonly lastOkAt: number | null;
  /** When the health check last failed, as epoch ms. Null when it never has. */
  readonly lastFailAt: number | null;
}

/** How often the switch asks the server whether it is there. */
export const HEALTH_INTERVAL_MS = 30_000;

/** sessionStorage: Online switched off on this tab. Cleared when the tab closes, so a forgotten choice cannot stick. */
export const WORK_OFFLINE_KEY = "team-leader:work-offline";
/** localStorage: when Sync now last reached the server on this device. */
export const LAST_SYNCED_KEY = "team-leader:last-synced";

export function connectionState(facts: ConnectionFacts): ConnectionState {
  if (facts.workOffline || !facts.browserOnline) return "offline";
  if (facts.lastOkAt === null) return facts.lastFailAt === null ? "checking" : "offline";
  if (facts.lastFailAt !== null && facts.lastFailAt >= facts.lastOkAt) return "offline";
  return "online";
}

function validTime(value: number | string | null | undefined): Date | null {
  if (value === null || value === undefined) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

function twoDigits(value: number): string {
  return String(value).padStart(2, "0");
}

/**
 * "08:02" today, "yesterday 17:40", or "3 Oct, 08:00", in the phone's own time zone (the line renders on the
 * client only, so server and browser never disagree). Null for a missing or unreadable time.
 */
export function clockLabel(value: number | string | null | undefined, now: number): string | null {
  const date = validTime(value);
  const today = validTime(now);
  if (!date || !today) return null;
  const time = `${twoDigits(date.getHours())}:${twoDigits(date.getMinutes())}`;
  const sameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return time;
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (sameDay(date, yesterday)) return `yesterday ${time}`;
  return `${date.getDate()} ${MONTHS[date.getMonth()]}, ${time}`;
}

/** The line under the header: when the warehouse last changed stock (the picker's latest scan in the stock feed). */
export function pickerLine(stockAsOf: string | null | undefined, now: number): string {
  return `Picker last action · ${clockLabel(stockAsOf, now) ?? "unknown"}`;
}

/** The small line under "Offline": when this phone last heard from the server. */
export function updatedLine(lastOkAt: number | null, now: number): string {
  const label = clockLabel(lastOkAt, now);
  return label === null ? "Not updated yet" : `Updated ${label}`;
}

/** What a screen reader hears for the switch's state (its name stays "Online"). */
export function connectionDescription(state: ConnectionState, lastOkAt: number | null, now: number, workOffline: boolean): string {
  if (state === "checking") return "Checking the connection";
  if (state === "online") return "Network online";
  const label = clockLabel(lastOkAt, now);
  const when = label === null ? "not updated yet" : `last updated ${label}`;
  return workOffline ? `Working offline by choice, ${when}` : `Network offline, ${when}`;
}

/** The offline banner's sentence. */
export function offlineBannerText(lastOkAt: number | null, now: number): string {
  const label = clockLabel(lastOkAt, now);
  if (label === null) return "You're offline. Nothing on this screen has been confirmed yet.";
  return `You're offline. You're seeing data from ${label}. Don't treat it as current.`;
}

/** "Last synced 14:32", or that this phone has not synced yet. */
export function lastSyncedLine(lastSyncedAt: number | string | null | undefined, now: number): string {
  const label = clockLabel(lastSyncedAt, now);
  return label === null ? "Not synced on this phone yet" : `Last synced ${label}`;
}

/** A stored timestamp from localStorage. Junk reads as never. */
export function parseStoredTime(raw: string | null): number | null {
  if (raw === null || raw.trim() === "") return null;
  const value = Number(raw);
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** The health route's answer. Anything else counts as a failed check. */
export function parseHealth(body: unknown): { readonly stockAsOf: string | null } | null {
  if (typeof body !== "object" || body === null) return null;
  const record = body as Record<string, unknown>;
  if (record.status !== "ok") return null;
  const stockAsOf = typeof record.stockAsOf === "string" && validTime(record.stockAsOf) ? record.stockAsOf : null;
  return { stockAsOf };
}
