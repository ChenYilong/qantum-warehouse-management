"use client";

import type { ReactNode } from "react";

/**
 * The amber signal of a site that can't be checked: a tap asks again (a reload), and never calls. A client
 * component only for the click; the face is drawn on the server and passed in.
 */
export function ReloadSignal({
  className,
  tone,
  knob,
  describedBy,
  children,
}: {
  className: string;
  tone: string;
  knob: string;
  describedBy?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={className}
      data-signal={tone}
      data-knob={knob}
      aria-describedby={describedBy}
      onClick={() => window.location.reload()}
    >
      {children}
    </button>
  );
}
