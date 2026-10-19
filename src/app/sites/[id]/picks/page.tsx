import type { Metadata } from "next";
import Link from "next/link";
import { getCachedPickCheck, getCachedSite } from "../../../_lib/cached";
import { loadPage } from "../../../_lib/load";
import { AppBar } from "@/ui/AppBar";
import { telHref } from "@/ui/contacts";
import { sitePath } from "@/ui/format";
import { Icon } from "@/ui/Icon";
import { PICKS } from "@/ui/messages";
import { PickIssueCard } from "@/ui/PickIssueCard";
import { PickOfflineNote } from "@/ui/PickOfflineNote";
import { initials, pickReportPath } from "@/ui/picks";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pick check" };

type PageProps = { params: Promise<{ id: string }> };

/** The Pick check (AC 64): one card per pick issue, the picker, and Report to warehouse. */
export default async function PickCheckPage({ params }: PageProps) {
  const { id } = await params;
  const load = await loadPage(() => getCachedPickCheck(id));
  if (load.status === "unavailable") {
    const site = await loadPage(() => getCachedSite(id));
    return (
      <>
        <AppBar backHref={sitePath(id)} backName={site.status === "ready" && site.value ? site.value.name : "Site"} />
        <main>
          <h1>{PICKS.checkTitle(0)}</h1>
          <UnavailablePanel status={{ label: PICKS.unavailable, tone: "warning", icon: "warning" }} />
        </main>
      </>
    );
  }
  const view = load.value;
  const issues = view.check.lines.filter((checked) => checked.kind !== null);
  const intro = view.check.status === "unknown" ? PICKS.noListText : issues.length > 0 ? PICKS.checkIntro : PICKS.checkReadyIntro;
  const reported = issues.some((checked) => checked.openReport !== null);
  return (
    <>
      <AppBar backHref={sitePath(id)} backName={view.siteName} />
      <main>
        <h1>{PICKS.checkTitle(view.check.issueCount)}</h1>
        <PickOfflineNote text={PICKS.checkOffline} />
        <p>{intro}</p>
        {reported ? <p>{PICKS.checkReportedIntro}</p> : null}
        {issues.map((checked, index) => (
          <PickIssueCard key={checked.line.id} siteId={id} checked={checked} index={index + 1} />
        ))}
        {view.picker ? (
          <section className={styles.pickerStrip} aria-label={PICKS.pickedBy}>
            <span className={styles.avatar} aria-hidden="true">
              {initials(view.picker.name)}
            </span>
            <div className={styles.pickerText}>
              <p className={styles.pickerName}>
                {`Picked by ${view.picker.name}`} <span className={styles.muted}>{PICKS.sample}</span>
              </p>
              <p className={styles.muted}>{[view.picker.phone, view.picker.email].filter(Boolean).join(" · ")}</p>
            </div>
            <a className={`${styles.button} ${styles.iconButton}`} href={telHref(view.picker.phone)} aria-label={PICKS.callPicker(view.picker.name)}>
              <Icon name="phone" />
            </a>
          </section>
        ) : null}
        <div className={styles.pickActions}>
          {issues.length > 0 ? (
            <Link className={`${styles.button} ${styles.primary} ${styles.fullWidth}`} href={pickReportPath(id, issues[0]!.line.id)}>
              {PICKS.report}
            </Link>
          ) : null}
          <Link className={`${styles.button} ${styles.fullWidth}`} href={sitePath(id)} aria-describedby="wait-repick">
            {PICKS.waitRepick}
          </Link>
          <p id="wait-repick" className={styles.muted}>
            {PICKS.waitRepickText}
          </p>
        </div>
      </main>
    </>
  );
}
