import { listSites, type ListedSite } from "@/application";
import { getDependencies } from "@/server/deps";
import { mapboxPublicToken } from "@/server/mapbox";
import { MenuBar } from "@/ui/AppBar";
import { EMPTY, NAV, SITES_UNAVAILABLE } from "@/ui/messages";
import { SiteFilterForm } from "@/ui/SiteFilterForm";
import { feedSites, parseSiteFilters, type SiteFilters } from "@/ui/site-filters";
import { SiteFeed } from "@/ui/SiteFeed";
import { placesOf, ProjectCard } from "@/ui/ProjectCard";
import { operatorCandidates } from "@/ui/site-edits";
import { TravelButton, TravelProvider } from "@/ui/TravelProvider";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import { loadPage } from "../_lib/load";

export const dynamic = "force-dynamic";
export const metadata = { title: NAV.sites };

type PageProps = { searchParams: Promise<{ status?: string | string[]; q?: string | string[] }> };

export default async function SitesPage({ searchParams }: PageProps) {
  const filters = parseSiteFilters(await searchParams);
  const loaded = await loadPage(() => listSites(getDependencies()));
  const token = mapboxPublicToken();
  return (
    <>
      <MenuBar current="sites" />
      <main>
        <h1>{NAV.sites}</h1>
        {loaded.status === "unavailable" ? (
          <UnavailablePanel status={{ label: SITES_UNAVAILABLE, tone: "warning", icon: "warning" }} />
        ) : loaded.value.sites.length === 0 ? (
          <p>{EMPTY.sites}</p>
        ) : (
          <TravelProvider token={token} places={placesOf(loaded.value.sites)}>
            {/* At the top of every tab's page, under the picker's line (AC 75, AC 83). */}
            <TravelButton />
            <FilteredSites sites={loaded.value.sites} filters={filters} token={token} />
          </TravelProvider>
        )}
      </main>
    </>
  );
}

/**
 * The filter (AC 72, 73), then the projects it keeps, or why there are none. Each project with a location shows its
 * map (with a public Mapbox token) and Directions, and the drive to all of them is one tap away (AC 74, 75). The
 * cards are rendered here; the list that filters them reads this device's pick-ups first (AC 95).
 */
function FilteredSites({ sites, filters, token }: { sites: readonly ListedSite[]; filters: SiteFilters; token: string }) {
  // Every project's people, not just the filtered ones: a card can be given to anyone (AC 87).
  const candidates = operatorCandidates(sites);
  const cards = Object.fromEntries(sites.map((site) => [site.id, <ProjectCard key={site.id} site={site} token={token} candidates={candidates} />]));
  return (
    <>
      <SiteFilterForm key={`${filters.status}|${filters.query}`} filters={filters} />
      <SiteFeed sites={feedSites(sites)} cards={cards} filters={filters} />
    </>
  );
}
