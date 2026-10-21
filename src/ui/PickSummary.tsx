"use client";

import Link from "next/link";
import { useId } from "react";
import { useConnection } from "./ConnectionBar";
import { clockLabel } from "./connection";
import { smsHref, telHref, type ContactView } from "./contacts";
import { formatRecordedAt } from "./format";
import { Icon } from "./Icon";
import { PICKS } from "./messages";
import { useWaiting } from "./PickOutboxSync";
import { heldSite, lineMoves, PICKUP, pickupPath, withPickups, type HeldInput } from "./pickups";
import { usePickups } from "./PickupStore";
import { useOperator } from "./SiteEdits";
import type { CheckedPickLine } from "@/domain";
import { crewGate, initials, pickAmountLine, pickEmailHref, pickLineAnchor, pickLineLabel, pickReviewPath, picksPath, reportFinding, type PickView } from "./picks";
import type { StatusView } from "./status";
import { StatusChip } from "./StatusChip";
import styles from "./primitives.module.css";

/** A time as the phone shows it once the connection has a clock; a fixed UTC stamp before, so server and browser agree. */
export function useStamp(iso: string | null): string | null {
  const { now } = useConnection();
  if (iso === null) return null;
  return now > 0 ? (clockLabel(iso, now) ?? formatRecordedAt(iso)) : formatRecordedAt(iso);
}

/**
 * The site screen's Picks section (AC 62, 63): the pick check's result, who picked with Call and Email, each
 * material planned against picked, reports waiting to send, and Send the crew, locked unless the picks match,
 * the site is clear and the phone is online. Offline, everything reads as last known. Pick-ups made on this device
 * are read first (AC 95): the moved quantities, and Blocked for a site that gave. A blocked site's rows each offer
 * Pick up from other sites beside Review (AC 92).
 */
export function PickSummary({
  siteId,
  siteName,
  view: upstream,
  site,
  operator,
  operatorText,
}: {
  siteId: string;
  siteName: string;
  /** Null when the pick system could not be read. */
  view: PickView | null;
  /** The site as the server read it, with its shortages; this device's pick-ups are applied to it (AC 95, 97). */
  site: HeldInput;
  /** The sample data's operator; the one a card changed on this device wins (AC 88). */
  operator: ContactView | undefined;
  /** The "you can go" message the crew is sent. */
  operatorText: string;
}) {
  const pickups = usePickups();
  const view = upstream ? { ...upstream, check: withPickups(siteId, upstream.check, pickups) } : null;
  const held = heldSite(site, pickups, null);
  const connection = useConnection();
  const phase = connection.state;
  const saved = phase === "offline";
  const waiting = useWaiting(siteId);
  const headingId = useId();
  const reasonId = useId();
  const savedAt = clockLabel(connection.lastOkAt ?? connection.pageLoadedAt, connection.now) ?? "unknown";
  const gate = crewGate(view ? view.check.status : "unavailable", held.crewStatus === "clear", phase);
  const chosen = useOperator(siteId, operator);
  const operatorTextHref = chosen ? smsHref(chosen.phone, operatorText) : null;
  const canSend = gate.enabled && operatorTextHref !== null;

  return (
    <section className={styles.section} aria-labelledby={headingId}>
      <h2 id={headingId}>{PICKS.heading}</h2>
      <PickStatus siteId={siteId} view={view} saved={saved} />
      {waiting.reports + waiting.reviews > 0 ? (
        <p className={styles.pickWaiting}>
          <Icon name="clock" />
          <span>
            <strong>{PICKS.waitingAll(waiting.reports, waiting.reviews)}</strong>
            <span className={styles.muted}>{PICKS.waitingText}</span>
          </span>
        </p>
      ) : null}
      {/* No pick list, nothing to call the picker about (a nothing-planned site offers no call at all, AC 57). */}
      {view?.picker && view.check.status !== "unknown" ? <PickerCard siteName={siteName} view={view} saved={saved} savedAt={savedAt} /> : null}
      {view && view.check.lines.length > 0 ? (
        <div className={styles.pickMaterials}>
          <p className={styles.pickEyebrow}>{saved ? PICKS.materialsSaved(savedAt) : PICKS.materials}</p>
          <ul className={styles.pickLines}>
            {view.check.lines.map((checked) => (
              <PickRow
                key={checked.line.id}
                siteId={siteId}
                checked={checked}
                saved={saved}
                moves={lineMoves(siteId, checked.line.id, pickups)}
                pickup={held.crewStatus === "blocked"}
              />
            ))}
          </ul>
        </div>
      ) : null}
      <div className={styles.crewGate}>
        {canSend ? (
          <a className={`${styles.button} ${styles.primary} ${styles.fullWidth}`} href={operatorTextHref} aria-describedby={reasonId}>
            {PICKS.sendCrew}
          </a>
        ) : (
          <button type="button" className={`${styles.button} ${styles.fullWidth}`} disabled aria-describedby={reasonId}>
            {PICKS.sendCrew}
          </button>
        )}
        <p id={reasonId} className={styles.muted}>
          {gate.enabled && operatorTextHref === null ? PICKS.noOperator : gate.reason}
        </p>
      </div>
    </section>
  );
}

