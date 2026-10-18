"use client";

import Link from "next/link";
import { KindIcon } from "./KindIcon";
import { ABOUT_PATH } from "./format";
import { NAV } from "./messages";
import { NAV_ITEMS, type NavSection } from "./nav-section";
import { ThemeSwitch } from "./ThemeSwitch";
import styles from "./primitives.module.css";

/**
 * The wide side menu's entries, under its title row and Collapse control. `collapsed` hides Theme; CSS clips
 * the labels on the icon rail before paint so the links keep their names. Below 1024px the same entries are
 * the top-level pages' bottom tab bar.
 */
export function NavContent({
  current,
  collapsed,
  navId,
}: {
  current: NavSection | "none";
  collapsed: boolean;
  navId: string;
}) {
  return (
    <>
      <nav id={navId} aria-label={NAV.label} className={styles.navPanel}>
        <ul className={styles.navItems}>
          {NAV_ITEMS.map((item) => (
            <li key={item.section}>
              <Link
                className={styles.navItem}
                href={item.href}
                aria-current={item.section === current ? "page" : undefined}
                title={item.label}
              >
                <KindIcon kind={item.kind} />
                <span className={styles.navLabel}>{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
        {/* About the demo is not part of the work, so it sits apart from the main entries. */}
        <ul className={`${styles.navItems} ${styles.navSecondary}`}>
          <li>
            <Link className={styles.navItem} href={ABOUT_PATH} aria-current={current === "about" ? "page" : undefined} title={NAV.about}>
              <KindIcon kind="about" />
              <span className={styles.navLabel}>{NAV.about}</span>
            </Link>
          </li>
        </ul>
      </nav>
      <div className={styles.navFooter} hidden={collapsed}>
        <ThemeSwitch />
      </div>
    </>
  );
}
