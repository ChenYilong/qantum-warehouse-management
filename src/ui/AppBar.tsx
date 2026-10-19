import { BackControl } from "./BackControl";
import { ConnectionSwitch, PickerLine } from "./ConnectionBar";
import { Greeting } from "./Greeting";
import type { NavSection } from "./nav-section";
import { TabBar } from "./TabBar";
import styles from "./primitives.module.css";

/**
 * The sticky nav header for an inner screen: one compact row with the back control (a chevron and the name of
 * the screen it returns to) and the Online switch (AC 48), then the picker's last action under it. The page title is
 * the page's own `h1` in `main`, shown in full. Top-level screens use `MenuBar` instead: they have the tab bar, inner
 * screens the back control, never both.
 */
export function AppBar({ backHref, backName }: { backHref: string; backName: string }) {
  return (
    <>
      <header className={styles.appBar}>
        <BackControl className={styles.backControl} href={backHref} name={backName} />
        <ConnectionSwitch />
      </header>
      <PickerLine />
    </>
  );
}

/**
 * The header and bottom tab bar for a top-level screen (the Guide, Projects, Inventory, Decisions): the greeting and
 * the Online switch, which stays at the top while the page scrolls (AC 48). The tab bar is the menu at every width
 * (AC 37, AC 47); the theme choice is on the Guide.
 */
export function MenuBar({ current }: { current: NavSection }) {
  return (
    <>
      <header className={`${styles.appBar} ${styles.menuBar}`} data-menu-bar="">
        <span className={styles.menuBarTitle}>
          <Greeting />
        </span>
        <ConnectionSwitch />
      </header>
      <PickerLine />
      <TabBar current={current} />
    </>
  );
}

/** The error screen's header (AC 48): the Online switch only, so even a failed screen says whether the phone is online. */
export function StatusBar() {
  return (
    <>
      <header className={styles.appBar}>
        <ConnectionSwitch />
      </header>
      <PickerLine />
    </>
  );
}
