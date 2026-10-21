"use client";

import type { ReactNode } from "react";
import { buildCalendar } from "./calendar";
import { CalendarPanel } from "./CalendarPanel";
import { heldSite, type PanelSite } from "./pickups";
import { usePickups } from "./PickupStore";
import { buildToday } from "./today";
import { TodayPanel } from "./TodayPanel";

/**
 * The Map and Calendar panels as this device has the projects (AC 97): each site's pick-ups are read before the
 * server's status, so a site that gave reads Blocked and one whose pick-up covered its shortages reads Crew can go,
 * in the verdict, the bar, the tabs, the pins and the ovals. A change in the statuses starts the panel afresh, so it
 * opens on the right tab.
 */
function useHeld(sites: readonly PanelSite[]) {
  const pickups = usePickups();
  const held = sites.map((site) => heldSite(site, pickups, null));
  return { held, key: held.map((site) => site.crewStatus).join("|") };
}

export function HeldTodayPanel({ sites, token, cards }: { sites: readonly PanelSite[]; token: string; cards: Readonly<Record<string, ReactNode>> }) {
  const { held, key } = useHeld(sites);
  return <TodayPanel key={key} today={buildToday(held)} token={token} cards={cards} />;
}

export function HeldCalendarPanel({ sites, cards }: { sites: readonly PanelSite[]; cards: Readonly<Record<string, ReactNode>> }) {
  const { held, key } = useHeld(sites);
  return <CalendarPanel key={key} calendar={buildCalendar(held)} cards={cards} />;
}
