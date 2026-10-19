"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { useConnection } from "./ConnectionBar";
import { announce, pickReportUrl, postDecision } from "./decisions/api-client";
import { PICKS } from "./messages";
import { afterSend, OUTBOX_CHANGED, readOutbox, removeFromOutbox, waitingFor } from "./pick-outbox";

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

/** How many pick reports for this site wait on this phone (AC 66). None on the server. */
export function useWaitingReports(siteId: string): number {
  return useSyncExternalStore(
    subscribe,
    () => {
      const storage = browserStorage();
      return storage ? waitingFor(readOutbox(storage), siteId) : 0;
    },
    () => 0,
  );
}

/**
 * Sends the pick reports waiting on this phone once it is online (AC 66), oldest first, each with the key it was
 * saved with, so a resend after a lost answer is recorded once. Stops at the first one that still can't get
 * through and tries again at the next connection check. Renders nothing.
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
      let sent = 0;
      for (const entry of entries) {
        const next = afterSend(await postDecision(pickReportUrl(entry.siteId), entry.key, entry.body));
        if (next === "keep") break;
        removeFromOutbox(storage, entry.key);
        if (next === "sent") sent += 1;
      }
      sending.current = false;
      notifyOutbox();
      if (sent > 0) announce(PICKS.outboxSent(sent));
    })();
  }, [state, lastOkAt]);

  return null;
}
