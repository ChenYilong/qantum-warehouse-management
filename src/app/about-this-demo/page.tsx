import Link from "next/link";
import { MenuBar } from "@/ui/AppBar";
import { ACTIONS_PATH, MATERIALS_PATH, penetrationPath, sitePath } from "@/ui/format";
import { NAV } from "@/ui/messages";

export const metadata = { title: NAV.about };

/** The guide: what the tool is for, what is real in the demo, how to move around, then a short tour. */
export default function LandingPage() {
  return (
    <>
      <MenuBar current="about" />
      <main>
        <h1>Is the crew good to go?</h1>
        <p>
          Before a crew heads out, this tool compares what each job needs with what the warehouse holds. When a material
          falls short, you choose the next step: hold off, raise it with a manager, or put forward a replacement for review.
        </p>
        <section aria-labelledby="demo-heading">
          <h2 id="demo-heading">How this demo works</h2>
          <ul>
            <li>The projects and stock levels are made up for the demo. The fire-stopping catalogue comes from a real supplier list.</li>
            <li>There is no sign-in, so anyone with the link sees and adds to the same set of decisions.</li>
            <li>No orders or messages leave the app. A suggested replacement is only a catalogue match, waiting for a manager to verify it.</li>
            <li>
              <p>
                Want the code, the specifications or the notes on building it with AI agents? They are all in the{" "}
                <a href="https://github.com/ChenYilong/qantum-warehouse-management">GitHub repository</a>.
              </p>
            </li>
          </ul>
        </section>
        <section aria-labelledby="way-heading">
          <h2 id="way-heading">Getting around</h2>
          <ul>
            <li>
              <p>
                Switch between <Link href="/sites">{NAV.sites}</Link>, <Link href={MATERIALS_PATH}>{NAV.materials}</Link>,{" "}
                <Link href={ACTIONS_PATH}>{NAV.actions}</Link> and this guide from the bar at the bottom of a phone screen, or
                the menu at the side of a larger one.
              </p>
            </li>
            <li>Deeper pages open with a back link that says where it leads: the page you arrived from, or else the one above it.</li>
            <li>Inside a project, filter chips narrow the list, and small icons on each row flag problems and past decisions. Every penetration keeps its own Decisions tab.</li>
          </ul>
        </section>
        <section aria-labelledby="try-heading">
          <h2 id="try-heading">A quick tour</h2>
          <ol>
            <li>
              <p>
                Start at <Link href={sitePath("site-b")}>Quayside House</Link>. Every penetration has its own row, with chips
                showing what holds the crew back.
              </p>
            </li>
            <li>
              <p>
                Go into <Link href={penetrationPath("site-b", "pen-b-01")}>L3, Riser 2</Link> and tap the sealant line to
                reach the sealant page for Quayside House. Escalate it and come back: the crew remains blocked until the stock
                turns up.
              </p>
            </li>
            <li>Still on that penetration, pick candidate 0451 and propose it.</li>
            <li>Its Decisions tab now lists both the escalation and the proposal.</li>
            <li>
              <p>
                Visit <Link href={`${sitePath("site-c")}?show=data-problems`}>Northgate Depot</Link> with the data-problems
                filter on.
              </p>
            </li>
            <li>
              <p>
                <Link href={MATERIALS_PATH}>{NAV.materials}</Link> compares each material&apos;s shared stock with what every
                project needs, and <Link href={ACTIONS_PATH}>{NAV.actions}</Link> gathers everything decided so far, project by
                project.
              </p>
            </li>
          </ol>
        </section>
      </main>
    </>
  );
}
