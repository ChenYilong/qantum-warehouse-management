"use client";

import { Fragment, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode } from "react";
import {
  CALENDAR,
  endOfYear,
  localDate,
  monthTitle,
  monthWeeks,
  openingMonth,
  ovalLabel,
  rangeProblem,
  shiftMonth,
  visibleProjects,
  type CalendarModel,
  type CalendarProject,
  type Month,
} from "./calendar";
import dialogStyles from "./decisions/decisions.module.css";
import { Icon } from "./Icon";
import { NAV } from "./messages";
import { useSiteEdits } from "./SiteEdits";
import { withEditedDeadlines } from "./site-edits";
import { TodayLabel } from "./TodayLabel";
import { MiniKnob } from "./MiniKnob";
import type { SignalTone } from "./signal";
import { inTab, nextTab, segmentLit, TODAY, TODAY_TABS, type TodayTabId } from "./today";
import styles from "./primitives.module.css";

const TONE_CLASS: Readonly<Record<SignalTone, string>> = {
  go: styles.signalGo!,
  stop: styles.signalStop!,
  unknown: styles.signalUnknown!,
  idle: styles.signalIdle!,
};

// Today on the phone, read when the page runs there; the server's render has no today, so it holds every deadline.
const subscribeToNothing = () => () => undefined;
const readToday = () => localDate(new Date());
const readNoDay = () => "";

/**
 * The deadline calendar (AC 81, 82): a copy of today's map panel (`TodayPanel`, unchanged) with a month calendar in
 * place of the map. The verdict, the bar and the tabs are the same, with ids and names of their own; under the
 * calendar is the chosen project's card, the list's own (`cards`, rendered on the server by the same component). Each
 * project of the chosen tab whose deadline falls between From and To sits on its date as a small copy of its signal;
 * a tap on one takes the card.
 */
export function CalendarPanel({ calendar, cards }: { calendar: CalendarModel; cards: Readonly<Record<string, ReactNode>> }) {
  const today = useSyncExternalStore(subscribeToNothing, readToday, readNoDay);
  const [tab, setTab] = useState<TodayTabId>(calendar.initialTab);
  const [fromInput, setFromInput] = useState<string | null>(null);
  const [toInput, setToInput] = useState<string | null>(null);
  const [chosenId, setChosenId] = useState<string | null>(null);
  /** A month the leader moved to; until then the calendar follows the chosen project. */
  const [movedTo, setMovedTo] = useState<Month | null>(null);
  const tabRefs = useRef<Partial<Record<TodayTabId, HTMLButtonElement | null>>>({});

  const from = fromInput ?? today;
  const to = toInput ?? endOfYear(today);
  const problem = rangeProblem(from, to);
  // A deadline moved on this device sits on its new date (AC 86).
  const projects = withEditedDeadlines(calendar.projects, useSiteEdits());
  const shown = visibleProjects(projects, tab, from, to);
  const chosen = shown.find((project) => project.id === chosenId) ?? shown[0] ?? null;
  const month = movedTo ?? openingMonth(chosen, from, today);
  const empty = projects.some((project) => inTab(project, tab)) ? CALENDAR.noDeadlines : CALENDAR.noProjects;

  const choose = (next: TodayTabId) => {
    setTab(next);
    setChosenId(null);
    setMovedTo(null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextTab(TODAY_TABS, tab, event.key);
    if (next === null) return;
    event.preventDefault();
    choose(next);
    tabRefs.current[next]?.focus();
  };

  const changeDates = (change: () => void) => {
    change();
    setChosenId(null);
    setMovedTo(null);
  };

  return (
    <div className={styles.today} data-today={calendar.tone} data-calendar-panel="">
      <section className={styles.verdict} aria-labelledby="calendar-verdict" data-calendar-verdict="">
        <div className={styles.verdictTop}>
          <TodayLabel tab={NAV.calendar} />
          <span className={styles.verdictTotals}>{calendar.totals}</span>
        </div>
        <h2 id="calendar-verdict" className={styles.verdictHeadline}>
          {calendar.headline}
        </h2>
        {calendar.segments.length > 0 ? (
          <div className={styles.verdictBar} role="img" aria-label={calendar.barLabel}>
            {calendar.segments.map((kind, index) => (
              <span key={`${kind}-${index}`} className={styles.verdictSegment} data-segment={kind} data-lit={segmentLit(kind, tab) ? "" : undefined} />
            ))}
          </div>
        ) : null}
        <div className={styles.verdictTabs} role="tablist" aria-label={CALENDAR.tabsLabel} onKeyDown={onKeyDown}>
          {calendar.tabs.map((item) => {
            const selected = item.id === tab;
            return (
              <button
                key={item.id}
                ref={(element) => {
                  tabRefs.current[item.id] = element;
                }}
                type="button"
                role="tab"
                id={`calendar-tab-${item.id}`}
                className={styles.verdictTab}
                aria-selected={selected}
                aria-controls="calendar-tabpanel"
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(item.id)}
              >
                {item.label}
              </button>
            );
          })}
        </div>
      </section>
      <div role="tabpanel" id="calendar-tabpanel" aria-labelledby={`calendar-tab-${tab}`} className={styles.todayTabPanel}>
        <section className={styles.calendar} aria-label={CALENDAR.calendarLabel}>
          <div className={styles.calendarRange} role="group" aria-label={CALENDAR.rangeLabel}>
            <div className={dialogStyles.field}>
              <label className={dialogStyles.label} htmlFor="calendar-from">
                {CALENDAR.from}
              </label>
              <input
                id="calendar-from"
                type="date"
                className={dialogStyles.control}
                value={from}
                max={to || undefined}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? "calendar-range-problem" : undefined}
                onChange={(event) => {
                  const value = event.target.value;
                  changeDates(() => setFromInput(value));
                }}
              />
            </div>
            <div className={dialogStyles.field}>
              <label className={dialogStyles.label} htmlFor="calendar-to">
                {CALENDAR.to}
              </label>
              <input
                id="calendar-to"
                type="date"
                className={dialogStyles.control}
                value={to}
                min={from || undefined}
                aria-invalid={problem ? true : undefined}
                aria-describedby={problem ? "calendar-range-problem" : undefined}
                onChange={(event) => {
                  const value = event.target.value;
                  changeDates(() => setToInput(value));
                }}
              />
            </div>
          </div>
          {problem ? (
            <p id="calendar-range-problem" className={styles.calendarProblem}>
              {problem}
            </p>
          ) : null}
          <div className={styles.calendarHead}>
            <button type="button" className={styles.calendarStep} aria-label={CALENDAR.previous} disabled={!month} onClick={() => month && setMovedTo(shiftMonth(month, -1))}>
              <Icon name="chevron-left" />
            </button>
            <h3 id="calendar-month" className={styles.calendarTitle} aria-live="polite">
              {month ? monthTitle(month) : null}
            </h3>
            <button type="button" className={styles.calendarStep} aria-label={CALENDAR.next} disabled={!month} onClick={() => month && setMovedTo(shiftMonth(month, 1))}>
              <Icon name="chevron-right" />
            </button>
          </div>
          {month ? <MonthGrid month={month} today={today} projects={shown} chosenId={chosen?.id ?? null} onChoose={setChosenId} /> : null}
        </section>
        <section id="calendar-card" className={styles.todayCard} aria-label={CALENDAR.cardLabel}>
          {chosen ? <Fragment key={chosen.id}>{cards[chosen.id] ?? null}</Fragment> : <p className={styles.todayEmpty}>{empty}</p>}
        </section>
      </div>
    </div>
  );
}

