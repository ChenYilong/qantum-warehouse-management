"use client";

import { useMemo, useRef, useState, useSyncExternalStore, type ReactNode, type RefObject } from "react";
import { CALENDAR, localDate, monthOf, monthTitle, monthWeeks, shiftMonth, type Month } from "./calendar";
import { MiniKnob } from "./MiniKnob";
import { ACTION_NEEDED } from "./action-needed";
import { contactRoles, smsHref, SITE_ACTIONS, telHref, type ContactView } from "./contacts";
import { DEADLINE, deadlineOf } from "./deadline";
import dialogStyles from "./decisions/decisions.module.css";
import { Icon } from "./Icon";
import { OperatorRow } from "./OperatorRow";
import type { SignalView, SignalTone } from "./signal";
import {
  effectiveDate,
  effectiveOperator,
  readSiteEdits,
  sameContact,
  SITE_EDITS,
  SITE_EDITS_CHANGED,
  SITE_EDITS_KEY,
  withDeadline,
  withOperator,
  writeSiteEdits,
  type SiteEdits,
} from "./site-edits";
import styles from "./primitives.module.css";

/**
 * A card's schedule as the leader changed it on this device (AC 86, 87). The rules and words are in `site-edits.ts`;
 * this file subscribes to localStorage and draws the two dialogs. The server renders the sample data's values; the
 * browser's own change replaces them as the page starts, and every card on the page follows a save at once.
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
    if (event.key === null || event.key === SITE_EDITS_KEY) onChange();
  };
  window.addEventListener(SITE_EDITS_CHANGED, onChange);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(SITE_EDITS_CHANGED, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

function readRaw(): string {
  try {
    return storage()?.getItem(SITE_EDITS_KEY) ?? "";
  } catch {
    return "";
  }
}

/** This device's changes, or none on the server and before the page starts. */
export function useSiteEdits(): SiteEdits {
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  return useMemo(() => (raw ? readSiteEdits({ getItem: () => raw, setItem: () => undefined }) : {}), [raw]);
}

function save(update: (edits: SiteEdits) => SiteEdits): boolean {
  const store = storage();
  const saved = writeSiteEdits(store, update(readSiteEdits(store)));
  if (saved) window.dispatchEvent(new Event(SITE_EDITS_CHANGED));
  return saved;
}

type DialogRef = RefObject<HTMLDialogElement | null>;

function showDialog(ref: DialogRef): void {
  const dialog = ref.current;
  if (dialog && !dialog.open) dialog.showModal();
}

function closeDialog(ref: DialogRef): void {
  const dialog = ref.current;
  if (dialog?.open) dialog.close();
}

/** The pop-up after Confirm: what changed, and OK. Native `<dialog>`, so focus goes back to the row on close. */
function Notice({ id, dialogRef, message }: { id: string; dialogRef: DialogRef; message: string }) {
  return (
    <dialog ref={dialogRef} className={dialogStyles.dialog} role="alertdialog" aria-labelledby={id} data-edit-notice="">
      <div className={dialogStyles.form}>
        <p id={id} className={styles.editNotice}>
          {message}
        </p>
        <div className={styles.editNoticeActions}>
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => closeDialog(dialogRef)}>
            {SITE_EDITS.done}
          </button>
        </div>
      </div>
    </dialog>
  );
}

/** Cancel top left, the title, Confirm top right. */
function EditHead({ titleId, title, onCancel, onConfirm }: { titleId: string; title: string; onCancel: () => void; onConfirm: () => void }) {
  return (
    <div className={styles.editHead}>
      <button type="button" className={styles.button} onClick={onCancel}>
        {SITE_EDITS.cancel}
      </button>
      <h2 id={titleId} className={`${dialogStyles.dialogTitle} ${styles.editTitle}`}>
        {title}
      </h2>
      <button type="button" className={`${styles.button} ${styles.primary}`} onClick={onConfirm}>
        {SITE_EDITS.confirm}
      </button>
    </div>
  );
}

