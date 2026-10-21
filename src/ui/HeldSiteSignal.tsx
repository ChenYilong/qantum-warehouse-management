"use client";

import type { ReactNode } from "react";
import { siteAction, type SiteActionInput } from "./contacts";
import { heldSite, type HeldShortage } from "./pickups";
import { usePickups } from "./PickupStore";
import { SiteSignal } from "./SiteSignal";
import { siteChip, type StatusView } from "./status";

type HeldActionInput = SiteActionInput & { readonly shortages?: readonly HeldShortage[] };

/**
 * The site screen's big signal, as this device has the site (AC 95, 97): Blocked when a pick-up stored it so, with
 * what it gave listed in its text; Crew can go when its own pick-up covered every shortage; otherwise the server's.
 */
export function HeldSiteSignal({ site, status, describedBy }: { site: HeldActionInput; status: StatusView; describedBy?: string }) {
  const held = heldSite(site, usePickups(), null);
  const shown = held === site ? status : siteChip(held.crewStatus, held.shortageCount, held.dataProblemCount);
  return <SiteSignal siteId={site.id} operator={site.operator} status={shown} action={siteAction(held)} describedBy={describedBy} />;
}

/** Shows its children only while this device still has the site Blocked: a pick-up that cleared it hides them (AC 97). */
export function WhileHeldBlocked({ site, children }: { site: HeldActionInput; children: ReactNode }) {
  const held = heldSite(site, usePickups(), null);
  return held.crewStatus === "blocked" ? <>{children}</> : null;
}
