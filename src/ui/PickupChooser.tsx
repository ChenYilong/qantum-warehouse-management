"use client";

import Link from "next/link";
import { useId, useRef, useState, type ReactNode } from "react";
import type { PickLine } from "@/domain";
import { ConnectionSwitch, PickerLine } from "./ConnectionBar";
import dialogStyles from "./decisions/decisions.module.css";
import { sitePath } from "./format";
import { Icon } from "./Icon";
import { applyPickup, available, heldLines, PICKUP, pickupPath, planPickup, type HeldLine, type Lender, type PickupPlan } from "./pickups";
import { savePickups, TickedContext, usePickups } from "./PickupStore";
import { SiteFeed } from "./SiteFeed";
import { SiteFilterForm } from "./SiteFilterForm";
import type { FeedSite, SiteFilters } from "./site-filters";
import styles from "./primitives.module.css";

type Outcome = { readonly ok: boolean; readonly message: string } | null;

/**
 * The pick-up page's own parts (AC 93, 94): Cancel top left and Confirm top right around the Online switch, the line
 * and what it needs, then the projects list with a tick on the left of each card. A ticked site reads Blocked at once;
 * a site with none of the material, or none left to give once the need is covered, can't be ticked. The ticks travel
 * with the filter as `pick`, so filtering keeps them. Confirm stores the move on this device and says that the sites
 * that gave need a new deadline and operator.
 */
