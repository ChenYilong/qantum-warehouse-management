import type { Metadata } from "next";
import { getCachedPickCheck } from "../../../../_lib/cached";
import { loadPage } from "../../../../_lib/load";
import { AppBar } from "@/ui/AppBar";
import { PICKS } from "@/ui/messages";
import { PickOfflineNote } from "@/ui/PickOfflineNote";
import { PickReportForm, type ReportLine } from "@/ui/PickReportForm";
import { missingPartText, picksPath, reportKindFor } from "@/ui/picks";
import { UnavailablePanel } from "@/ui/UnavailablePanel";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: PICKS.reportTitle };

type PageProps = { params: Promise<{ id: string }>; searchParams: Promise<{ line?: string | string[] }> };

/** Report a pick error to the warehouse (AC 65, 66), opened on the line the Pick check chose. */
export default async function PickReportPage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const { line } = await searchParams;
  const load = await loadPage(() => getCachedPickCheck(id));
  const back = <AppBar backHref={picksPath(id)} backName="Pick check" />;
  if (load.status === "unavailable") {
    return (
      <>
        {back}
        <main>
          <h1>{PICKS.reportTitle}</h1>
          <UnavailablePanel status={{ label: PICKS.unavailable, tone: "warning", icon: "warning" }} />
        </main>
      </>
    );
  }
  const view = load.value;
  const lines: ReportLine[] = view.check.lines.map((checked) => ({
    id: checked.line.id,
    name: checked.line.materialName,
    plannedQty: checked.line.plannedQty,
    pickedQty: checked.line.pickedQty,
    kind: reportKindFor(checked.kind),
    missingPart: missingPartText(checked),
  }));
  const firstIssue = view.check.lines.find((checked) => checked.kind !== null)?.line.id;
  const initialLineId = typeof line === "string" && lines.some((item) => item.id === line) ? line : (firstIssue ?? lines[0]?.id ?? "");
  return (
    <>
      {back}
      <main>
        <h1>{PICKS.reportTitle}</h1>
        <PickOfflineNote text="You can still write the report. It is saved on this phone and sent when you're back online." />
        {lines.length === 0 ? (
          <UnavailablePanel status={{ label: PICKS.noListText, tone: "warning", icon: "warning" }} />
        ) : (
          <PickReportForm
            siteId={id}
            siteName={view.siteName}
            picker={view.picker?.name ?? null}
            lastAction={view.lastAction}
            lastActionAt={view.lastActionAt}
            lines={lines}
            initialLineId={initialLineId}
          />
        )}
      </main>
    </>
  );
}
