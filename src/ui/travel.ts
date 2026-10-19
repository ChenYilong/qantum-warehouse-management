/**
 * Project maps (AC 74 to 76): where a project is, the way there from the phone, and how far and how long the drive
 * is. Pure, so every number on the card can be tested; nothing here is ever made up when a source is missing.
 */

export interface LatLng {
  readonly lat: number;
  readonly lng: number;
}

/** A drive from the phone to a project, from Mapbox's driving matrix. */
export interface Route {
  readonly metres: number;
  readonly seconds: number;
}

/** What the card can say about the trip there. */
export type TravelState =
  | { readonly kind: "idle" }
  | { readonly kind: "locating" }
  | { readonly kind: "routing" }
  | { readonly kind: "denied" }
  | { readonly kind: "unavailable" }
  | { readonly kind: "ready"; readonly origin: LatLng; readonly to: LatLng; readonly route: Route | null };

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

/** The card's line about the trip (AC 75). Nothing until asked; never a drive time without a route. */
export function travelLabel(state: TravelState): string | null {
  switch (state.kind) {
    case "idle":
      return null;
    case "locating":
      return "Finding where you are…";
    case "routing":
      return "Working out the drive…";
    case "denied":
      return "Location is off, so no distance.";
    case "unavailable":
      return "Can't find where you are right now.";
    case "ready":
      return state.route
        ? `${formatDistance(state.route.metres)} · ${formatDuration(state.route.seconds)} drive`
        : `${formatDistance(straightLineMetres(state.origin, state.to))} in a straight line · no drive time`;
  }
}

/** Splits the projects into requests of at most nine, in order. */
export function matrixBatches<T>(items: readonly T[], size: number = MATRIX_MAX_DESTINATIONS): T[][] {
  const batches: T[][] = [];
  for (let start = 0; start < items.length; start += size) batches.push(items.slice(start, start + size));
  return batches;
}

/** One driving-matrix request: the phone first, then each project; distances and durations from the phone only. */
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