/**
 * One material, planned against picked (AC 62, 67, 70). Its name opens its card on the Pick check page; its own
 * Review button opens the review on site, whatever the label, so a line the warehouse got "right" can still be
 * checked. Under the label: an open report from site, or when it was last checked right on site. A pick-up on this
 * device says how many came in or went out (AC 95); on a blocked site the row offers Pick up from other sites (AC 92).
 */
function PickRow({
  siteId,
  checked,
  saved,
  moves,
  pickup,
}: {
  siteId: string;
  checked: CheckedPickLine;
  saved: boolean;
  moves: { readonly pickedUp: number; readonly lent: number };
  pickup: boolean;
}) {
  const nameId = useId();
  const reportedAt = useStamp(checked.openReport?.createdAt ?? null);
  const checkedAt = useStamp(checked.checkedAt);
  const { line } = checked;
  return (
    <li className={styles.pickRow}>
      <Link className={styles.pickLine} href={`${picksPath(siteId)}#${pickLineAnchor(line.id)}`}>
        <span className={styles.pickLineText}>
          <span id={nameId} className={styles.materialName}>
            {line.materialName}
          </span>
          <span className={styles.muted}>{pickAmountLine(checked)}</span>
        </span>
      </Link>
      {moves.pickedUp > 0 ? (
        <p className={styles.pickRowNote} data-pickup-note="in">
          <Icon name="check" />
          <span>{PICKUP.fromOthers(moves.pickedUp)}</span>
        </p>
      ) : null}
      {moves.lent > 0 ? (
        <p className={`${styles.pickRowNote} ${styles.pickRowReported}`} data-pickup-note="out">
          <Icon name="stop" />
          <span>{PICKUP.lent(moves.lent)}</span>
        </p>
      ) : null}
      {checked.openReport && reportedAt ? (
        <p className={`${styles.pickRowNote} ${styles.pickRowReported}`}>
          <Icon name="stop" />
          <span>{PICKS.reportedOnSite(reportedAt, reportFinding(checked.openReport))}</span>
        </p>
      ) : null}
      {checked.checkedAt && checkedAt ? (
        <p className={styles.pickRowNote}>
          <Icon name="check" />
          <span>{PICKS.checkedOnSite(checkedAt)}</span>
        </p>
      ) : null}
      <div className={styles.pickRowActions}>
        <StatusChip status={pickLineLabel(checked.kind, saved)} />
        <Link className={`${styles.button} ${styles.pickReview}`} href={pickReviewPath(siteId, line.id)} aria-describedby={nameId}>
          {PICKS.reviewButton}
          <Icon name="chevron-right" />
        </Link>
        {pickup ? (
          <Link className={`${styles.button} ${styles.pickReview} ${styles.pickupButton}`} href={pickupPath(siteId, line.id)} aria-describedby={nameId}>
            {PICKUP.button}
            <Icon name="chevron-right" />
          </Link>
        ) : null}
      </div>
    </li>
  );
}

