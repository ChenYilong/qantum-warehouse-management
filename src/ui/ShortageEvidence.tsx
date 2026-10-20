"use client";

import { useId, useState, useSyncExternalStore } from "react";
import dialogStyles from "./decisions/decisions.module.css";
import {
  buildEvidenceSummary,
  EVIDENCE,
  EVIDENCE_KEY,
  NOTE_LIMIT,
  readDraft,
  selectedHere,
  writeDraft,
  type EvidenceContext,
  type EvidenceDraft,
  type EvidenceRequirement,
} from "./evidence";
import styles from "./primitives.module.css";

function storage(): Storage | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function subscribe(onChange: () => void): () => void {
  const onStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === EVIDENCE_KEY) onChange();
  };
  window.addEventListener("storage", onStorage);
  return () => window.removeEventListener("storage", onStorage);
}

function readRaw(): string {
  try {
    return storage()?.getItem(EVIDENCE_KEY) ?? "";
  } catch {
    return "";
  }
}

/**
 * Portable evidence (AC 91): tick the blocking requirements, add a note, preview a plain-text summary and copy it.
 * The ticks and the note are kept in this browser under the site's id and come back on the next visit. Copying
 * creates no record and sends nothing. Shown only where something is blocking.
 */
export function ShortageEvidence({
  siteId,
  context,
  requirements,
}: {
  siteId: string;
  context: EvidenceContext;
  requirements: readonly EvidenceRequirement[];
}) {
  const titleId = useId();
  const noteId = useId();
  const raw = useSyncExternalStore(subscribe, readRaw, () => "");
  const [edited, setEdited] = useState<EvidenceDraft | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [copy, setCopy] = useState<"idle" | "copied" | "failed">("idle");
  if (requirements.length === 0) return null;

  const stored = raw ? readDraft({ getItem: () => raw, setItem: () => undefined }, siteId) : { selected: [], note: "" };
  const draft = edited ?? stored;
  const selected = selectedHere(draft, requirements);

  const change = (next: EvidenceDraft) => {
    setEdited(next);
    writeDraft(storage(), siteId, next);
    setSummary(null);
    setError("");
    setCopy("idle");
  };
  const toggle = (id: string, on: boolean) => {
    const others = draft.selected.filter((item) => item !== id);
    change({ ...draft, selected: on ? [...others, id] : others });
  };
  const preview = () => {
    const built = buildEvidenceSummary(context, requirements, draft);
    setSummary(built);
    setError(built === null ? EVIDENCE.invalid : "");
    setCopy("idle");
  };
  const copySummary = async () => {
    try {
      if (!summary || !navigator.clipboard?.writeText) throw new Error("no clipboard");
      await navigator.clipboard.writeText(summary);
      setCopy("copied");
    } catch {
      setCopy("failed");
    }
  };

  return (
    <section className={styles.evidence} aria-labelledby={titleId} data-evidence="">
      <p className={styles.evidenceEyebrow}>{EVIDENCE.eyebrow}</p>
      <h4 id={titleId} className={styles.evidenceTitle}>
        {EVIDENCE.title}
      </h4>
      <p className={styles.muted}>{EVIDENCE.intro}</p>
      <fieldset className={styles.choiceGroup}>
        <legend className={dialogStyles.label}>{EVIDENCE.legend}</legend>
        {requirements.map((requirement) => (
          <label key={requirement.id} className={styles.choiceRow}>
            <input
              type="checkbox"
              checked={selected.includes(requirement.id)}
              onChange={(event) => toggle(requirement.id, event.currentTarget.checked)}
            />
            <span className={`${styles.choiceMark} ${styles.choiceBox}`} aria-hidden="true" />
            <span className={styles.editPerson}>
              <strong>{requirement.name}</strong>
              <span className={styles.muted}>{requirement.status}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <div className={dialogStyles.field}>
        <label className={dialogStyles.label} htmlFor={noteId}>
          {EVIDENCE.note}
        </label>
        <textarea
          id={noteId}
          className={dialogStyles.control}
          rows={3}
          maxLength={NOTE_LIMIT}
          value={draft.note}
          onChange={(event) => change({ ...draft, note: event.currentTarget.value })}
        />
      </div>
      <p className={styles.muted}>{EVIDENCE.saved}</p>
      <button type="button" className={styles.button} onClick={preview}>
        {EVIDENCE.preview}
      </button>
      {error ? (
        <p className={dialogStyles.fieldError} role="alert">
          {error}
        </p>
      ) : null}
      {summary ? (
        <div className={dialogStyles.field}>
          <label className={dialogStyles.label} htmlFor={`${noteId}-preview`}>
            {EVIDENCE.previewLabel}
          </label>
          <textarea id={`${noteId}-preview`} className={`${dialogStyles.control} ${styles.evidencePreview}`} rows={12} readOnly value={summary} />
          <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => void copySummary()}>
            {EVIDENCE.copy}
          </button>
          {copy === "copied" ? <p role="status">{EVIDENCE.copied}</p> : null}
          {copy === "failed" ? (
            <p className={dialogStyles.fieldError} role="alert">
              {EVIDENCE.copyFailed}
            </p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
