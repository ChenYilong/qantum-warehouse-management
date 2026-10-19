import Link from "next/link";
import { MenuBar } from "@/ui/AppBar";
import { ACTIONS_PATH, CALENDAR_PATH, MAP_PATH, MATERIALS_PATH, penetrationPath, sitePath } from "@/ui/format";
import { KindIcon, type EntityKind } from "@/ui/KindIcon";
import { NAV } from "@/ui/messages";
import { SignOutButton } from "@/ui/SignOutButton";
import { ThemeSwitch } from "@/ui/ThemeSwitch";
import { TravelButton, TravelProvider } from "@/ui/TravelProvider";
import styles from "@/ui/primitives.module.css";

export const metadata = { title: NAV.about };

/** The Guide's headline; the deploy's smoke test looks for it too (scripts/smoke.mjs). */
export const GUIDE_TITLE = "Know which crews can roll out today";

const TABS: readonly { kind: EntityKind; name: string; href?: string; text: string }[] = [
  { kind: "map", name: NAV.map, href: MAP_PATH, text: "Every job on a real map. Green pins are ready, red pins are stuck. Tap a pin and its job card opens below." },
  { kind: "calendar", name: NAV.calendar, href: CALENDAR_PATH, text: "Each job sits on its due date. Pick the dates you care about, then tap a job to open it." },
  { kind: "site", name: NAV.sites, href: "/sites", text: "The full list of jobs. Search by name or address, or show only the ones that are ready." },
  { kind: "about", name: NAV.about, text: "This page. Come back whenever you need a hand, or to choose light or dark." },
];

const COLOURS: readonly { tone: "go" | "stop" | "unknown" | "idle"; word: string; text: string }[] = [
  { tone: "go", word: "Green", text: "Go. Every part for the job is on the shelf." },
  { tone: "stop", word: "Red", text: "Stop. A part is missing, or the job's records need fixing." },
  { tone: "unknown", word: "Yellow", text: "Hold on. The stock list could not be read just now." },
  { tone: "idle", word: "White", text: "Nothing is booked at this job." },
];

/** The Guide (AC 83): a short brochure on using the app, in plain words, with the tabs as they are today. */
export default function LandingPage() {
  return (
    <>
      <MenuBar current="about" />
      <main>
        <h1 className={styles.guideTitle}>{GUIDE_TITLE}</h1>
        {/* At the top of every tab's page (AC 75, AC 83). The guide lists no projects, so it asks Mapbox for nothing. */}
        <TravelProvider token="" places={[]}>
          <TravelButton />
        </TravelProvider>
        {/* Shown at the top right (AC 60): CSS lifts it above the heading. */}
        <SignOutButton />
        <p className={styles.guideLead}>
          QAntum checks every job against the warehouse shelves, so no team drives out to a site that is missing parts.
          One glance each morning, and you know who can leave.
        </p>

        <section aria-labelledby="tabs-heading" className={styles.guideSection}>
          <h2 id="tabs-heading">Your four tabs</h2>
          <ul className={styles.guideTabs}>
            {TABS.map((tab) => (
              <li key={tab.name} className={styles.guideTab}>
                <span className={styles.guideTabName}>
                  <KindIcon kind={tab.kind} />
                  {tab.name}
                </span>
                <p>{tab.text}</p>
                {tab.href ? (
                  <Link className={styles.button} href={tab.href} aria-label={`Open ${tab.name}`}>
                    {`Open ${tab.name}`}
                  </Link>
                ) : null}
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="colours-heading" className={styles.guideSection}>
          <h2 id="colours-heading">What the colours mean</h2>
          <ul className={styles.guideColours}>
            {COLOURS.map((colour) => (
              <li key={colour.word}>
                <span className={styles.guideSwatch} data-tone={colour.tone} aria-hidden="true" />
                <span>
                  <strong>{colour.word}</strong> {colour.text}
                </span>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="morning-heading" className={styles.guideSection}>
          <h2 id="morning-heading">Your morning in three taps</h2>
          <ol className={styles.guideSteps}>
            <li>Open Map and read the big banner: it counts how many crews are stuck.</li>
            <li>Tap Blocked, then a pin, to see exactly what is missing.</li>
            <li>From the card, text or ring the operator, or tap Sort out shortages to choose what happens next.</li>
          </ol>
          <p className={styles.guideNote}>
            The switch in the top corner shows if you are connected. Slide it off to keep going with no signal; nothing you
            decide is sent until it is back on.
          </p>
        </section>

        <section aria-labelledby="tour-heading" className={styles.guideSection}>
          <h2 id="tour-heading">Try it in two minutes</h2>
          <ol className={styles.guideSteps}>
            <li>
              <p>
                Open <Link href={sitePath("site-b")}>Quayside House</Link>. Two parts are short, so this crew waits.
              </p>
            </li>
            <li>
              <p>
                Inside <Link href={penetrationPath("site-b", "pen-b-01")}>L3, Riser 2</Link>, tap the sealant line, then press
                Escalate to ask a manager for help.
              </p>
            </li>
            <li>Back on that opening, pick option 0451 and press Propose.</li>
            <li>
              <p>
                Visit <Link href={`${sitePath("site-c")}?show=data-problems`}>Northgate Depot</Link> to spot jobs whose
                records need tidying up.
              </p>
            </li>
            <li>
              <p>
                <Link href={MATERIALS_PATH}>{NAV.materials}</Link> sums up stock shared by all jobs, and{" "}
                <Link href={ACTIONS_PATH}>{NAV.actions}</Link> keeps a record of every choice made so far.
              </p>
            </li>
          </ol>
        </section>

        <section aria-labelledby="know-heading" className={styles.guideSection}>
          <h2 id="know-heading">Good to know</h2>
          <ul>
            <li>Everything here is sample data. Only the fire-stopping product list is genuine.</li>
            <li>Sign in as qantum with the password sdfkjh&amp;_24. Everyone who visits shares one set of choices.</li>
            <li>Nothing is ordered or messaged for real. A suggested swap stays a suggestion until a manager checks it.</li>
            <li>
              <p>
                Curious how it was built? <a href="https://github.com/ChenYilong/qantum-warehouse-management">Browse the source on GitHub</a>.
              </p>
            </li>
          </ul>
        </section>

        {/* The theme choice (AC 37): kept here, since the header holds the Online switch now. */}
        <section aria-labelledby="device-heading" className={styles.guideSection}>
          <h2 id="device-heading">Make it yours</h2>
          <ThemeSwitch />
        </section>
      </main>
    </>
  );
}
