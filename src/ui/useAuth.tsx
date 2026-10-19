"use client";

import { useSyncExternalStore } from "react";
import { AUTH_CHANGED, readRole, readSignedIn, readUser, safeStorage, type Role } from "./auth";

/**
 * The sign-in as React state, for the gate, the greeting and Sign out. A thin layer: what it reads and writes is
 * the pure logic in auth.ts, which the unit tests cover.
 */
export function notifyAuth(): void {
  window.dispatchEvent(new Event(AUTH_CHANGED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(AUTH_CHANGED, onChange);
  // Another tab signing in or out.
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(AUTH_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

export function authStorage() {
  return safeStorage(() => window.localStorage);
}

/** The server renders signed out; CSS hides the cover before paint when the head script stamped signed in. */
export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, () => readSignedIn(document.documentElement, authStorage()), () => false);
}

/** The remembered username, or "" on the server and when there is none. */
export function useStoredUser(): string {
  return useSyncExternalStore(subscribe, () => readUser(authStorage()), () => "");
}

export function useStoredRole(): Role {
  return useSyncExternalStore(subscribe, () => readRole(authStorage()), (): Role => "team-leader");
}
