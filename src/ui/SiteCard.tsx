import Link from "next/link";
import { siteAction, SITE_ACTIONS, type SiteActionInput } from "./contacts";
import { sitePath } from "./format";
import { Icon } from "./Icon";
import { KindIcon } from "./KindIcon";
import { OperatorRow } from "./OperatorRow";
import { SiteSignal } from "./SiteSignal";
import type { StatusView } from "./status";
import styles from "./primitives.module.css";

/**
 * One site as a large card (AC 49): its name opens the site, the big signal says whether the crew can go and
 * calls the operator when tapped, a blocked site lists what is short, and the operator can be texted or called.
 * Action names never repeat the site name: the card's title already says it.
 */
export function SiteCard({ site, status }: { site: SiteActionInput; status: StatusView }) {
  const action = siteAction(site);
  const titleId = `site-card-${site.id}`;
  const operatorId = `${titleId}-operator`;
  const { short } = action;
  return (
    <div className={styles.siteCard}>
      <Link id={titleId} className={styles.siteCardTitle} href={sitePath(site.id)}>
        <span className={styles.kindTitle}>
          <KindIcon kind="site" />
          {site.name}
        </span>
        <Icon name="chevron-right" />
      </Link>
      <SiteSignal status={status} action={action} describedBy={action.operator ? `${titleId} ${operatorId}` : titleId} />
      {short.items.length > 0 ? (
        <div className={styles.shortFacts}>
          <p>
            <strong>{SITE_ACTIONS.shortLabel}</strong>
          </p>
          <ul>
            {short.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
            {short.more > 0 ? <li>{`and ${short.more} more`}</li> : null}
          </ul>
        </div>
      ) : null}
      {action.operator ? <OperatorRow operator={action.operator} describedBy={titleId} nameId={operatorId} /> : null}
      {action.decide ? (
        <div className={styles.siteCardActions}>
          <Link className={`${styles.button} ${styles.primary}`} href={action.decide.href} aria-describedby={titleId}>
            {action.decide.label}
            <Icon name="chevron-right" />
          </Link>
        </div>
      ) : null}
    </div>
  );
}
