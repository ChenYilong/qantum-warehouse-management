import { listSites } from "@/application";
import { getDependencies } from "@/server/deps";
import { MenuBar } from "@/ui/AppBar";
import { EMPTY, NAV, SITES_UNAVAILABLE } from "@/ui/messages";
import { SiteCard } from "@/ui/SiteCard";
import { siteChip } from "@/ui/status";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";
import { loadPage } from "../_lib/load";

export const dynamic = "force-dynamic";
export const metadata = { title: NAV.sites };

export default async function SitesPage() {
  const loaded = await loadPage(() => listSites(getDependencies()));
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
          // A waterfall: cards keep their own heights and fill the columns top to bottom (one column on a phone).
          <ul className={styles.feed}>
            {loaded.value.sites.map((site) => (
              <li key={site.id}>
                <SiteCard site={site} status={siteChip(site.crewStatus, site.shortageCount, site.dataProblemCount)} />
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
