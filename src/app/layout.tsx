import { Suspense, type ReactNode } from "react";
import { Announcer } from "@/ui/Announcer";
import { OfflineBanner } from "@/ui/ConnectionBar";
import { HEAD_SCRIPT } from "@/ui/head-script";
import { EntryTab } from "@/ui/EntryTab";
import { NavHistory } from "@/ui/NavHistory";
import { LoginGate } from "@/ui/LoginGate";
import { PickOutboxSync } from "@/ui/PickOutboxSync";
import styles from "@/ui/primitives.module.css";
import "./globals.css";

/** The browser's own toolbar matches the black chrome. */
export const viewport = { themeColor: "#000000" };

export const metadata = {
  title: { default: "Team leader", template: "%s · Team leader" },
  description: "Site readiness and shortage decisions",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The head script stamps a remembered theme and the sign-in on <html> before React hydrates, hence the warning
    // opt-out. It is a plain inline script on purpose: next/script's beforeInteractive queues inline code until
    // Next's runtime loads, which would flash light first. React's dev build logs "Encountered a script tag";
    // production does not.
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: HEAD_SCRIPT }} />
      </head>
      <body>
        <Announcer />
        <Suspense fallback={null}>
          <NavHistory />
        </Suspense>
        {/* A visit opened on the projects list starts on the first tab (AC 84). */}
        <EntryTab />
        <div className={styles.appShell} data-app-shell="">
          <div className={styles.appContent}>
            {/* Every screen's own header holds the Online switch (AC 48); the tab bar is the menu at every width (AC 47). */}
            {children}
            <OfflineBanner />
          </div>
        </div>
        {/* The demo sign-in covers every page until someone signs in (AC 59). */}
        <LoginGate />
        {/* Sends pick reports saved offline once the phone is back online (AC 66). Renders nothing. */}
        <PickOutboxSync />
      </body>
    </html>
  );
}
