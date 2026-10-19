"use client";

import { useConnection } from "./ConnectionBar";
import { Banner } from "./Banner";
import { offlineBannerText } from "./connection";

/** Offline, a pick screen says what it shows is the last known (AC 64, 66). Nothing while online or checking. */
export function PickOfflineNote({ text }: { text: string }) {
  const { state, lastOkAt, now } = useConnection();
  if (state !== "offline") return null;
  return <Banner status={{ label: `${offlineBannerText(lastOkAt, now)} ${text}`, tone: "warning", icon: "warning" }} />;
}
