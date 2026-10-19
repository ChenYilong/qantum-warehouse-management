import { defineConfig } from "@playwright/test";
import { E2E_MAPBOX_TOKEN } from "./tests/e2e/mapbox-fake";

const port = 3100;
const externalBase = process.env.E2E_BASE_URL;
const baseURL = externalBase ?? `http://127.0.0.1:${port}`;
const viewport = { width: 375, height: 812 };

/** Every spec starts signed in to the demo (AC 59), so the sign-in cover does not hide the page under test. The sign-in spec clears it. */
function signedIn(origin: string) {
  return {
    cookies: [],
    origins: [
      {
        origin,
        localStorage: [
          { name: "team-leader:signed-in", value: "1" },
          { name: "team-leader:user", value: "Test lead" },
        ],
      },
    ],
  };
}

const readSpecs = [
  "**/ac30-status-text.spec.ts",
  "**/ac32-viewport.spec.ts",
  "**/accessibility.spec.ts",
  "**/not-found.spec.ts",
  "**/home-status.spec.ts",
  "**/substitutes-empty.spec.ts",
  "**/site-tabs.spec.ts",
  "**/penetration-page.spec.ts",
  "**/navigation-tabs.spec.ts",
  "**/wide-screen.spec.ts",
  "**/today.spec.ts",
  "**/deadline.spec.ts",
  "**/calendar.spec.ts",
  "**/entry.spec.ts",
  "**/back-navigation.spec.ts",
  "**/actions-log.spec.ts",
  "**/field-ui.spec.ts",
  "**/sign-in.spec.ts",
  "**/pick-check.spec.ts",
  "**/sites-filter.spec.ts",
  "**/site-maps.spec.ts",
];

const writeSpecs = ["**/ac31-keyboard.spec.ts", "**/idempotency-key.spec.ts", "**/scenario.spec.ts", "**/pick-report.spec.ts", "**/pick-review.spec.ts"];

function devServer(portNumber: number, distDir: string, stockMode?: string, mapboxToken = "") {
  const stock = stockMode ? `STUB_STOCK_MODE=${stockMode} ` : "";
  // An explicit empty token overrides a developer's .env.local, so the other servers never reach Mapbox.
  return {
    command: `ACTIONS_STORE=memory NEXT_DIST_DIR=${distDir} MAPBOX_PUBLIC_TOKEN=${mapboxToken} ${stock}npx next dev -p ${portNumber} -H 127.0.0.1`,
    url: `http://127.0.0.1:${portNumber}`,
    reuseExistingServer: false,
    timeout: 180_000,
  };
}

export default defineConfig({
  testDir: "tests/e2e",
  fullyParallel: false,
  workers: 1,
  timeout: 300_000,
  expect: { timeout: 30_000 },
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    storageState: signedIn(baseURL),
    browserName: "chromium",
    viewport,
    navigationTimeout: 120_000,
  },
  projects: [
    {
      name: "chromium-375",
      testMatch: readSpecs,
      use: { browserName: "chromium", viewport },
    },
    {
      name: "chromium-375-write",
      dependencies: ["chromium-375"],
      testMatch: writeSpecs,
      use: { browserName: "chromium", viewport },
    },
    {
      name: "stock-down",
      testMatch: "**/stock-down.spec.ts",
      use: { baseURL: "http://127.0.0.1:3101", storageState: signedIn("http://127.0.0.1:3101"), browserName: "chromium", viewport },
    },
    {
      // Mapbox GL JS on a server with a (fake) public token; the spec answers every Mapbox request itself. SwiftShader
      // gives WebGL on CI runners without a GPU.
      name: "maps",
      testMatch: "**/site-maps-token.spec.ts",
      use: {
        baseURL: "http://127.0.0.1:3103",
        storageState: signedIn("http://127.0.0.1:3103"),
        browserName: "chromium",
        viewport,
        launchOptions: { args: ["--enable-unsafe-swiftshader"] },
      },
    },
    {
      name: "stock-malformed",
      testMatch: "**/stock-malformed.spec.ts",
      use: { baseURL: "http://127.0.0.1:3102", storageState: signedIn("http://127.0.0.1:3102"), browserName: "chromium", viewport },
    },
  ],
  // When E2E_BASE_URL is set, no server is started. The stock projects still call 3101 and 3102.
  webServer: externalBase
    ? undefined
    : [
        devServer(port, ".next-e2e"),
        devServer(3101, ".next-e2e-stock-down", "down"),
        devServer(3102, ".next-e2e-stock-malformed", "malformed"),
        devServer(3103, ".next-e2e-maps", undefined, E2E_MAPBOX_TOKEN),
      ],
});
