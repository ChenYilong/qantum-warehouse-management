import type { NextConfig } from "next";
import { mapboxTokenForBuild } from "./src/server/mapbox";

function distDirectory(): string {
  const value = process.env.NEXT_DIST_DIR ?? "";
  if (/^[A-Za-z0-9._-]+$/.test(value) && !value.includes("..")) return value;
  return ".next";
}

const nextConfig: NextConfig = {
  distDir: distDirectory(),
  poweredByHeader: false,
  // The public Mapbox token for the project maps (AC 74, 76), baked in for the server only: the projects page hands it
  // to the maps as they render. A secret token (sk.) fails the build here; anything but a public one means no map.
  env: {
    MAPBOX_PUBLIC_TOKEN: mapboxTokenForBuild(process.env.MAPBOX_PUBLIC_TOKEN),
  },
  // The dev indicator sits bottom-left, over the top-level pages' tab bar. Errors still surface without it.
  devIndicators: false,
  // The catalogue CSV is read at runtime, so the serverless trace must include it for pages and API routes alike.
  outputFileTracingIncludes: {
    "/**/*": ["./data/solutions-excerpt.csv"],
  },
  // The About page lives at its own path; the root sends visitors there. Temporary (307), so browsers do not cache it
  // and the root can become a real page later. The destination matches ABOUT_PATH in src/ui/format.ts (a unit test pins it).
  async redirects() {
    return [{ source: "/", destination: "/about-this-demo", permanent: false }];
  },
};

export default nextConfig;