function PickStatus({ siteId, view, saved }: { siteId: string; view: PickView | null; saved: boolean }) {
  const check = view?.check;
  let status: StatusView;
  let text: string;
  let link: { readonly label: string; readonly primary: boolean } | null = null;
  if (!check) {
    status = { label: PICKS.noList, tone: "warning", icon: "warning" };
    text = PICKS.unavailable;
  } else if (check.status === "unknown") {
    status = { label: PICKS.noList, tone: "warning", icon: "warning" };
    text = PICKS.noListText;
  } else if (saved) {
    status = { label: PICKS.offlineHeading, tone: "warning", icon: "warning" };
    text = check.issueCount > 0 ? PICKS.offlineText(check.issueCount) : PICKS.offlineReadyText;
    link = { label: PICKS.offlineReview, primary: false };
  } else if (check.status === "not_ready") {
    status = { label: PICKS.notReady(check.issueCount), tone: "danger", icon: "stop" };
    text = check.lines.some((checked) => checked.kind === "reported") ? PICKS.notReadyReportedText : PICKS.notReadyText;
    link = { label: PICKS.review, primary: true };
  } else {
    status = { label: PICKS.ready, tone: "success", icon: "check" };
    text = PICKS.readyText;
    link = { label: PICKS.openCheck, primary: false };
  }
  return (
    <div className={`${styles.pickStatus} ${styles[status.tone]}`} data-pick-status={saved && check && check.status !== "unknown" ? "saved" : (check?.status ?? "unavailable")}>
      <p className={styles.pickStatusTitle}>
        <Icon name={status.icon} />
        <strong>{status.label}</strong>
      </p>
      <p>{text}</p>
      {link ? (
        <Link className={link.primary ? `${styles.button} ${styles.primary} ${styles.fullWidth}` : `${styles.button} ${styles.fullWidth}`} href={picksPath(siteId)}>
          {link.label}
          <Icon name="chevron-right" />
        </Link>
      ) : null}
    </div>
  );
}

function PickerCard({ siteName, view, saved, savedAt }: { siteName: string; view: PickView; saved: boolean; savedAt: string }) {
  const nameId = useId();
  const lastActionAt = useStamp(view.lastActionAt);
  const picker = view.picker!;
  return (
    <div className={styles.pickerCard}>
      <p className={styles.pickEyebrow}>{saved ? PICKS.pickedBySaved : PICKS.pickedBy}</p>
      <div className={styles.pickerRow}>
        <span className={styles.avatar} aria-hidden="true">
          {initials(picker.name)}
        </span>
        <div className={styles.pickerText}>
          <p id={nameId} className={styles.pickerName}>
            {picker.name} <span className={styles.muted}>{PICKS.sample}</span>
          </p>
          <p className={styles.muted}>{PICKS.pickerRole}</p>
          {view.lastAction && lastActionAt ? (
            <p>
              <strong>{PICKS.lastAction(view.lastAction, lastActionAt)}</strong>
            </p>
          ) : null}
          {saved ? <p className={styles.muted}>{PICKS.asKnownAt(savedAt)}</p> : null}
        </div>
      </div>
      <dl className={styles.pickerFacts}>
        <div>
          <dt>{PICKS.phone}</dt>
          <dd>{picker.phone}</dd>
        </div>
        {picker.email ? (
          <div>
            <dt>{PICKS.email}</dt>
            <dd>{picker.email}</dd>
          </div>
        ) : null}
      </dl>
      <div className={styles.siteCardActions}>
        <a className={styles.button} href={telHref(picker.phone)} aria-describedby={nameId}>
          {saved ? PICKS.callOffline : PICKS.call}
        </a>
        {picker.email ? (
          <a className={styles.button} href={pickEmailHref(picker.email, siteName)} aria-describedby={nameId}>
            {saved ? PICKS.emailOffline : PICKS.emailAction}
          </a>
        ) : null}
      </div>
    </div>
  );
}
