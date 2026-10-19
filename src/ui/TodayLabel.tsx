"use client";

import { useSyncExternalStore } from "react";
import { TODAY, todayText } from "./today";
import styles from "./primitives.module.css";

const subscribeToNothing = () => () => undefined;
const readDay = () => todayText(new Date());
const readNoDay = () => "";

/**
 * The panel's first line: the open tab's name, then "today is Tuesday 20 October 2026", the day from the browser.
 * The server has no browser, so its render names the tab alone and the date follows as the page starts.
 */
export function TodayLabel({ tab }: { tab: string }) {
  const day = useSyncExternalStore(subscribeToNothing, readDay, readNoDay);
  return (
    <span className={styles.verdictToday} data-today-label="">
      <span className={styles.verdictTabName}>{tab}</span>
      {day ? ` · ${TODAY.todayIs} ${day}` : null}
    </span>
  );
}