/** One month, Monday first: each day with its number, today ringed, and the deadlines that fall on it as ovals. */
function MonthGrid({
  month,
  today,
  projects,
  chosenId,
  onChoose,
}: {
  month: Month;
  today: string;
  projects: readonly CalendarProject[];
  chosenId: string | null;
  onChoose: (id: string) => void;
}) {
  return (
    <table className={styles.calendarGrid} aria-labelledby="calendar-month">
      <thead>
        <tr>
          {CALENDAR.weekdays.map(([short, long]) => (
            <th key={short} scope="col" abbr={long}>
              {short}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {monthWeeks(month).map((week) => (
          <tr key={week[0]?.iso}>
            {week.map((day) => (
              <td key={day.iso} data-date={day.iso} data-in-month={day.inMonth ? "" : undefined} data-today-date={day.iso === today ? "" : undefined}>
                {day.inMonth ? (
                  <>
                    <span className={styles.calendarDay}>{day.day}</span>
                    {projects
                      .filter((project) => project.deadline?.iso === day.iso)
                      .map((project) => (
                        <Oval key={project.id} project={project} chosen={project.id === chosenId} onChoose={onChoose} />
                      ))}
                  </>
                ) : null}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/**
 * A project on its deadline: a small copy of the card's big signal (the same capsule, colours, knob shape and knob
 * side) in a 48px button named by the project, its status and its deadline; pressed when chosen.
 */
function Oval({ project, chosen, onChoose }: { project: CalendarProject; chosen: boolean; onChoose: (id: string) => void }) {
  const { signal } = project;
  return (
    <button
      type="button"
      className={styles.calendarSite}
      data-calendar-site={project.id}
      aria-pressed={chosen}
      aria-label={ovalLabel(project)}
      aria-controls="calendar-card"
      onClick={() => onChoose(project.id)}
    >
      <span className={`${styles.calendarOval} ${TONE_CLASS[signal.tone]}`} data-oval="" data-tone={signal.tone} data-knob={signal.knob} aria-hidden="true">
        <MiniKnob shape={signal.shape} />
      </span>
      <span className={styles.calendarSiteName} aria-hidden="true">
        {project.shortName}
      </span>
    </button>
  );
}
