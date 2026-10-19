/**
 * Project maps (AC 74 to 76): where a project is, the way there, and how far and how long the drive is, from the
 * phone once it shares where it is and from a default address until then. Pure, so every number on the card can be
 * tested; nothing here is ever made up when a source is missing.
 */

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/** A drive from the start to a project, from Mapbox's driving matrix. */
export interface Route {
  readonly metres: number;
  readonly seconds: number;
}

/**
 * The demo's start until the phone shares where it is (AC 75): 5 Arawa Street, Grafton, Auckland 1023. The point is
 * the building's, from OpenStreetMap (Nominatim and Photon agree, 2026-10-19), to four decimals (about 10 m). A
 * no-break space keeps the number with the street, so a narrow card never ends a line with "from 5".
 */
export const DEFAULT_ORIGIN = {
  name: "5\u00a0Arawa Street",
  address: "5\u00a0Arawa Street, Grafton, Auckland 1023",
  point: { lat: -36.8643, lng: 174.7661 },
} as const;

/** Where the phone is, as far as this page knows (AC 75). */
export type Fix =
  | { readonly status: "idle" }
  | { readonly status: "locating" }
  | { readonly status: "denied" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly origin: LatLng };

/** Where a trip starts: the phone once it has a fix, the default address until then. */
export interface Origin {
  readonly kind: "phone" | "default";
  readonly point: LatLng;
}

/** What the card can say about the trip there. */
export type TravelState =
  | { readonly kind: "routing" }
  | { readonly kind: "ready"; readonly origin: Origin; readonly to: LatLng; readonly route: Route | null };

/** Mapbox's answer for one start and one set of projects: each project's route, or null for none. */
export interface TripAnswer {
  readonly key: string;
  readonly origin: Origin;
  readonly byId: Readonly<Record<string, Route | null>>;
}

/** Mapbox's streets style: roads and names, which a crew needs, without the 3D of the default style. */
export const MAP_STYLE = "mapbox://styles/mapbox/streets-v12";

/** The driving matrix takes ten coordinates per request: the phone and nine projects. */
export const MATRIX_MAX_DESTINATIONS = 9;

const EARTH_RADIUS_METRES = 6_371_008.8;

function isCoordinate(value: unknown, limit: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && Math.abs(value) <= limit;
}

/** A point the map and the directions can trust: finite, in range, and not 0,0 (which is missing data, not a place). */
export function validLocation(value: unknown): LatLng | null {
  if (typeof value !== "object" || value === null) return null;
  const { lat, lng } = value as { lat?: unknown; lng?: unknown };
  if (!isCoordinate(lat, 90) || !isCoordinate(lng, 180)) return null;
  if (lat === 0 && lng === 0) return null;
  return { lat, lng };
}

/** Six decimals is about 10 cm: enough for a site entrance, and a stable string for a URL. */
function coordinate(value: number): string {
  return String(Number(value.toFixed(6)));
}

