"use client";

import Link from "next/link";
import { useState } from "react";
import { useConnection } from "./ConnectionBar";
import { announce, pickReviewUrl, postDecision } from "./decisions/api-client";
import { sitePath } from "./format";
import { Icon } from "./Icon";
import { apiErrorMessage, PICKS } from "./messages";
import { notifyOutbox } from "./PickOutboxSync";
import { addToOutbox, afterSend } from "./pick-outbox";
import { pickReportPath } from "./picks";
import styles from "./primitives.module.css";

type Outcome = { readonly state: "sent" | "queued" } | { readonly state: "failed"; readonly message: string } | null;

/**
 * The two answers of a review on site (AC 67 to 69, 71), as big green and red buttons for gloved hands. "Yes, it's
 * right" records the review at once with a new idempotency key; offline, or when the send gets no answer, it waits on
 * this phone with that key, like a report. "No, something's wrong" opens the report form on this line.
 */
export function PickReviewChoice({ siteId, lineId }: { siteId: string; lineId: string }) {
  const connection = useConnection();
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);

  async function right() {
    const key = crypto.randomUUID();
    const body = { lineId };
    const queue = () => {
      const saved = addToOutbox(window.localStorage, { key, siteId, body, savedAt: Date.now(), type: "review" });
      notifyOutbox();
      setOutcome(saved ? { state: "queued" } : { state: "failed", message: PICKS.reviewFailed });
    };
    if (connection.state !== "online") {
      queue();
      return;
    }
    setSending(true);
    const result = await postDecision(pickReviewUrl(siteId), key, body);
    setSending(false);
    const next = afterSend(result);
    if (next === "sent") {
      setOutcome({ state: "sent" });
      announce(PICKS.reviewSent);
    } else if (next === "keep") {
      queue();
    } else {
      setOutcome({ state: "failed", message: result.ok ? PICKS.reviewFailed : apiErrorMessage(result.code) });
    }
  }

  if (outcome && outcome.state !== "failed") {
    return (
      <div className={`${styles.banner} ${outcome.state === "sent" ? styles.success : styles.warning}`} role="status">
        <Icon name={outcome.state === "sent" ? "check" : "clock"} />
        <div className={styles.pickOutcome}>
          <p>
            <strong>{outcome.state === "sent" ? PICKS.reviewSent : PICKS.reviewQueued}</strong>
          </p>
          <Link className={`${styles.button} ${styles.fullWidth}`} href={sitePath(siteId)}>
            {PICKS.backToSite}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.reviewChoices}>
      <button type="button" className={`${styles.reviewChoice} ${styles.reviewRight}`} onClick={() => void right()} disabled={sending}>
        <Icon name="check" />
        <span className={styles.reviewChoiceText}>
          <span className={styles.reviewChoiceLabel}>{sending ? PICKS.reviewSending : PICKS.reviewRight}</span>
          <span className={styles.reviewChoiceHint}>{PICKS.reviewRightHint}</span>
        </span>
      </button>
      <Link className={`${styles.reviewChoice} ${styles.reviewWrong}`} href={pickReportPath(siteId, lineId, true)}>
        <Icon name="stop" />
        <span className={styles.reviewChoiceText}>
          <span className={styles.reviewChoiceLabel}>{PICKS.reviewWrong}</span>
          <span className={styles.reviewChoiceHint}>{PICKS.reviewWrongHint}</span>
        </span>
      </Link>
      {outcome?.state === "failed" ? (
        <p className={styles.reviewError} role="alert">
          {outcome.message}
        </p>
      ) : null}
    </div>
  );
}
