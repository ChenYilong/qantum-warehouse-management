import Link from "next/link";
import { KindIcon } from "./KindIcon";
import { ABOUT_PATH } from "./format";
import { NAV } from "./messages";
import { NAV_ITEMS, type NavSection } from "./nav-section";
import styles from "./primitives.module.css";

const TABS = [...NAV_ITEMS, { section: "about", href: ABOUT_PATH, label: NAV.about, kind: "about" } as const];

/**
 * The top-level pages' menu below 1024px (AC 37): the same entries as the side menu, as a tab bar fixed to the
 * foot of the screen. Only top-level pages render it, so it is gone on inner screens. From 1024px the side menu
 * replaces it.
 */
export function TabBar({ current }: { current: NavSection }) {
  return (
    <nav aria-label={NAV.label} className={styles.bottomTabs} data-tab-bar="">
      <ul className={styles.bottomTabItems}>
        {TABS.map((tab) => (
          <li key={tab.section}>
            <Link className={styles.bottomTab} href={tab.href} aria-current={tab.section === current ? "page" : undefined}>
              <KindIcon kind={tab.kind} />
              <span>{tab.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