/** Google Maps directions from wherever the phone is (no origin given) to the project, by car. */
export function directionsUrl(to: LatLng): string {
  const params = new URLSearchParams({ api: "1", destination: `${coordinate(to.lat)},${coordinate(to.lng)}`, travelmode: "driving" });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** The pin takes the project's signal colour (AC 52), so the map agrees with the card. */
export function markerColour(crewStatus: string): string {
  if (crewStatus === "clear") return "#3ddc6c";
  if (crewStatus === "blocked") return "#b3001b";
  if (crewStatus === "unavailable") return "#fed105";
  return "#5c5c5c";
}

/** The great-circle distance (haversine), for when there is no route. */
export function straightLineMetres(from: LatLng, to: LatLng): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const dLat = radians(to.lat - from.lat);
  const dLng = radians(to.lng - from.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(radians(from.lat)) * Math.cos(radians(to.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METRES * Math.asin(Math.min(1, Math.sqrt(a)));
}

/** Metres to the nearest 10 under a kilometre, one decimal under 100 km, whole kilometres beyond. */
export function formatDistance(metres: number): string {
  const rounded = Math.round(metres / 10) * 10;
  if (rounded < 1_000) return `${rounded} m`;
  if (metres < 99_950) return `${(metres / 1_000).toFixed(1)} km`;
  return `${Math.round(metres / 1_000)} km`;
}

/** At least a minute; hours and minutes from an hour. */
export function formatDuration(seconds: number): string {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
}

/** The phone once it has a fix; the default address before that, and whenever the phone can't say where it is. */
export function tripOrigin(fix: Fix): Origin {
  return fix.status === "ready" ? { kind: "phone", point: fix.origin } : { kind: "default", point: DEFAULT_ORIGIN.point };
}

/**
 * The card's line about the trip (AC 75): the drive when there is a route, else the straight line and no drive time,
 * naming the default address when the trip starts there. Never a drive time without a route.
 */
export function travelLabel(state: TravelState): string {
  if (state.kind === "routing") return "Working out the drive…";
  const from = state.origin.kind === "default" ? ` from ${DEFAULT_ORIGIN.name}` : "";
  return state.route
    ? `${formatDistance(state.route.metres)} · ${formatDuration(state.route.seconds)} drive${from}`
    : `${formatDistance(straightLineMetres(state.origin.point, state.to))} in a straight line${from} · no drive time`;
}

/** The line above the list (AC 75): where distances are from, and why when the phone's location is missing. */
export function originNote(status: Fix["status"]): string {
  switch (status) {
    case "idle":
      return `Distances are from ${DEFAULT_ORIGIN.address} until you use this phone's location. Only Mapbox sees it, to work out the drive.`;
    case "locating":
      return `Finding where you are… Until then, distances are from ${DEFAULT_ORIGIN.address}.`;
    case "denied":
      return `Location is off, so distances are from ${DEFAULT_ORIGIN.address}.`;
    case "unavailable":
      return `Can't find where you are right now, so distances are from ${DEFAULT_ORIGIN.address}.`;
    case "ready":
      return "Distances are from where this phone is. Only Mapbox sees its location, to work out the drive.";
  }
}

/**
 * What one card shows (AC 75). With nothing to ask (no token, offline), the straight line from the current start.
 * Otherwise the latest answer, from its own start: a new start replaces the shown line only when its answer arrives.
 * Before any answer, routing.
 */
export function cardTrip(request: { readonly key: string; readonly origin: Origin }, answer: TripAnswer | null, siteId: string, to: LatLng): TravelState {
  if (request.key === "") return { kind: "ready", origin: request.origin, to, route: null };
  if (answer === null) return { kind: "routing" };
  return { kind: "ready", origin: answer.origin, to, route: answer.byId[siteId] ?? null };
}

/** Splits the projects into requests of at most nine, in order. */
export function matrixBatches<T>(items: readonly T[], size: number = MATRIX_MAX_DESTINATIONS): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size));
  return batches;
}

/** One driving-matrix request: the start first (the phone or the default address), then each project; from the start only. */
export function matrixUrl(origin: LatLng, destinations: readonly LatLng[], token: string): string {
  const points = [origin, ...destinations].map((point) => `${coordinate(point.lng)},${coordinate(point.lat)}`).join(";");
  const targets = destinations.map((_, index) => index + 1).join(";");
  return (
    `https://api.mapbox.com/directions-matrix/v1/mapbox/driving/${points}` +
    `?sources=0&destinations=${targets}&annotations=distance,duration&access_token=${encodeURIComponent(token)}`
  );
}

function trusted(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0;
}

/** Each project's route from a matrix answer, or null where it can't be trusted (no road, bad number, bad answer). */
export function parseMatrix(json: unknown, count: number): (Route | null)[] {
  const none = Array.from({ length: count }, () => null);
  if (typeof json !== "object" || json === null) return none;
  const { code, distances, durations } = json as { code?: unknown; distances?: unknown; durations?: unknown };
  if (code !== "Ok" || !Array.isArray(distances) || !Array.isArray(durations)) return none;
  const metres: unknown = distances[0];
  const seconds: unknown = durations[0];
  if (!Array.isArray(metres) || !Array.isArray(seconds) || metres.length !== count || seconds.length !== count) return none;
  return metres.map((distance, index) => {
    const duration: unknown = seconds[index];
    return trusted(distance) && trusted(duration) ? { metres: distance, seconds: duration } : null;
  });
}

/** A public Mapbox token (`pk.`), trimmed; anything else, a secret token (`sk.`) included, is no map (AC 76). */
export function publicMapboxToken(value: string | undefined): string {
  const token = (value ?? "").trim();
  return /^pk\.[A-Za-z0-9._-]{1,2000}$/.test(token) ? token : "";
}
