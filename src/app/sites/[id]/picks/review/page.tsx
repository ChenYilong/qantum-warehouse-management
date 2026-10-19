import type { Metadata } from "next";
import Link from "next/link";
import { getCachedPickCheck, getCachedSite } from "../../../../_lib/cached";
import { loadPage } from "../../../../_lib/load";
import { AppBar } from "@/ui/AppBar";
import { formatRecordedAt, sitePath } from "@/ui/format";
import { Icon } from "@/ui/Icon";
import { PICKS } from "@/ui/messages";
import { PickOfflineNote } from "@/ui/PickOfflineNote";
import { PickReviewChoice } from "@/ui/PickReviewChoice";
import { pickAmountLine, pickLineLabel, reportFinding } from "@/ui/picks";
import { StatusChip } from "@/ui/StatusChip";
import { UnavailablePanel } from "@/ui/UnavailablePanel";
import styles from "@/ui/primitives.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: PICKS.reviewTitle };

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ line?: string | string[] }> };

/**
 * A review on site of one pick line (AC 67): what the warehouse says it picked, and whether it is right here. A line
 * that matches the plan can still be wrong on site, so every line can be reviewed.
 */
export default async function PickReviewPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { line } = await searchParams;
  const load = await loadPage(() => getCachedPickCheck(id));
  if (load.status === "unavailable") {
    const site = await loadPage(() => getCachedSite(id));
    return (
      <>
        <AppBar backHref={sitePath(id)} backName={site.status === "ready" && site.value ? site.value.name : "Site"} />
        <main>
          <h1>{PICKS.reviewTitle}</h1>
          <UnavailablePanel status={{ label: PICKS.unavailable, tone: "warning", icon: "warning" }} />
        </main>
      </>
    );
  }
  const view = load.value;
  const checked = typeof line === "string" ? view.check.lines.find((item) => item.line.id === line) : undefined;
  const back = <AppBar backHref={sitePath(id)} backName={view.siteName} />;
  if (!checked) {
    return (
      <>
        {back}
        <main>
          <h1>{PICKS.reviewTitle}</h1>
          <p>{PICKS.reviewNoLine}</p>
          <Link className={`${styles.button} ${styles.fullWidth}`} href={sitePath(id)}>
            {PICKS.backToSite}
          </Link>
        </main>
      </>
    );
  }
  const titleId = `review-${checked.line.id}`;
  return (
    <>
      {back}
      <main>
        <h1>{PICKS.reviewTitle}</h1>
        <PickOfflineNote text={PICKS.reviewOffline} />
        {/* The top edge takes the line's tone: green when it matches the plan, red when it has an issue. */}
        <section className={checked.kind === null ? `${styles.pickCard} ${styles.pickCardMatched}` : styles.pickCard} aria-labelledby={titleId}>
          <h2 id={titleId} className={styles.pickCardTitle}>
            {checked.line.materialName}
          </h2>
          <p className={styles.muted}>{pickAmountLine(checked)}</p>
          {checked.line.usedAt ? <p className={styles.muted}>{checked.line.usedAt}</p> : null}
          <StatusChip status={pickLineLabel(checked.kind, false)} />
          {checked.openReport ? (
            <p className={`${styles.pickRowNote} ${styles.pickRowReported}`}>
              <Icon name="stop" />
              <span>{PICKS.reportedCard(formatRecordedAt(checked.openReport.createdAt), reportFinding(checked.openReport))}</span>
            </p>
          ) : null}
          {checked.checkedAt ? (
            <p className={styles.pickRowNote}>
              <Icon name="check" />
              <span>{PICKS.checkedOnSite(formatRecordedAt(checked.checkedAt))}</span>
            </p>
          ) : null}
          {view.picker ? (
            <p className={styles.muted}>
              {`Picked by ${view.picker.name}`} {PICKS.sample}
            </p>
          ) : null}
        </section>
        <h2>{PICKS.reviewQuestion}</h2>
        <p>{PICKS.reviewIntro}</p>
        <PickReviewChoice siteId={id} lineId={checked.line.id} />
        <p className={styles.muted}>{PICKS.reviewFooter}</p>
      </main>
    </>
  );
}
