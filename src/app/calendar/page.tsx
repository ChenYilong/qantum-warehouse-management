import { listSites } from "@/application";
import { getDependencies } from "@/server/deps";
import { mapboxPublicToken } from "@/server/mapbox";
import { MenuBar } from "@/ui/AppBar";
import { buildCalendar } from "@/ui/calendar";
import { CalendarPanel } from "@/ui/CalendarPanel";
import { EMPTY, NAV, SITES_UNAVAILABLE } from "@/ui/messages";
import { placesOf, projectCards } from "@/ui/ProjectCard";
import { TravelButton, TravelProvider } from "@/ui/TravelProvider";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";
import { loadPage } from "../_lib/load";

export const dynamic = "force-dynamic";
export const metadata = { title: NAV.calendar };

/** The Calendar tab (AC 81, 82): the deadline calendar, with today's verdict and tabs and the chosen project's card. */
export default async function CalendarPage() {
  const loaded = await loadPage(() => listSites(getDependencies()));
  const sites = loaded.status === "unavailable" ? [] : loaded.value.sites;
  const token = mapboxPublicToken();
  // With the panel leading the page, the h1 stays first in main for structure but is not shown.
  return (
    <>
      <MenuBar current="calendar" />
      <main>
        <h1 className={sites.length > 0 ? styles.srOnly : undefined}>{NAV.calendar}</h1>
        {loaded.status === "unavailable" ? (
          <UnavailablePanel status={{ label: SITES_UNAVAILABLE, tone: "warning", icon: "warning" }} />
        ) : sites.length === 0 ? (
          <p>{EMPTY.sites}</p>
        ) : (
          <TravelProvider token={token} places={placesOf(sites)}>
            {/* At the top of every tab's page, under the picker's line (AC 75, AC 83). */}
            <TravelButton />
            <CalendarPanel calendar={buildCalendar(sites)} cards={projectCards(sites, token, "calendar-card")} />
          </TravelProvider>
        )}
      </main>
    </>
  );
}
