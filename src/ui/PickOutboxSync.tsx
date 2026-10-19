"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useConnection } from "./ConnectionBar";
import { announce, postDecision } from "./decisions/api-client";
import { PICKS } from "./messages";
import { afterSend, OUTBOX_CHANGED, outboxUrl, readOutbox, removeFromOutbox, waitingCounts } from "./pick-outbox";

function browserStorage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

export function notifyOutbox(): void {
  window.dispatchEvent(new Event(OUTBOX_CHANGED));
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(OUTBOX_CHANGED, onChange);
  window.addEventListener("storage", onChange);
  return () => {
    window.removeEventListener(OUTBOX_CHANGED, onChange);
    window.removeEventListener("storage", onChange);
  };
}

const NONE_WAITING = "0:0";

/**
 * How many reports and reviews for this site wait on this phone (AC 66, 71). None on the server. Read as one string
 * so the store hands React the same value until something changes.
 */
export function useWaiting(siteId: string): { readonly reports: number; readonly reviews: number } {
  const counted = useSyncExternalStore(
    subscribe,
    () => {
      const storage = browserStorage();
      if (!storage) return NONE_WAITING;
      const { reports, reviews } = waitingCounts(readOutbox(storage), siteId);
      return `${reports}:${reviews}`;
    },
    () => NONE_WAITING,
  );
  const [reports, reviews] = counted.split(":").map(Number);
  return { reports: reports ?? 0, reviews: reviews ?? 0 };
}

/**
 * Sends the pick reports and reviews waiting on this phone once it is online (AC 66, 71), oldest first, each with the
 * key it was saved with, so a resend after a lost answer is recorded once. Stops at the first one that still can't
 * get through and tries again at the next connection check. Renders nothing.
 */
export function PickOutboxSync() {
  const connection = useConnection();
  const sending = useRef(false);
  const { state, lastOkAt } = connection;

  useEffect(() => {
    if (state !== "online" || sending.current) return;
    const storage = browserStorage();
    if (!storage) return;
    const entries = readOutbox(storage);
    if (entries.length === 0) return;
    sending.current = true;
    void (async () => {
      let reports = 0;
      let reviews = 0;
      for (const entry of entries) {
        const next = afterSend(await postDecision(outboxUrl(entry), entry.key, entry.body));
        if (next === "keep") break;
        removeFromOutbox(storage, entry.key);
        if (next === "sent" && entry.type === "review") reviews += 1;
        else if (next === "sent") reports += 1;
      }
      sending.current = false;
      notifyOutbox();
      if (reports > 0 || reviews > 0) announce(PICKS.outboxSentAll(reports, reviews));
    })();
  }, [state, lastOkAt]);

  return null;
}
