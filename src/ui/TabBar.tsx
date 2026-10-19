import Link from "next/link";
import { KindIcon } from "./KindIcon";
import { ABOUT_PATH } from "./format";
import { NAV } from "./messages";
import { NAV_ITEMS, type NavSection } from "./nav-section";
import styles from "./primitives.module.css";

const TABS = [...NAV_ITEMS, { section: "about", href: ABOUT_PATH, label: NAV.about, kind: "about" } as const];

/**
 * The top-level pages' menu at every width (AC 37, AC 47): a tab bar fixed to the foot of the screen, its entries
 * in the page's column on a wide screen. Only top-level pages render it, so it is gone on inner screens.
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