export function PickupChooser({
  target,
  lenders,
  sites,
  cards,
  filters,
  initialChosen,
  travel,
  children,
}: {
  target: { readonly siteId: string; readonly siteName: string; readonly lineId: string; readonly lines: readonly PickLine[] };
  /** Every other site and its pick list as the sample has it; null when it can't be read. */
  lenders: readonly { readonly siteId: string; readonly name: string; readonly lines: readonly PickLine[] | null }[];
  sites: readonly FeedSite[];
  cards: Readonly<Record<string, ReactNode>>;
  filters: SiteFilters;
  initialChosen: readonly string[];
  /** Use my location and where distances are from, as on Projects (AC 75). */
  travel: ReactNode;
  /** Why there is no list, when there is none. */
  children?: ReactNode;
}) {
  const pickups = usePickups();
  const targetLines = heldLines(target.siteId, target.lines, pickups);
  const line = targetLines.find((item) => item.id === target.lineId)!;
  const held: Lender[] = lenders.map((lender) => ({ ...lender, lines: lender.lines ? heldLines(lender.siteId, lender.lines, pickups) : null }));
  const [chosen, setChosen] = useState<readonly string[]>(initialChosen);
  const [outcome, setOutcome] = useState<Outcome>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const noticeId = useId();
  const plan = planPickup(line, held, chosen);
  const ticked = Object.fromEntries(chosen.map((siteId) => [siteId, line.materialName]));

  function toggle(siteId: string) {
    setChosen((current) => (current.includes(siteId) ? current.filter((item) => item !== siteId) : [...current, siteId]));
  }

  function confirm() {
    if (plan.total === 0) return;
    const names = plan.siteIds.map((siteId) => held.find((lender) => lender.siteId === siteId)!.name);
    const saved = savePickups((current) => applyPickup(current, { siteId: target.siteId, lineId: line.id, lines: targetLines }, held, plan, new Date().toISOString()));
    setOutcome(saved ? { ok: true, message: `${PICKUP.changed(target.siteName, plan.total, line.unit, names)} ${PICKUP.saved}` } : { ok: false, message: PICKUP.notSaved });
    if (saved) setChosen([]);
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }

  const row = (siteId: string, card: ReactNode) => (
    <PickupRow key={siteId} siteId={siteId} card={card} line={line} lender={held.find((lender) => lender.siteId === siteId)} plan={plan} chosen={chosen.includes(siteId)} onToggle={toggle} />
  );

  return (
    <>
      <header className={`${styles.appBar} ${styles.pickupBar}`}>
        <Link className={styles.button} href={sitePath(target.siteId)}>
          {outcome?.ok ? PICKUP.doneLink : PICKUP.cancel}
        </Link>
        <ConnectionSwitch />
        <button type="button" className={`${styles.button} ${styles.primary}`} disabled={plan.total === 0} onClick={confirm} aria-describedby={titleId}>
          {PICKUP.confirm}
        </button>
      </header>
      <PickerLine />
      <main>
        <h1 id={titleId}>{PICKUP.title}</h1>
        {outcome?.ok ? (
          <div className={`${styles.banner} ${styles.warning}`} role="status">
            <Icon name="warning" />
            <p>{PICKUP.changedBanner}</p>
          </div>
        ) : null}
        <section className={styles.pickCard} aria-label={PICKUP.lineLabel}>
          <h2 className={styles.pickCardTitle}>{line.materialName}</h2>
          <p className={styles.muted}>{PICKUP.amount(target.siteName, line.plannedQty, line.pickedQty)}</p>
          <p>
            <strong>{plan.need > 0 ? PICKUP.need(plan.need, line.unit, line.materialName) : PICKUP.nothingNeeded}</strong>
          </p>
        </section>
        <p>{PICKUP.intro}</p>
        <p className={styles.pickupPlan} aria-live="polite" data-pickup-plan="">
          {chosen.length === 0 ? PICKUP.noneChosen : PICKUP.willTake(plan.total, plan.need, line.unit)}
          {chosen.length > 0 && plan.short > 0 ? ` ${PICKUP.stillShort(plan.short, line.unit)}` : ""}
        </p>
        {travel}
        {children}
        {sites.length > 0 ? (
          <>
            <SiteFilterForm
              key={`${filters.status}|${filters.query}`}
              filters={filters}
              action={`${sitePath(target.siteId)}/picks/pickup`}
              resetHref={pickupPath(target.siteId, line.id)}
              hidden={[["line", line.id], ...chosen.map((siteId) => ["pick", siteId] as const)]}
            />
            <TickedContext.Provider value={ticked}>
              <SiteFeed sites={sites} cards={cards} filters={filters} label={PICKUP.list} row={row} />
            </TickedContext.Provider>
          </>
        ) : null}
      </main>
      <dialog ref={dialogRef} className={dialogStyles.dialog} role="alertdialog" aria-labelledby={noticeId} data-pickup-notice="">
        <div className={dialogStyles.form}>
          <p id={noticeId} className={styles.editNotice}>
            {outcome?.message}
          </p>
          <div className={styles.editNoticeActions}>
            <button type="button" className={`${styles.button} ${styles.primary}`} onClick={() => dialogRef.current?.close()}>
              {PICKUP.done}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}

/** One project of the list: the tick on its left, what it holds of the material, then its card. */
function PickupRow({
  siteId,
  card,
  line,
  lender,
  plan,
  chosen,
  onToggle,
}: {
  siteId: string;
  card: ReactNode;
  line: HeldLine;
  lender: Lender | undefined;
  plan: PickupPlan;
  chosen: boolean;
  onToggle: (siteId: string) => void;
}) {
  const noteId = useId();
  const has = lender?.lines ? available(lender.lines, line.materialName) : null;
  const gives = plan.moves.filter((move) => move.siteId === siteId).reduce((sum, move) => sum + move.qty, 0);
  const covered = !chosen && plan.need > 0 && plan.short === 0;
  const disabled = !chosen && (has === null || has === 0 || plan.need === 0 || covered);
  const note = has === null ? PICKUP.cantRead : has === 0 ? PICKUP.hasNone : covered ? PICKUP.enough : PICKUP.has(has, line.unit);
  return (
    <div className={styles.pickupRow} data-pickup-site={siteId}>
      <label className={`${styles.choiceRow} ${styles.pickupTick}`}>
        <input type="checkbox" checked={chosen} disabled={disabled} onChange={() => onToggle(siteId)} aria-label={PICKUP.choose(lender?.name ?? siteId)} aria-describedby={noteId} />
        <span className={`${styles.choiceMark} ${styles.choiceBox}`} aria-hidden="true" />
      </label>
      <div className={styles.pickupCard}>
        <p id={noteId} className={styles.muted}>
          {gives > 0 ? `${note} · ${PICKUP.takes(gives)}` : note}
        </p>
        {card}
      </div>
    </div>
  );
}
