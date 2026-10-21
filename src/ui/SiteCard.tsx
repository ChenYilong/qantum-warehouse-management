"use client";

import Link from "next/link";
import { siteAction, SITE_ACTIONS, type ContactView, type SiteActionInput } from "./contacts";
import type { Deadline } from "./deadline";
import { sitePath } from "./format";
import { Icon } from "./Icon";
import { heldSite } from "./pickups";
import { usePickups, useTicked } from "./PickupStore";
import { KindIcon } from "./KindIcon";
import { SiteDeadline, SiteOperator } from "./SiteEdits";
import { SiteMap, SitePlace } from "./SitePlace";
import { SiteSignal } from "./SiteSignal";
import { siteChip, type StatusView } from "./status";
import { markerColour, type LatLng } from "./travel";
import styles from "./primitives.module.css";

/**
 * One site as a large card (AC 49): its name opens the site, the big signal says whether the crew can go and
 * calls the operator when tapped, a blocked site lists what is short, and the operator can be texted or called.
 * Action names never repeat the site name: the card's title already says it. A project with a location has its map
 * under its name, above the signal and as wide as it, and ends with the trip there and Directions (AC 74, 75).
 * `idPrefix` keeps its ids unique when today's panel shows the same card again above the list (AC 79). A project
 * with a deadline ends with it, in English (AC 80). The deadline and the operator are buttons: either opens a dialog
 * that changes it on this device, and the card then shows the change before the sample data (AC 86, 87). A site
 * this device stored as Blocked by a pick-up, or ticked on the pick-up page, reads Blocked first (AC 93, 95).
 */
export function SiteCard({
  site,
  status,
  place,
  idPrefix = "site-card",
  deadline = null,
  candidates = [],
}: {
  site: SiteActionInput;
  status: StatusView;
  place?: { readonly location: LatLng; readonly token: string; readonly colour: string };
  idPrefix?: string;
  deadline?: Deadline | null;
  /** Who the operator can be changed to (AC 87). */
  candidates?: readonly ContactView[];
}) {
  const pickups = usePickups();
  const ticked = useTicked(site.id);
  const held = heldSite(site, pickups, ticked);
  const changed = held !== site;
  const shown = changed ? siteChip(held.crewStatus, held.shortageCount, held.dataProblemCount) : status;
  const action = siteAction(held);
  const titleId = `${idPrefix}-${site.id}`;
  const operatorId = `${titleId}-operator`;
  const { short } = action;
  return (
    <div className={styles.siteCard} data-held={changed ? held.crewStatus : undefined}>
      <Link id={titleId} className={styles.siteCardTitle} href={sitePath(site.id)}>
        <span className={styles.kindTitle}>
          <KindIcon kind="site" />
          {site.name}
        </span>
        <Icon name="chevron-right" />
      </Link>
      {place?.token ? <SiteMap siteId={site.id} token={place.token} location={place.location} colour={changed ? markerColour(held.crewStatus) : place.colour} /> : null}
      <SiteSignal siteId={site.id} operator={site.operator} status={shown} action={action} describedBy={action.operator ? `${titleId} ${operatorId}` : titleId} />
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
      {action.operator && site.operator ? (
        <SiteOperator
          siteId={site.id}
          siteName={site.name}
          upstream={site.operator}
          text={action.operator.text}
          candidates={candidates}
          idBase={titleId}
          nameId={operatorId}
          describedBy={titleId}
        />
      ) : null}
      {action.decide ? (
        <div className={styles.siteCardActions}>
          <Link className={`${styles.button} ${styles.primary}`} href={action.decide.href} aria-describedby={titleId}>
            {action.decide.label}
            <Icon name="chevron-right" />
          </Link>
        </div>
      ) : null}
      {place ? <SitePlace siteId={site.id} titleId={titleId} location={place.location} /> : null}
      {deadline ? <SiteDeadline siteId={site.id} siteName={site.name} upstream={deadline.iso} signal={action.signal} idBase={titleId} describedBy={titleId} /> : null}
    </div>
  );
}
