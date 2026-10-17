import Link from "next/link";
import { siteAction, SITE_ACTIONS, type SiteActionInput } from "./contacts";
import { sitePath } from "./format";
import { Icon } from "./Icon";
import { KindIcon } from "./KindIcon";
import { ReloadButton } from "./ReloadButton";
import { StatusChip } from "./StatusChip";
import type { StatusView } from "./status";
import styles from "./primitives.module.css";

/**
 * One site as a large card (AC 49): its name opens the site, the chip says whether the crew can go, and one main
 * action says what to do next. Action names never repeat the site name: the card's title already says it.
 */
export function SiteCard({ site, status }: { site: SiteActionInput; status: StatusView }) {
  const action = siteAction(site);
  const titleId = `site-card-${site.id}`;
  return (
    <div className={styles.siteCard}>
      <Link id={titleId} className={styles.siteCardTitle} href={sitePath(site.id)}>
        <span className={styles.kindTitle}>
          <KindIcon kind="site" />
          {site.name}
        </span>
        <Icon name="chevron-right" />
      </Link>
      <StatusChip status={status} />
      {action.kind === "notify" ? (
        <>
          <p className={styles.muted}>{`${SITE_ACTIONS.operator} · ${action.operator.name}`}</p>
          <div className={styles.siteCardActions}>
            <a className={`${styles.button} ${styles.primary}`} href={action.textHref} aria-describedby={titleId}>
              {SITE_ACTIONS.textOperator}
            </a>
            <a className={styles.button} href={action.callHref} aria-describedby={titleId}>
              {SITE_ACTIONS.callOperator}
            </a>
          </div>
        </>
      ) : null}
      {action.kind === "decide" ? (
        <div className={styles.siteCardActions}>
          <Link className={`${styles.button} ${styles.primary}`} href={action.href} aria-describedby={titleId}>
            {action.label}
            <Icon name="chevron-right" />
          </Link>
        </div>
      ) : null}
      {action.kind === "retry" ? (
        <div className={styles.siteCardActions}>
          <ReloadButton />
        </div>
      ) : null}
    </div>
  );
}
