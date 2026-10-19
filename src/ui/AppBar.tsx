import { BackControl } from "./BackControl";
import { Greeting } from "./Greeting";
import type { NavSection } from "./nav-section";
import { TabBar } from "./TabBar";
import { ThemeSwitch } from "./ThemeSwitch";
import styles from "./primitives.module.css";

/**
 * The sticky nav header for an inner screen: one compact row with the back control (a chevron and the name of
 * the screen it returns to). The page title is the page's own `h1` in `main`, shown in full. Top-level screens
 * use `MenuBar` instead: they have the tab bar, inner screens the back control, never both.
 */
export function AppBar({ backHref, backName }: { backHref: string; backName: string }) {
  return (
    <header className={styles.appBar}>
      <BackControl className={styles.backControl} href={backHref} name={backName} />
    </header>
  );
}

/** The header and bottom tab bar for a top-level screen (the landing page, Sites, Materials, Actions log). The header holds the app name and the theme choice. At 1024px and wider the side menu holds both and replaces the tab bar, so this bar is hidden and must not keep a sticky offset. */
export function MenuBar({ current }: { current: NavSection }) {
  return (
    <>
      <header className={`${styles.appBar} ${styles.menuBar}`} data-menu-bar="">
        <span className={styles.menuBarTitle}>
          <Greeting />
        </span>
        <ThemeSwitch />
      </header>
      <TabBar current={current} />
    </>
  );
}
