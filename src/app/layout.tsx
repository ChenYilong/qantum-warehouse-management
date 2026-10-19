import { Suspense, type ReactNode } from "react";
import { Announcer } from "@/ui/Announcer";
import { ConnectionBar, OfflineBanner } from "@/ui/ConnectionBar";
import { NavHistory } from "@/ui/NavHistory";
import { SideMenu } from "@/ui/SideMenu";
import { LoginGate } from "@/ui/LoginGate";
import { PickOutboxSync } from "@/ui/PickOutboxSync";
import { HEAD_SCRIPT } from "@/ui/sidebar";
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
    // The head script stamps a remembered theme and sidebar on <html> before React hydrates, hence the warning
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
        <div className={styles.appShell} data-app-shell="">
          <SideMenu />
          <div className={styles.appContent}>
            {/* Above every screen's own header: the picker's last action and the Online switch (AC 48). */}
            <ConnectionBar />
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
