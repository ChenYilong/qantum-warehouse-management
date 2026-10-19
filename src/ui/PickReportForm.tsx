"use client";

import Link from "next/link";
import { useId, useState, type FormEvent } from "react";
import type { PickReportKind, PickRequest } from "@/domain";
import { useConnection } from "./ConnectionBar";
import { announce, pickReportUrl, postDecision } from "./decisions/api-client";
import { apiErrorMessage, PICKS } from "./messages";
import { notifyOutbox } from "./PickOutboxSync";
import { addToOutbox, afterSend } from "./pick-outbox";
import { sitePath } from "./format";
import { parseAmount, picksPath, reportKinds } from "./picks";
import { useStamp } from "./PickSummary";
import { Button } from "./Button";
import { Icon } from "./Icon";
import dialogStyles from "./decisions/decisions.module.css";
import styles from "./primitives.module.css";

/** One line the report can be about, with what the form fills in when it is chosen. */
export interface ReportLine {
  readonly id: string;
  readonly name: string;
  readonly plannedQty: number;
  readonly pickedQty: number;
  readonly kind: PickReportKind;
  readonly missingPart: string;
}

const REQUESTS: readonly PickRequest[] = ["repick", "same_day"];

type Outcome = { readonly state: "sent" | "queued" } | { readonly state: "failed"; readonly message: string } | null;

function amountText(value: number): string {
  return Number.isFinite(value) && value >= 0 ? String(value) : "";
}

/**
 * Report a pick error (AC 65, 66), or what the site found on a review (AC 69). Online it is sent at once with a new
 * idempotency key; offline, or when the send gets no answer, it waits on this phone with that key and sends itself
 * once back online, never twice. From a review no kind is chosen for the leader: the site has to say what it found.
 */
