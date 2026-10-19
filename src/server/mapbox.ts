// Relative import: next.config.ts loads this file at build time, before the "@/" alias exists.
import { publicMapboxToken } from "../ui/travel";

/**
 * The Mapbox token at build time (AC 76), for next.config.ts: a secret token (`sk.`) stops the build rather than
 * reaching a page; a public one (`pk.`) is kept; anything else is no map.
 */
export function mapboxTokenForBuild(raw: string | undefined): string {
  const value = (raw ?? "").trim();
  if (value.startsWith("sk.")) {
    throw new Error("MAPBOX_PUBLIC_TOKEN holds a secret Mapbox token (sk.). Use a public token (pk.), restricted to the app's URLs.");
  }
  return publicMapboxToken(value);
}

/**
 * The token for the projects page to hand its maps (AC 74, 76): the public token next.config.ts baked in, or "" for
 * no map. It is public by design (Mapbox's browser token), never a server credential.
 */
export function mapboxPublicToken(): string {
  return publicMapboxToken(process.env.MAPBOX_PUBLIC_TOKEN);
}
