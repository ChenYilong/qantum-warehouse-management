import type { KnobShape } from "./signal";
import styles from "./primitives.module.css";

/** The big signal's knob, copied at a small size: a circle with a tick, a stop sign, a warning triangle, a dashed ring. */
export function MiniKnob({ shape }: { shape: KnobShape }) {
  return (
    <svg className={styles.calendarKnob} data-shape={shape} viewBox="0 0 72 72" aria-hidden="true" focusable="false">
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
