import type { Page, Route } from "@playwright/test";

/** A fake public Mapbox token for the maps server (AC 74). Shaped like one, so Mapbox GL JS can read it; it opens nothing. */
export const E2E_MAPBOX_TOKEN = "pk.eyJ1IjoiZTJlIiwiYSI6InRlc3QifQ.e2e-only";

/** A style with no sources, only a background: the map loads with no tiles, fonts or icons. */
const STYLE = {
  version: 8,
  name: "e2e",
  sources: {},
  layers: [{ id: "background", type: "background", paint: { "background-color": "#dfe8df" } }],
};

/** The drive from the test's location to the four sample projects, in list order. */
export const MATRIX = { code: "Ok", distances: [[2_300, 3_100, 16_800, 7_400]], durations: [[420, 540, 1_260, 780]] };

const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "*", "Access-Control-Allow-Methods": "GET, POST, OPTIONS" };

/** Answers every request to Mapbox, so no test reaches the internet. Returns the matrix requests it has seen. */
export async function answerMapbox(page: Page): Promise<string[]> {
  const matrix: string[] = [];
  await page.route(/^https:\/\/([a-z0-9-]+\.)*mapbox\.com\//, async (route: Route) => {
    const request = route.request();
    const url = request.url();
    if (request.method() === "OPTIONS") return route.fulfill({ status: 204, headers: CORS });
    if (url.includes("/styles/v1/")) return route.fulfill({ json: STYLE, headers: CORS });
    if (url.includes("/directions-matrix/v1/")) {
      matrix.push(url);
      return route.fulfill({ json: MATRIX, headers: CORS });
    }
    return route.fulfill({ status: 204, headers: CORS });
  });
  return matrix;
}
