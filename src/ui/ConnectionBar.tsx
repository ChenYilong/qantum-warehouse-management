"use client";

import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { announce } from "./decisions/api-client";
import { Button } from "./Button";
import { Icon } from "./Icon";
import {
  clockLabel,
  connectionDescription,
  connectionState,
  HEALTH_INTERVAL_MS,
  LAST_SYNCED_KEY,
  lastSyncedLine,
  offlineBannerText,
  parseHealth,
  parseStoredTime,
  pickerLine,
  updatedLine,
  WORK_OFFLINE_KEY,
  type ConnectionState,
} from "./connection";
import { CONNECTION } from "./messages";
import styles from "./primitives.module.css";
import dialogStyles from "./decisions/decisions.module.css";

interface Facts {
  readonly browserOnline: boolean;
  readonly workOffline: boolean;
  readonly lastOkAt: number | null;
  readonly lastFailAt: number | null;
  readonly stockAsOf: string | null;
  readonly lastSyncedAt: number | null;
  readonly pageLoadedAt: number | null;
  readonly now: number;
  readonly syncing: boolean;
}

/** What the server renders, and what the browser shows until its first check answers: Checking, never Online. */
const SERVER_FACTS: Facts = {
  browserOnline: true,
  workOffline: false,
  lastOkAt: null,
  lastFailAt: null,
  stockAsOf: null,
  lastSyncedAt: null,
  pageLoadedAt: null,
  now: 0,
  syncing: false,
};

let facts: Facts = SERVER_FACTS;
const listeners = new Set<() => void>();
let stopWatching: (() => void) | null = null;

function stateOf(value: Facts): ConnectionState {
  return connectionState(value);
}

function update(patch: Partial<Facts>): void {
  const before = stateOf(facts);
  facts = { ...facts, ...patch };
  const after = stateOf(facts);
  // Only real changes are announced: never the first answer, and never a check that changes nothing.
  if (before !== "checking" && after !== "checking" && before !== after) {
    announce(after === "online" ? CONNECTION.backOnline : CONNECTION.wentOffline);
  }
  for (const listener of listeners) listener();
}

function readStorage(storage: () => Storage, key: string): string | null {
  try {
    return storage().getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(storage: () => Storage, key: string, value: string | null): void {
  try {
    if (value === null) storage().removeItem(key);
    else storage().setItem(key, value);
  } catch {
    // Blocked storage: the choice or time lasts until the page reloads.
  }
}

const session = () => window.sessionStorage;
const local = () => window.localStorage;

/** Asks the server whether it is there. A non-ok answer, junk, or no answer at all is a failed check. */
async function check(): Promise<boolean> {
  try {
    const response = await fetch("/api/health", { cache: "no-store" });
    const parsed = response.ok ? parseHealth(await response.json()) : null;
    const at = Date.now();
    if (parsed) {
      update({ lastOkAt: at, stockAsOf: parsed.stockAsOf, now: at });
      return true;
    }
    update({ lastFailAt: at, now: at });
    return false;
  } catch {
    const at = Date.now();
    update({ lastFailAt: at, now: at });
    return false;
  }
}

function startWatching(): () => void {
  const loaded = Date.now();
  update({
    browserOnline: navigator.onLine,
    workOffline: readStorage(session, WORK_OFFLINE_KEY) === "1",
    lastSyncedAt: parseStoredTime(readStorage(local, LAST_SYNCED_KEY)),
    pageLoadedAt: loaded,
    now: loaded,
  });
  void check();
  const timer = window.setInterval(() => {
    if (facts.workOffline) update({ now: Date.now() });
    else void check();
  }, HEALTH_INTERVAL_MS);
  const goOnline = () => {
    update({ browserOnline: true, now: Date.now() });
    if (!facts.workOffline) void check();
  };
  const goOffline = () => update({ browserOnline: false, now: Date.now() });
  const shown = () => {
    if (document.visibilityState === "visible" && !facts.workOffline) void check();
  };
  window.addEventListener("online", goOnline);
  window.addEventListener("offline", goOffline);
  document.addEventListener("visibilitychange", shown);
  return () => {
    window.clearInterval(timer);
    window.removeEventListener("online", goOnline);
    window.removeEventListener("offline", goOffline);
    document.removeEventListener("visibilitychange", shown);
  };
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (stopWatching === null) stopWatching = startWatching();
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && stopWatching !== null) {
      stopWatching();
      stopWatching = null;
    }
  };
}

export interface Connection extends Facts {
  readonly state: ConnectionState;
  /** On asks the server first; it stays off, and says so, when the server can't be reached. */
  setOnline(on: boolean): Promise<void>;
  /** Reaches the server, refreshes this screen and stamps the sync time. Offline, nothing is sent. */
  syncNow(): Promise<void>;
}

/**
 * The connection (AC 48), for the header's switch and for anything that sends. Online needs the browser's network
 * flag, a health check that answered, and the person not having switched Online off. Checks every 30 seconds, when
 * the network returns and when the tab is shown again.
 */
