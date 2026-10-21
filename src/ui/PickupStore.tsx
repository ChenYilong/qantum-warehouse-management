"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { parsePickups, PICKUPS_CHANGED, PICKUPS_KEY, readPickups, writePickups, type Pickups } from "./pickups";

/**
 * Pick-ups made on this device (AC 94, 95). The rules are in `pickups.ts`; this file subscribes to localStorage.
 * The server renders the sample data; the browser's own copy replaces it as the page starts, and every card and
 * screen on the page follows a save at once.
 */

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === PICKUPS_KEY) onChange();
  };
  window.addEventListener(PICKUPS_CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(PICKUPS_CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(): string {
  try {
    return storage()?.getItem(PICKUPS_KEY) ?? "";
  } catch {
    return "";
  }
}

/** This device's pick-ups, or none on the server and before the page starts. */
export function usePickups(): Pickups {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => parsePickups(raw || null), [raw]);
}

/** Saves a change to the store; false when the browser refuses, so nothing is shown as changed. */
export function savePickups(update: (pickups: Pickups) => Pickups): boolean {
  const store = storage();
  const saved = writePickups(store, update(readPickups(store)));
  if (saved) window.dispatchEvent(new Event(PICKUPS_CHANGED));
  return saved;
}

/** On the pick-up page: the material each ticked site would give, by site id. Empty everywhere else. */
export const TickedContext = createContext<Readonly<Record<string, string>>>({});

/** The material this site would give while it is ticked, or null. */
export function useTicked(siteId: string): string | null {
  return useContext(TickedContext)[siteId] ?? null;
}