const TONE_CLASS: Readonly<Record<SignalTone, string>> = {
  go: styles.signalGo!,
  stop: styles.signalStop!,
  unknown: styles.signalUnknown!,
  idle: styles.signalIdle!,
};

const subscribeToNothing = () => () => undefined;
const readToday = () => localDate(new Date());
const readNoDay = () => "";

/**
 * The card's last line, "Deadline · Fri 23 Oct 2026", as a button (AC 86). It opens this project's own month: the
 * calendar tab's grid holding only this project, its oval on its deadline. A tap on another day picks it; Confirm
 * keeps it on this device and says so, Cancel leaves the deadline as it was.
 */
export function SiteDeadline({
  siteId,
  siteName,
  upstream,
  signal,
  idBase,
  describedBy,
}: {
  siteId: string;
  siteName: string;
  upstream: string;
  signal: SignalView;
  idBase: string;
  describedBy: string;
}) {
  const edits = useSiteEdits();
  const today = useSyncExternalStore(subscribeToNothing, readToday, readNoDay);
  const current = deadlineOf(effectiveDate(edits, siteId, upstream)) ?? deadlineOf(upstream);
  const [picked, setPicked] = useState(current?.iso ?? "");
  const [month, setMonth] = useState<Month | null>(null);
  const [message, setMessage] = useState("");
  const editor = useRef<HTMLDialogElement>(null);
  const notice = useRef<HTMLDialogElement>(null);
  if (!current) return null;
  const chosen = deadlineOf(picked) ?? current;
  const shown = month ?? monthOf(chosen.iso);
  const titleId = `${idBase}-deadline-title`;
  const monthId = `${idBase}-deadline-month`;

  const open = () => {
    setPicked(current.iso);
    setMonth(monthOf(current.iso));
    showDialog(editor);
  };
  const confirm = () => {
    const saved = save((all) => withDeadline(all, siteId, chosen.iso));
    closeDialog(editor);
    setMessage(saved ? `${SITE_EDITS.deadlineUpdated(siteName, chosen.text)} ${SITE_EDITS.savedHere}` : SITE_EDITS.notSaved);
    showDialog(notice);
  };

  return (
    <>
      <dialog ref={editor} className={`${dialogStyles.dialog} ${styles.editDialog}`} aria-labelledby={titleId} data-edit-dialog="deadline">
        <div className={dialogStyles.form}>
          <EditHead titleId={titleId} title={SITE_EDITS.deadlineTitle} onCancel={() => closeDialog(editor)} onConfirm={confirm} />
          <div className={styles.editFacts}>
            <p>
              <strong>{siteName}</strong>
            </p>
            <p>
              {`${DEADLINE.label} · `}
              <time dateTime={current.iso}>{current.text}</time>
            </p>
            <p aria-live="polite" data-edit-picked="">
              {chosen.iso === current.iso ? (
                SITE_EDITS.hint
              ) : (
                <>
                  {`${SITE_EDITS.newDeadline} · `}
                  <strong>{chosen.text}</strong>
                </>
              )}
            </p>
          </div>
          <div className={styles.calendarHead}>
            <button type="button" className={styles.calendarStep} aria-label={CALENDAR.previous} onClick={() => shown && setMonth(shiftMonth(shown, -1))}>
              <Icon name="chevron-left" />
            </button>
            <h3 id={monthId} className={styles.calendarTitle} aria-live="polite">
              {shown ? monthTitle(shown) : null}
            </h3>
            <button type="button" className={styles.calendarStep} aria-label={CALENDAR.next} onClick={() => shown && setMonth(shiftMonth(shown, 1))}>
              <Icon name="chevron-right" />
            </button>
          </div>
          {shown ? (
            <table className={`${styles.calendarGrid} ${styles.editGrid}`} aria-labelledby={monthId}>
              <thead>
                <tr>
                  {CALENDAR.weekdays.map(([short, long]) => (
                    <th key={short} scope="col" abbr={long}>
                      {short}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {monthWeeks(shown).map((week) => (
                  <tr key={week[0]?.iso}>
                    {week.map((day) => {
                      const isCurrent = day.iso === current.iso;
                      const label = `${deadlineOf(day.iso)?.text ?? day.iso}${isCurrent ? `, ${SITE_EDITS.currentDeadline}` : ""}`;
                      return (
                        <td key={day.iso} data-date={day.iso} data-today-date={day.iso === today ? "" : undefined}>
                          {day.inMonth ? (
                            <button
                              type="button"
                              className={styles.editDay}
                              aria-pressed={day.iso === chosen.iso}
                              aria-label={label}
                              data-edit-day={day.iso}
                              onClick={() => setPicked(day.iso)}
                            >
                              <span className={styles.calendarDay}>{day.day}</span>
                              {isCurrent ? (
                                <span className={`${styles.calendarOval} ${TONE_CLASS[signal.tone]}`} data-oval="" data-tone={signal.tone} data-knob={signal.knob} aria-hidden="true">
                                  <MiniKnob shape={signal.shape} />
                                </span>
                              ) : null}
                            </button>
                          ) : null}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </div>
      </dialog>
      <Notice id={`${idBase}-deadline-notice`} dialogRef={notice} message={message} />
      <button type="button" className={styles.siteDeadline} data-deadline={siteId} aria-haspopup="dialog" aria-describedby={describedBy} onClick={open}>
        <Icon name="calendar" />
        <span>
          {`${DEADLINE.label} · `}
          <time dateTime={current.iso}>{current.text}</time>
        </span>
        <Icon name="chevron-right" />
      </button>
    </>
  );
}

/**
 * "Operator · Mere Tane" as a button (AC 87), then Text operator and Call operator, all for the operator this device
 * chose. The list offers every operator and picker in the sample data with the current one ticked; Confirm with
 * someone else keeps the change on this device and says so, Confirm with the same person just closes.
 */
export function SiteOperator({
  siteId,
  siteName,
  upstream,
  text,
  candidates,
  idBase,
  nameId,
  describedBy,
}: {
  siteId: string;
  siteName: string;
  upstream: ContactView;
  text: string;
  candidates: readonly ContactView[];
  idBase: string;
  nameId: string;
  describedBy: string;
}) {
  const edits = useSiteEdits();
  const current = effectiveOperator(edits, siteId, upstream) ?? upstream;
  const people = candidates.some((person) => sameContact(person, current)) ? candidates : [current, ...candidates];
  const [picked, setPicked] = useState(0);
  const [message, setMessage] = useState("");
  const editor = useRef<HTMLDialogElement>(null);
  const notice = useRef<HTMLDialogElement>(null);
  const titleId = `${idBase}-operator-title`;
  const indexOf = (person: ContactView) => Math.max(0, people.findIndex((known) => sameContact(known, person)));

  const open = () => {
    setPicked(indexOf(current));
    showDialog(editor);
  };
  const confirm = () => {
    const chosen = people[picked] ?? current;
    closeDialog(editor);
    if (sameContact(chosen, current)) return;
    const saved = save((all) => withOperator(all, siteId, chosen));
    setMessage(saved ? `${SITE_EDITS.operatorUpdated(siteName, chosen.name)} ${SITE_EDITS.savedHere}` : SITE_EDITS.notSaved);
    showDialog(notice);
  };

  return (
    <div className={styles.operatorRow}>
      <dialog ref={editor} className={dialogStyles.dialog} aria-labelledby={titleId} data-edit-dialog="operator">
        <div className={dialogStyles.form}>
          <EditHead titleId={titleId} title={SITE_EDITS.operatorTitle} onCancel={() => closeDialog(editor)} onConfirm={confirm} />
          <p className={styles.editFacts}>
            <strong>{siteName}</strong>
          </p>
          <fieldset className={styles.choiceGroup}>
            <legend className={dialogStyles.label}>{SITE_EDITS.candidates}</legend>
            {people.map((person, index) => (
              <label key={`${person.name}|${person.phone}`} className={styles.choiceRow}>
                <input type="radio" name={`${idBase}-operator`} checked={index === picked} onChange={() => setPicked(index)} />
                <span className={styles.choiceMark} aria-hidden="true" />
                <span className={styles.editPerson}>
                  <strong>{person.name}</strong>
                  <span className={styles.muted}>{person.phone}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </div>
      </dialog>
      <Notice id={`${idBase}-operator-notice`} dialogRef={notice} message={message} />
      <button type="button" id={nameId} className={styles.operatorName} aria-haspopup="dialog" aria-describedby={describedBy} onClick={open}>
        <span>{`${SITE_ACTIONS.operator} · ${current.name}`}</span>
        <Icon name="chevron-right" />
      </button>
      <div className={`${styles.siteCardActions} ${styles.operatorButtons}`}>
        <a className={styles.button} href={smsHref(current.phone, text)} aria-describedby={describedBy}>
          {SITE_ACTIONS.textOperator}
        </a>
        <a className={styles.button} href={telHref(current.phone)} aria-describedby={describedBy}>
          {SITE_ACTIONS.callOperator}
        </a>
      </div>
    </div>
  );
}

/** The big signal's call, to the operator this device chose (AC 54, 87). */
export function OperatorCall({
  siteId,
  upstream,
  className,
  tone,
  knob,
  describedBy,
  children,
}: {
  siteId: string;
  upstream: ContactView;
  className: string;
  tone: string;
  knob: string;
  describedBy?: string;
  children: ReactNode;
}) {
  const edits = useSiteEdits();
  const operator = effectiveOperator(edits, siteId, upstream) ?? upstream;
  return (
    <a className={className} href={telHref(operator.phone)} data-signal={tone} data-knob={knob} aria-describedby={describedBy}>
      {children}
    </a>
  );
}

/** The operator this device chose for a project, else the sample data's: what every inner page shows (AC 88). */
export function useOperator(siteId: string, upstream: ContactView | undefined): ContactView | undefined {
  return effectiveOperator(useSiteEdits(), siteId, upstream);
}

/**
 * The site page's "Operator · Mere Tane" row (AC 55, 88): `OperatorRow` itself, with the name, Text operator and
 * Call operator following the operator this device chose on a card.
 */
export function StoredOperatorRow({
  siteId,
  upstream,
  text,
  nameId,
  describedBy,
}: {
  siteId: string;
  upstream: ContactView;
  text: string;
  nameId?: string;
  describedBy?: string;
}) {
  const operator = useOperator(siteId, upstream) ?? upstream;
  return (
    <OperatorRow
      operator={{ name: operator.name, text, textHref: smsHref(operator.phone, text), callHref: telHref(operator.phone) }}
      nameId={nameId}
      describedBy={describedBy}
    />
  );
}

/** A blocked site's "Who to call" (AC 50, 88): picker and operator, the operator as this device chose. */
export function StoredContacts({ siteId, operator, picker }: { siteId: string; operator?: ContactView; picker?: ContactView }) {
  const contacts = contactRoles(useOperator(siteId, operator), picker);
  if (contacts.length === 0) return null;
  return (
    <>
      <h3>{ACTION_NEEDED.contactsHeading}</h3>
      <ul className={styles.actionList}>
        {contacts.map(({ role, contact }) => (
          <li key={role} className={styles.contactRow}>
            <span>
              <span className={styles.muted}>{role}</span>
              <br />
              <strong>{contact.name}</strong>
            </span>
            <a className={styles.button} href={telHref(contact.phone)} aria-label={`${ACTION_NEEDED.call} ${contact.name}, ${role.toLowerCase()}`}>
              {ACTION_NEEDED.call}
            </a>
          </li>
        ))}
      </ul>
    </>
  );
}
