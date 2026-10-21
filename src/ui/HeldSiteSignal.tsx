"use client";

import { siteAction, type SiteActionInput } from "./contacts";
import { heldSite } from "./pickups";
import { usePickups } from "./PickupStore";
import { SiteSignal } from "./SiteSignal";
import { siteChip, type StatusView } from "./status";

/**
 * The site screen's big signal, as this device has the site (AC 95): a site a pick-up stored as Blocked reads Blocked,
 * with what it gave listed in its text, before the sample data. Every other site shows the server's status.
 */
export function HeldSiteSignal({ site, status, describedBy }: { site: SiteActionInput; status: StatusView; describedBy?: string }) {
  const held = heldSite(site, usePickups(), null);
  const shown = held === site ? status : siteChip("blocked", held.shortageCount, held.dataProblemCount);
  return <SiteSignal siteId={site.id} operator={site.operator} status={shown} action={siteAction(held)} describedBy={describedBy} />;
}