export function PickReportForm({
  siteId,
  siteName,
  picker,
  lastAction,
  lastActionAt,
  lines,
  initialLineId,
  fromReview = false,
}: {
  siteId: string;
  siteName: string;
  picker: string | null;
  lastAction: string | null;
  lastActionAt: string | null;
  lines: readonly ReportLine[];
  initialLineId: string;
  /** Opened from a review on site (AC 69): what the site finds first, and no kind chosen. */
  fromReview?: boolean;
}) {
  const connection = useConnection();
  const ids = {
    planned: useId(),
    picked: useId(),
    affected: useId(),
    missing: useId(),
    note: useId(),
    line: useId(),
    photo: useId(),
    errors: useId(),
  };
  const start = lines.find((line) => line.id === initialLineId) ?? lines[0]!;
  const [lineId, setLineId] = useState(start.id);
  const [kind, setKind] = useState<PickReportKind | null>(fromReview ? null : start.kind);
  const [planned, setPlanned] = useState(amountText(start.plannedQty));
  const [picked, setPicked] = useState(amountText(start.pickedQty));
  const [affected, setAffected] = useState("");
  const [request, setRequest] = useState<PickRequest>("repick");
  const [missingPart, setMissingPart] = useState(start.missingPart);
  const [note, setNote] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [toPicker, setToPicker] = useState(true);
  const [toPurchasing, setToPurchasing] = useState(false);
  const [errors, setErrors] = useState<Partial<Record<"kind" | "planned" | "picked" | "affected" | "recipients", string>>>({});
  const [sending, setSending] = useState(false);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const lastActionLabel = useStamp(lastActionAt);

  function chooseLine(id: string) {
    const line = lines.find((item) => item.id === id);
    if (!line) return;
    setLineId(line.id);
    // From a review the site says what it found; a line's computed issue never answers for it.
    if (!fromReview) setKind(line.kind);
    setPlanned(amountText(line.plannedQty));
    setPicked(amountText(line.pickedQty));
    setMissingPart(line.missingPart);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    const plannedQty = parseAmount(planned);
    const pickedQty = parseAmount(picked);
    const affectedQty = parseAmount(affected);
    const found: typeof errors = {};
    if (kind === null) found.kind = PICKS.chooseKind;
    if (plannedQty === "bad") found.planned = PICKS.badAmount;
    if (pickedQty === "bad") found.picked = PICKS.badAmount;
    if (affectedQty === "bad") found.affected = PICKS.badAmount;
    if (!toPicker && !toPurchasing) found.recipients = PICKS.noRecipient;
    setErrors(found);
    if (Object.keys(found).length > 0 || kind === null || plannedQty === "bad" || pickedQty === "bad" || affectedQty === "bad") return;

    const key = crypto.randomUUID();
    const body = {
      kind,
      lineId,
      plannedQty,
      pickedQty,
      affectedQty,
      request,
      missingPart: missingPart.trim(),
      note: note.trim(),
      sendToPicker: toPicker,
      sendToPurchasing: toPurchasing,
      photoAttached: photo !== null,
    };
    const queue = () => {
      const saved = addToOutbox(window.localStorage, { key, siteId, body, savedAt: Date.now() });
      notifyOutbox();
      setOutcome(saved ? { state: "queued" } : { state: "failed", message: PICKS.failed });
    };
    if (connection.state !== "online") {
      queue();
      return;
    }
    setSending(true);
    const result = await postDecision(pickReportUrl(siteId), key, body);
    setSending(false);
    const next = afterSend(result);
    if (next === "sent") {
      setOutcome({ state: "sent" });
      announce(PICKS.sent);
    } else if (next === "keep") {
      // No answer, or the server could not take it now: it waits on the phone with this key and resends itself.
      queue();
    } else {
      setOutcome({ state: "failed", message: result.ok ? PICKS.failed : apiErrorMessage(result.code) });
    }
  }

  if (outcome && outcome.state !== "failed") {
    return (
      <div className={`${styles.banner} ${outcome.state === "sent" ? styles.success : styles.warning}`} role="status">
        <Icon name={outcome.state === "sent" ? "check" : "clock"} />
        <div className={styles.pickOutcome}>
          <p>
            <strong>{outcome.state === "sent" ? PICKS.sent : PICKS.queued}</strong>
          </p>
          <p>{fromReview ? PICKS.reportFromSiteFooter : PICKS.footer}</p>
          <Link className={`${styles.button} ${styles.fullWidth}`} href={fromReview ? sitePath(siteId) : picksPath(siteId)}>
            {fromReview ? PICKS.backToSite : PICKS.backToCheck}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      <p>{PICKS.reportTo(siteName, picker)}</p>
      {picker && lastAction && lastActionLabel ? (
        <p>
          <strong>{PICKS.pickerLastAction(picker.split(" ")[0]!, lastAction, lastActionLabel)}</strong>
        </p>
      ) : null}
      <form className={dialogStyles.form} noValidate onSubmit={(event) => void onSubmit(event)} aria-describedby={outcome ? ids.errors : undefined}>
        <fieldset className={styles.choiceGroup} aria-describedby={errors.kind ? `${ids.errors}-kind` : undefined}>
          <legend className={dialogStyles.label}>{fromReview ? PICKS.whatsFound : PICKS.whatsWrong}</legend>
          {reportKinds(fromReview).map((choice) => (
            <label key={choice} className={styles.choiceRow}>
              <input type="radio" name="kind" value={choice} checked={kind === choice} onChange={() => setKind(choice)} />
              <span className={styles.choiceMark} aria-hidden="true" />
              <span>{PICKS.kinds[choice]}</span>
            </label>
          ))}
          {errors.kind ? (
            <p id={`${ids.errors}-kind`} className={dialogStyles.fieldError} role="alert">
              {errors.kind}
            </p>
          ) : null}
        </fieldset>

        <div className={dialogStyles.field}>
          <label className={dialogStyles.label} htmlFor={ids.line}>
            {PICKS.material}
          </label>
          <select id={ids.line} className={dialogStyles.control} value={lineId} onChange={(event) => chooseLine(event.target.value)}>
            {lines.map((line) => (
              <option key={line.id} value={line.id}>
                {line.name}
              </option>
            ))}
          </select>
        </div>

        <div className={styles.amountPair}>
          <div className={dialogStyles.field}>
            <label className={dialogStyles.label} htmlFor={ids.planned}>
              {PICKS.plannedQty}
            </label>
            <input
              id={ids.planned}
              className={dialogStyles.control}
              inputMode="numeric"
              value={planned}
              onChange={(event) => setPlanned(event.target.value)}
              aria-invalid={errors.planned ? true : undefined}
              aria-describedby={errors.planned ? `${ids.planned}-error` : undefined}
            />
            {errors.planned ? (
              <p id={`${ids.planned}-error`} className={dialogStyles.fieldError} role="alert">
                {errors.planned}
              </p>
            ) : null}
          </div>
          <div className={dialogStyles.field}>
            <label className={dialogStyles.label} htmlFor={ids.picked}>
              {PICKS.pickedQty}
            </label>
            <input
              id={ids.picked}
              className={dialogStyles.control}
              inputMode="numeric"
              value={picked}
              onChange={(event) => setPicked(event.target.value)}
              aria-invalid={errors.picked ? true : undefined}
              aria-describedby={errors.picked ? `${ids.picked}-error` : undefined}
            />
            {errors.picked ? (
              <p id={`${ids.picked}-error`} className={dialogStyles.fieldError} role="alert">
                {errors.picked}
              </p>
            ) : null}
          </div>
        </div>

        <div className={dialogStyles.field}>
          <label className={dialogStyles.label} htmlFor={ids.affected}>
            {PICKS.affectedQty}
          </label>
          <input
            id={ids.affected}
            className={dialogStyles.control}
            inputMode="numeric"
            value={affected}
            onChange={(event) => setAffected(event.target.value)}
            aria-invalid={errors.affected ? true : undefined}
            aria-describedby={errors.affected ? `${ids.affected}-error` : undefined}
          />
          {errors.affected ? (
            <p id={`${ids.affected}-error`} className={dialogStyles.fieldError} role="alert">
              {errors.affected}
            </p>
          ) : null}
        </div>

        <fieldset className={styles.choiceGroup}>
          <legend className={dialogStyles.label}>{PICKS.whatsNeeded}</legend>
          {REQUESTS.map((choice) => (
            <label key={choice} className={styles.choiceRow}>
              <input type="radio" name="request" value={choice} checked={request === choice} onChange={() => setRequest(choice)} />
              <span className={styles.choiceMark} aria-hidden="true" />
              <span>{PICKS.requests[choice]}</span>
            </label>
          ))}
        </fieldset>

        <div className={dialogStyles.field}>
          <label className={dialogStyles.label} htmlFor={ids.missing}>
            {PICKS.missingPart}
          </label>
          <input id={ids.missing} className={dialogStyles.control} maxLength={120} value={missingPart} onChange={(event) => setMissingPart(event.target.value)} />
        </div>

        <div className={dialogStyles.field}>
          <label className={dialogStyles.label} htmlFor={ids.note}>
            {PICKS.note}
          </label>
          <textarea id={ids.note} className={dialogStyles.control} rows={3} maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
        </div>

        <label className={styles.photoButton} htmlFor={ids.photo}>
          <input
            id={ids.photo}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={(event) => setPhoto(event.target.files?.[0]?.name ?? null)}
          />
          <span>{PICKS.photo}</span>
        </label>
        {photo ? <p className={styles.muted}>{PICKS.photoAdded(photo)}</p> : null}

        <fieldset className={styles.choiceGroup} aria-describedby={errors.recipients ? `${ids.errors}-recipients` : undefined}>
          <legend className={dialogStyles.label}>{PICKS.sendTo}</legend>
          <label className={styles.choiceRow}>
            <input type="checkbox" checked={toPicker} onChange={(event) => setToPicker(event.target.checked)} />
            <span className={`${styles.choiceMark} ${styles.choiceBox}`} aria-hidden="true" />
            <span>{picker ? PICKS.toPicker(picker) : PICKS.toPickerUnnamed}</span>
          </label>
          <label className={styles.choiceRow}>
            <input type="checkbox" checked={toPurchasing} onChange={(event) => setToPurchasing(event.target.checked)} />
            <span className={`${styles.choiceMark} ${styles.choiceBox}`} aria-hidden="true" />
            <span>{PICKS.toPurchasing}</span>
          </label>
          {errors.recipients ? (
            <p id={`${ids.errors}-recipients`} className={dialogStyles.fieldError} role="alert">
              {errors.recipients}
            </p>
          ) : null}
        </fieldset>

        <div className={`${styles.banner} ${styles.warning}`}>
          <Icon name="clock" />
          <p>{PICKS.offlineNote}</p>
        </div>

        {outcome?.state === "failed" ? (
          <p id={ids.errors} className={dialogStyles.fieldError} role="alert">
            {outcome.message}
          </p>
        ) : null}
        <Button type="submit" className={`${styles.primary} ${styles.fullWidth}`} disabled={sending}>
          {sending ? PICKS.sending : PICKS.send}
        </Button>
        <p className={styles.muted}>{fromReview ? PICKS.reportFromSiteFooter : PICKS.footer}</p>
      </form>
    </>
  );
}
