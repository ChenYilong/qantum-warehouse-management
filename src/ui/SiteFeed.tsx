"use client";

import type { ReactNode } from "react";
import { SITE_FILTER } from "./messages";
import { heldSite } from "./pickups";
import { usePickups } from "./PickupStore";
import { filterSites, isFiltered, type FeedSite, type SiteFilters } from "./site-filters";
import styles from "./primitives.module.css";

/**
 * The projects the filter keeps (AC 72, 73), as a waterfall of cards: cards keep their own heights and fill the
 * columns top to bottom (one column on a phone). The Projects list and the pick-up page share it (AC 93). Readiness
 * reads this device's pick-ups first (AC 95, 97): a site a pick-up stored as Blocked is a Shortage, and one whose
 * pick-up covered every shortage is Ready. `row` wraps each card,
 * for the pick-up page's tick.
 */
export function SiteFeed({
  sites,
  cards,
  filters,
  label = SITE_FILTER.list,
  row,
}: {
  sites: readonly FeedSite[];
  /** Each project's card, rendered on the server, by site id. */
  cards: Readonly<Record<string, ReactNode>>;
  filters: SiteFilters;
  label?: string;
  row?: (siteId: string, card: ReactNode) => ReactNode;
}) {
  const pickups = usePickups();
  const held = sites.map((site) => heldSite(site, pickups, null));
  const shown = filterSites(held, filters);
  if (shown.length === 0) return <p>{SITE_FILTER.noMatch}</p>;
  return (
    <>
      {isFiltered(filters) ? <p className={styles.muted}>{SITE_FILTER.count(shown.length, sites.length)}</p> : null}
      <ul className={styles.feed} aria-label={label}>
        {shown.map((site) => (
          <li key={site.id}>{row ? row(site.id, cards[site.id]) : cards[site.id]}</li>
        ))}
      </ul>
    </>
  );
}
