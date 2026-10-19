import type { ListedSite } from "@/application";
import { deadlineOf } from "./deadline";
import { SiteCard } from "./SiteCard";
import { siteChip } from "./status";
import { markerColour, validLocation } from "./travel";
import type { Place } from "./TravelProvider";

/** Every project with a valid point, for the drive to it (AC 75). */
export function placesOf(sites: readonly ListedSite[]): Place[] {
  return sites.flatMap((site) => {
    const location = validLocation(site.location);
    return location ? [{ id: site.id, location }] : [];
  });
}

/**
 * One project's card, exactly as the projects list shows it (AC 49, 74, 80). The Map and Calendar pages show the
 * same card under the map and the calendar (AC 79, 81), each with its own ids.
 */
export function ProjectCard({ site, token, idPrefix }: { site: ListedSite; token: string; idPrefix?: string }) {
  const location = validLocation(site.location);
  return (
    <SiteCard
      site={site}
      status={siteChip(site.crewStatus, site.shortageCount, site.dataProblemCount)}
      place={location ? { location, token, colour: markerColour(site.crewStatus) } : undefined}
      idPrefix={idPrefix}
      deadline={deadlineOf(site.date)}
    />
  );
}

/** The cards a panel can show under its map or calendar, one per project, rendered on the server. */
export function projectCards(sites: readonly ListedSite[], token: string, idPrefix: string) {
  return Object.fromEntries(sites.map((site) => [site.id, <ProjectCard key={site.id} site={site} token={token} idPrefix={idPrefix} />]));
}
