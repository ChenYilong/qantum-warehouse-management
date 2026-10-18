import type { SiteAction } from "./contacts";
import { ReloadSignal } from "./ReloadSignal";
import type { KnobShape, SignalTone } from "./signal";
import type { StatusView } from "./status";
import styles from "./primitives.module.css";

const TONE_CLASS: Readonly<Record<SignalTone, string>> = {
  go: styles.signalGo!,
  stop: styles.signalStop!,
  unknown: styles.signalUnknown!,
  idle: styles.signalIdle!,
};

/**
 * The knob is the status chip's icon enlarged and given a shape of its own: a circle with a tick, a stop sign, a
 * warning triangle, a dashed ring. Decorative: the label says the state, so the knob is hidden from screen readers.
 */
function Knob({ shape }: { shape: KnobShape }) {
  return (
    <svg className={styles.signalKnob} data-shape={shape} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
      {shape === "circle" ? (
        <>
          <circle className={styles.knobBody} cx="36" cy="36" r="34" />
          <path className={styles.knobGlyph} d="M20 37.5 31 48.5 53 24" />
        </>
      ) : null}
      {shape === "octagon" ? (
        <>
          <path className={styles.knobBody} d="M22 2h28l20 20v28L50 70H22L2 50V22z" />
          <rect className={styles.knobBar} x="17" y="29.5" width="38" height="13" rx="2" />
        </>
      ) : null}
      {shape === "triangle" ? (
        <>
          <path className={`${styles.knobBody} ${styles.knobRounded}`} d="M36 7 66 62H6z" />
          <path className={styles.knobGlyph} d="M36 28v16" />
          <circle className={styles.knobDot} cx="36" cy="53.5" r="4.5" />
        </>
      ) : null}
      {shape === "ring" ? <circle className={styles.knobRing} cx="36" cy="36" r="31" pathLength="20" /> : null}
    </svg>
  );
}

/** The mark at the track's other end, like the labels of an iOS switch: a bar (I) for on, a ring (O) for off. */
function Mark({ mark }: { mark: "I" | "O" }) {
  return (
    <svg className={styles.signalMark} viewBox="0 0 24 40" aria-hidden="true" focusable="false">
      {mark === "I" ? (
        <rect className={styles.markBar} x="8" y="4" width="8" height="32" rx="4" />
      ) : (
        <circle className={styles.markRing} cx="12" cy="20" r="9" />
      )}
    </svg>
  );
}

/**
 * A site's status as a big I/O switch (AC 52 to 57). Deep green with the knob right means the crew can go; deep red
 * with the knob left means blocked. Tapping it calls the operator, the same as Call operator, because that is the
 * most common action. A site that can't be checked asks again; one with nothing to do is not tappable.
 * `describedBy` names the card's title, so the site name is a description and never part of the control's name.
 */
export function SiteSignal({ status, action, describedBy }: { status: StatusView; action: SiteAction; describedBy?: string }) {
  const { signal, tap } = action;
  const className = `${styles.signal} ${TONE_CLASS[signal.tone]}`;
  const onRight = signal.knob === "right";
  const face = (
    <>
      {onRight ? <Mark mark={signal.mark} /> : <Knob shape={signal.shape} />}
      <span className={styles.signalText}>
        <span className={styles.signalLabel}>{status.label}</span>
        {tap.hint ? <span className={styles.signalHint}>{tap.hint}</span> : null}
      </span>
      {onRight ? <Knob shape={signal.shape} /> : <Mark mark={signal.mark} />}
    </>
  );
  if (tap.kind === "call") {
    return (
      <a className={className} href={tap.href} data-signal={signal.tone} data-knob={signal.knob} aria-describedby={describedBy}>
        {face}
      </a>
    );
  }
  if (tap.kind === "retry") {
    return (
      <ReloadSignal className={className} tone={signal.tone} knob={signal.knob} describedBy={describedBy}>
        {face}
      </ReloadSignal>
    );
  }
  return (
    <div className={className} data-signal={signal.tone} data-knob={signal.knob}>
      {face}
    </div>
  );
}
