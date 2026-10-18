import { SITE_ACTIONS, type OperatorActions } from "./contacts";
import styles from "./primitives.module.css";

/**
 * Who to tell, and how (AC 55): the operator's name, then Text operator (a prepared message that fits the site's
 * state) and Call operator. Shown for a clear, a blocked and an unchecked site, so a trip is never wasted on a
 * site whose parts are not there. Both buttons are 56px tall for gloved hands. `nameId` lets the big signal be
 * described by who it calls, since its own hint is only "Tap to call".
 */
export function OperatorRow({ operator, describedBy, nameId }: { operator: OperatorActions; describedBy?: string; nameId?: string }) {
  return (
    <div className={styles.operatorRow}>
      <p id={nameId} className={styles.muted}>
        {`${SITE_ACTIONS.operator} · ${operator.name}`}
      </p>
      <div className={`${styles.siteCardActions} ${styles.operatorButtons}`}>
        <a className={styles.button} href={operator.textHref} aria-describedby={describedBy}>
          {SITE_ACTIONS.textOperator}
        </a>
        <a className={styles.button} href={operator.callHref} aria-describedby={describedBy}>
          {SITE_ACTIONS.callOperator}
        </a>
      </div>
    </div>
  );
}