export function useConnection(): Connection {
  const router = useRouter();
  const current = useSyncExternalStore(subscribe, () => facts, () => SERVER_FACTS);

  const setOnline = useCallback(
    async (on: boolean) => {
      if (!on) {
        writeStorage(session, WORK_OFFLINE_KEY, "1");
        update({ workOffline: true, now: Date.now() });
        return;
      }
      // Ask first: the switch shows Online only after the server answers, never on the tap alone.
      const reached = await check();
      writeStorage(session, WORK_OFFLINE_KEY, null);
      update({ workOffline: false });
      if (reached) router.refresh();
      else announce(CONNECTION.stillOffline);
    },
    [router],
  );

  const syncNow = useCallback(async () => {
    update({ syncing: true });
    const reached = await check();
    // Sync now also ends working offline, so the regular checks resume either way.
    writeStorage(session, WORK_OFFLINE_KEY, null);
    if (reached) {
      const at = Date.now();
      writeStorage(local, LAST_SYNCED_KEY, String(at));
      update({ workOffline: false, lastSyncedAt: at, pageLoadedAt: at, syncing: false });
      router.refresh();
      announce(CONNECTION.synced);
      return;
    }
    update({ workOffline: false, syncing: false });
    announce(CONNECTION.stillOffline);
  }, [router]);

  return { ...current, state: stateOf(current), setOnline, syncNow };
}

/**
 * The Online switch in every screen's header (AC 48, AC 58), where the theme choice used to be. The header stays at
 * the top while the page scrolls, so the connection is always in sight. Off reads "Offline" with when this phone
 * last heard from the server. The switch is real: off means "work offline", so decisions are not sent until it is
 * on again.
 */
export function ConnectionSwitch() {
  const connection = useConnection();
  const descriptionId = useId();
  const { state, lastOkAt, now, workOffline } = connection;
  const on = state === "online";
  const label = state === "checking" ? CONNECTION.checking : on ? CONNECTION.online : CONNECTION.offline;
  return (
    <div className={styles.connectionControl} data-connection={state}>
      <span className={styles.connectionText} aria-hidden="true">
        <span className={styles.connectionLabel}>{label}</span>
        {state === "offline" ? <span className={styles.connectionUpdated}>{updatedLine(lastOkAt, now)}</span> : null}
      </span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={CONNECTION.online}
        aria-describedby={descriptionId}
        className={styles.connectionSwitch}
        disabled={state === "checking"}
        onClick={() => void connection.setOnline(!on)}
      >
        <span className={styles.connectionKnob} />
      </button>
      <span id={descriptionId} className={styles.srOnly}>
        {connectionDescription(state, lastOkAt, now, workOffline)}
      </span>
    </div>
  );
}

/** The picker's last action (AC 48): the first line under the header. It scrolls with the page; the switch does not. */
export function PickerLine() {
  const connection = useConnection();
  return <p className={styles.pickerLine}>{pickerLine(connection.stockAsOf, connection.now)}</p>;
}

/**
 * Offline (G2, G3): a bar fixed to the foot of the screen with the age of what is shown, and Offline details:
 * when the phone was last online, when this screen and the stock figures are from, and Sync now with the last
 * sync time.
 */
export function OfflineBanner() {
  const connection = useConnection();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  // The dialog belongs to one offline spell, keyed by the last time the server answered. Coming back online
  // removes it; going offline again later starts closed instead of reopening by itself.
  const episode = connection.lastOkAt ?? 0;
  const [openEpisode, setOpenEpisode] = useState<number | null>(null);
  const offline = connection.state === "offline";
  const open = openEpisode === episode;

  useEffect(() => {
    const dialog = dialogRef.current;
    if (open && offline && dialog && !dialog.open) dialog.showModal();
  }, [open, offline]);

  if (!offline) return null;
  const { lastOkAt, now, pageLoadedAt, stockAsOf, lastSyncedAt, syncing } = connection;
  return (
    <div className={styles.offlineBanner} role="region" aria-label={CONNECTION.offlineRegion}>
      <Icon name="warning" />
      <p>{offlineBannerText(lastOkAt, now)}</p>
      <Button type="button" onClick={() => setOpenEpisode(episode)}>
        {CONNECTION.details}
      </Button>
      <dialog ref={dialogRef} className={dialogStyles.dialog} aria-labelledby={titleId} onClose={() => setOpenEpisode(null)}>
        <h2 id={titleId} className={dialogStyles.dialogTitle}>
          {CONNECTION.detailsTitle}
        </h2>
        <div className={dialogStyles.form}>
          <dl className={styles.connectionFacts}>
            <div>
              <dt>{CONNECTION.lastOnline}</dt>
              <dd>{clockLabel(lastOkAt, now) ?? CONNECTION.notYet}</dd>
            </div>
            <div>
              <dt>{CONNECTION.pageFrom}</dt>
              <dd>{clockLabel(pageLoadedAt, now) ?? CONNECTION.notYet}</dd>
            </div>
            <div>
              <dt>{CONNECTION.stockFrom}</dt>
              <dd>{clockLabel(stockAsOf, now) ?? CONNECTION.unknown}</dd>
            </div>
            <div>
              <dt>{CONNECTION.waiting}</dt>
              <dd>{CONNECTION.nothingWaiting}</dd>
            </div>
          </dl>
          <p className={styles.muted}>{lastSyncedLine(lastSyncedAt, now)}</p>
          <div className={dialogStyles.actions}>
            <Button type="button" className={styles.primary} disabled={syncing} onClick={() => void connection.syncNow()}>
              {syncing ? CONNECTION.syncing : CONNECTION.syncNow}
            </Button>
            <Button type="button" onClick={() => dialogRef.current?.close()}>
              {CONNECTION.close}
            </Button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
