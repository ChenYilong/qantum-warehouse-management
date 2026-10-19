"use client";

import { useSyncExternalStore } from "react";
import { AUTH_CHANGED, isSignedIn, readRole, readUser, type Role } from "./auth";

/** Tells every part of the page that reads the sign-in (the gate, the greeting) that it changed. */
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

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Signed in, as stamped on <html>. The server renders signed out; CSS hides the gate before paint when it is not. */
export function useSignedIn(): boolean {
  return useSyncExternalStore(subscribe, () => isSignedIn(document.documentElement), () => false);
}

/** The remembered username, or "" on the server and when there is none. */
export function useStoredUser(): string {
  return useSyncExternalStore(
    subscribe,
    () => {
      const store = storage();
      return store ? readUser(store) : "";
    },
    () => "",
  );
}

export function useStoredRole(): Role {
  return useSyncExternalStore(
    subscribe,
    () => {
      const store = storage();
      return store ? readRole(store) : "team-leader";
    },
    (): Role => "team-leader",
  );
}

export function authStorage(): Storage {
  return (
    storage() ?? {
      length: 0,
      clear: () => {},
      key: () => null,
      getItem: () => null,
      setItem: () => {},
      removeItem: () => {},
    }
  );
}
