import Link from "next/link";
import type { CheckedPickLine } from "@/domain";
import { formatRecordedAt, formatUnit } from "./format";
import { Icon } from "./Icon";
import { PICKS } from "./messages";
import { pickCardTitle, pickLineAnchor, pickReviewPath, reportFinding } from "./picks";
import styles from "./primitives.module.css";

function shortfall(planned: number, picked: number): number | null {
  return Number.isFinite(planned) && Number.isFinite(picked) && planned > picked ? planned - picked : null;
}

/** What the card's last line says, by the issue that names it. */
function explanation(checked: CheckedPickLine): string {
  const { line } = checked;
  const parts = checked.shortParts.map((part) => part.name.toLowerCase()).join(" and ");
  switch (checked.kind) {
    case "wrong_spec":
      return "Right product, wrong rating. Installing it would not meet the nominated solution.";
    case "missing_parts":
      return `${line.materialName} can't be installed without its ${parts}. It is a required part of this line.`;
    case "part_picked": {
      const short = shortfall(line.plannedQty, line.pickedQty);
      const where = line.usedAt ? ` for ${line.usedAt.split(" · ").pop()}` : "";
      const unit = short === null ? "" : formatUnit(short, line.unit);
      return `${short ?? "Some"}${unit ? ` ${unit}` : ""} short${where}${parts ? `, and no ${parts} to go with them` : ""}.`;
    }
    case "reported":
      // A reported line has its report: the explanation is the report line below.
      return "The pick list matches the plan, but the site found a problem with what arrived.";
    default:
      return "The warehouse sent numbers or a spec the app can't trust. Treat this line as not picked.";
  }
}

function capitalise(text: string): string {
  return text.length === 0 ? text : `${text[0]!.toUpperCase()}${text.slice(1)}`;
}

function PartRow({ name, picked, planned }: { name: string; picked: number; planned: number }) {
  const ok = Number.isFinite(picked) && Number.isFinite(planned) && picked >= planned;
  return (
    <li className={ok ? styles.pickPart : `${styles.pickPart} ${styles.danger}`}>
      <Icon name={ok ? "check" : "stop"} />
      <span className={styles.pickPartName}>{name}</span>
      <strong>{`${Number.isFinite(picked) ? picked : "?"} of ${Number.isFinite(planned) ? planned : "?"}`}</strong>
    </li>
  );
}

/**
 * One pick issue on the Pick check page (AC 64, 70): what is wrong, planned against picked, why it matters, any report
 * from site still open, and Review, to check the line again on site once a re-pick arrives.
 */
export function PickIssueCard({ siteId, checked, index }: { siteId: string; checked: CheckedPickLine; index: number }) {
  const { line } = checked;
  const titleId = `${pickLineAnchor(line.id)}-title`;
  const progress = Number.isFinite(line.pickedQty) && Number.isFinite(line.plannedQty) && line.plannedQty > 0 ? Math.min(100, Math.round((line.pickedQty / line.plannedQty) * 100)) : 0;
  return (
    <article id={pickLineAnchor(line.id)} className={styles.pickCard} aria-labelledby={titleId}>
      <p className={styles.pickCardTop}>
        <span className={`${styles.chip} ${styles.danger}`}>
          <Icon name="stop" />
          <span>{`${index} · ${pickCardTitle(checked)}`}</span>
        </span>
        {line.usedAt ? <span className={styles.muted}>{line.usedAt}</span> : null}
      </p>
      <h2 id={titleId} className={styles.pickCardTitle}>
        {line.materialName}
      </h2>
      {checked.issues.includes("wrong_spec") ? (
        <div className={styles.specCompare}>
          <div>
            <span className={styles.muted}>{PICKS.planNeeds}</span>
            <strong>{line.plannedSpec}</strong>
          </div>
          <div className={styles.danger}>
            <span>{PICKS.picked}</span>
            <strong>{line.pickedSpec}</strong>
            <span>{PICKS.lowerRating}</span>
          </div>
        </div>
      ) : null}
      {checked.issues.includes("part_picked") ? (
        <div className={styles.pickProgress}>
          <p className={styles.pickProgressLine}>
            <span>{line.unit === "each" || line.unit === "" ? PICKS.picked : capitalise(formatUnit(line.plannedQty, line.unit))}</span>
            <strong>{`${line.pickedQty} of ${line.plannedQty}`}</strong>
          </p>
          <div className={styles.pickBar} role="img" aria-label={`${line.pickedQty} of ${line.plannedQty} picked`}>
            <div className={styles.pickBarFill} style={{ width: `${progress}%` }} />
          </div>
        </div>
      ) : null}
      {checked.issues.includes("missing_parts") ? (
        <ul className={styles.pickParts}>
          {checked.issues.includes("part_picked") ? null : <PartRow name="Main item" picked={line.pickedQty} planned={line.plannedQty} />}
          {line.requiredParts.map((part) => (
            <PartRow key={part.id} name={part.name} picked={part.pickedQty} planned={part.plannedQty} />
          ))}
        </ul>
      ) : null}
      <p>{explanation(checked)}</p>
      {checked.openReport ? (
        <p className={`${styles.pickRowNote} ${styles.pickRowReported}`}>
          <Icon name="stop" />
          <span>{PICKS.reportedCard(formatRecordedAt(checked.openReport.createdAt), reportFinding(checked.openReport))}</span>
        </p>
      ) : null}
      <Link className={`${styles.button} ${styles.pickReview} ${styles.fullWidth}`} href={pickReviewPath(siteId, line.id)} aria-describedby={titleId}>
        {PICKS.reviewButton}
        <Icon name="chevron-right" />
      </Link>
    </article>
  );
}
