import { describe, expect, it } from "vitest";
import {
  cardTrip,
  DEFAULT_ORIGIN,
  directionsUrl,
  formatDistance,
  formatDuration,
  MAP_STYLE,
  markerColour,
  MATRIX_MAX_DESTINATIONS,
  matrixBatches,
  matrixUrl,
  originNote,
  parseMatrix,
  publicMapboxToken,
  straightLineMetres,
  travelLabel,
  tripOrigin,
  validLocation,
} from "@/ui/travel";

// Project maps (AC 74 to 76): where a project is, the way there, and how far and how long, never made up.

const OFFICE = { lat: -36.86, lng: 174.77 };
const CEDAR = { lat: -36.8443, lng: 174.7676 };

describe("AC 74: a project's location and the directions to it", () => {
  it("accepts finite coordinates in range, and nothing else (0,0 is missing data, not a place)", () => {
    expect(validLocation({ lat: -36.8443, lng: 174.7676 })).toEqual(CEDAR);
    expect(validLocation({ lat: 90, lng: -180 })).toEqual({ lat: 90, lng: -180 });
    for (const bad of [
      undefined,
      null,
      "-36.8,174.7",
      {},
      { lat: -36.8 },
      { lat: "-36.8", lng: 174.7 },
      { lat: Number.NaN, lng: 174.7 },
      { lat: -91, lng: 174.7 },
      { lat: -36.8, lng: 181 },
      { lat: 0, lng: 0 },
      { lat: Number.POSITIVE_INFINITY, lng: 1 },
    ]) {
      expect(validLocation(bad), JSON.stringify(bad)).toBeNull();
    }
  });

  it("opens Google Maps directions from where the phone is to the project's point", () => {
    expect(directionsUrl(CEDAR)).toBe("https://www.google.com/maps/dir/?api=1&destination=-36.8443%2C174.7676&travelmode=driving");
    expect(directionsUrl({ lat: -36.123456789, lng: 174.1 })).toBe(
      "https://www.google.com/maps/dir/?api=1&destination=-36.123457%2C174.1&travelmode=driving",
    );
  });

  it("draws the streets style with a pin in the project's signal colour", () => {
    expect(MAP_STYLE).toBe("mapbox://styles/mapbox/streets-v12");
    expect(markerColour("clear")).toBe("#3ddc6c");
    expect(markerColour("blocked")).toBe("#b3001b");
    expect(markerColour("unavailable")).toBe("#fed105");
    expect(markerColour("nothing_planned")).toBe("#5c5c5c");
    expect(markerColour("anything else")).toBe("#5c5c5c");
  });
});

describe("AC 75: how far and how long", () => {
  it("measures the straight line on the earth's surface", () => {
    expect(straightLineMetres(OFFICE, OFFICE)).toBe(0);
    // About 1.8 km from Grafton to the waterfront.
    expect(Math.round(straightLineMetres(OFFICE, CEDAR))).toBe(1759);
    expect(Math.round(straightLineMetres({ lat: 0, lng: 0 }, { lat: 0, lng: 1 }) / 10) * 10).toBe(111200);
  });

  it("writes metres under a kilometre, one decimal under 100 km, whole kilometres beyond", () => {
    expect(formatDistance(0)).toBe("0 m");
    expect(formatDistance(847)).toBe("850 m");
    expect(formatDistance(999)).toBe("1.0 km");
    expect(formatDistance(12_340)).toBe("12.3 km");
    expect(formatDistance(99_940)).toBe("99.9 km");
    expect(formatDistance(123_456)).toBe("123 km");
  });

  it("writes at least a minute, then hours and minutes", () => {
    expect(formatDuration(0)).toBe("1 min");
    expect(formatDuration(1_070)).toBe("18 min");
    expect(formatDuration(3_570)).toBe("1 h");
    expect(formatDuration(5_100)).toBe("1 h 25 min");
    expect(formatDuration(7_200)).toBe("2 h");
  });

  it("says the drive when there is a route, the straight line and no time when there isn't, and names the default start", () => {
    const phone = { kind: "phone", point: OFFICE } as const;
    const fallback = { kind: "default", point: DEFAULT_ORIGIN.point } as const;
    expect(travelLabel({ kind: "routing" })).toBe("Working out the drive…");
    expect(travelLabel({ kind: "ready", origin: phone, to: CEDAR, route: { metres: 12_340, seconds: 1_070 } })).toBe("12.3 km · 18 min drive");
    expect(travelLabel({ kind: "ready", origin: phone, to: CEDAR, route: null })).toBe("1.8 km in a straight line · no drive time");
    expect(travelLabel({ kind: "ready", origin: fallback, to: CEDAR, route: { metres: 2_300, seconds: 420 } })).toBe("2.3 km · 7 min drive from 5\u00a0Arawa Street");
    // 2,228 m from 5 Arawa Street to Cedar Court, worked out independently of this code.
    expect(travelLabel({ kind: "ready", origin: fallback, to: CEDAR, route: null })).toBe("2.2 km in a straight line from 5\u00a0Arawa Street · no drive time");
  });

  it("asks the driving matrix for at most nine places per request, from the phone to each project", () => {
    expect(MATRIX_MAX_DESTINATIONS).toBe(9);
    expect(matrixBatches([1, 2, 3])).toEqual([[1, 2, 3]]);
    expect(matrixBatches(Array.from({ length: 20 }, (_, i) => i)).map((batch) => batch.length)).toEqual([9, 9, 2]);
    expect(matrixBatches([])).toEqual([]);
    expect(matrixUrl(OFFICE, [CEDAR, { lat: -36.841, lng: 174.7571 }], "pk.test/token")).toBe(
      "https://api.mapbox.com/directions-matrix/v1/mapbox/driving/174.77,-36.86;174.7676,-36.8443;174.7571,-36.841" +
        "?sources=0&destinations=1;2&annotations=distance,duration&access_token=pk.test%2Ftoken",
    );
  });

  it("reads each project's metres and seconds, and treats anything it can't trust as no route", () => {
    const ok = { code: "Ok", distances: [[12_340, 3_100]], durations: [[1_070, 540]] };
    expect(parseMatrix(ok, 2)).toEqual([
      { metres: 12_340, seconds: 1_070 },
      { metres: 3_100, seconds: 540 },
    ]);
    // No road to the second project: that one has no route, the first still does.
    expect(parseMatrix({ code: "Ok", distances: [[12_340, null]], durations: [[1_070, null]] }, 2)).toEqual([{ metres: 12_340, seconds: 1_070 }, null]);
    expect(parseMatrix({ code: "Ok", distances: [[-1]], durations: [[60]] }, 1)).toEqual([null]);
    expect(parseMatrix({ code: "Ok", distances: [["12"]], durations: [[60]] }, 1)).toEqual([null]);
    for (const bad of [null, "Ok", {}, { code: "NoRoute", distances: [[1]], durations: [[1]] }, { code: "Ok", distances: [[1, 2]], durations: [[1]] }, { code: "Ok", distances: [], durations: [] }]) {
      expect(parseMatrix(bad, 2), JSON.stringify(bad)).toEqual([null, null]);
    }
  });
});

describe("AC 75: until the phone shares where it is, trips start from 5 Arawa Street", () => {
  it("is a real point in Grafton (OpenStreetMap), with its address; a no-break space keeps the number with the street", () => {
    expect(DEFAULT_ORIGIN.address).toBe("5\u00a0Arawa Street, Grafton, Auckland 1023");
    expect(DEFAULT_ORIGIN.name).toBe("5\u00a0Arawa Street");
    expect(validLocation(DEFAULT_ORIGIN.point)).toEqual({ lat: -36.8643, lng: 174.7661 });
  });

  it("starts from the phone only once it has a fix, and from the default in every other case", () => {
    for (const status of ["idle", "locating", "denied", "unavailable"] as const) {
      expect(tripOrigin({ status }), status).toEqual({ kind: "default", point: DEFAULT_ORIGIN.point });
    }
    expect(tripOrigin({ status: "ready", origin: OFFICE })).toEqual({ kind: "phone", point: OFFICE });
  });

  it("says above the list where distances are from, and why when the phone's location is missing", () => {
    expect(originNote("idle")).toBe(
      "Distances are from 5\u00a0Arawa Street, Grafton, Auckland 1023 until you use this phone's location. Only Mapbox sees it, to work out the drive.",
    );
    expect(originNote("locating")).toBe("Finding where you are… Until then, distances are from 5\u00a0Arawa Street, Grafton, Auckland 1023.");
    expect(originNote("denied")).toBe("Location is off, so distances are from 5\u00a0Arawa Street, Grafton, Auckland 1023.");
    expect(originNote("unavailable")).toBe("Can't find where you are right now, so distances are from 5\u00a0Arawa Street, Grafton, Auckland 1023.");
    expect(originNote("ready")).toBe("Distances are from where this phone is. Only Mapbox sees its location, to work out the drive.");
  });

  it("keeps the shown answer until the new start's answer arrives, and gives the straight line when there is nothing to ask", () => {
    const fallback = { kind: "default", point: DEFAULT_ORIGIN.point } as const;
    const phone = { kind: "phone", point: OFFICE } as const;
    const drive = { metres: 2_300, seconds: 420 };
    const fromDefault = { key: "default", origin: fallback, byId: { "site-a": drive, "site-b": null } };
    // No token, or offline: nothing to ask, so the straight line from the current start.
    expect(cardTrip({ key: "", origin: phone }, fromDefault, "site-a", CEDAR)).toEqual({ kind: "ready", origin: phone, to: CEDAR, route: null });
    // Before any answer.
    expect(cardTrip({ key: "default", origin: fallback }, null, "site-a", CEDAR)).toEqual({ kind: "routing" });
    // The answer for this start.
    expect(cardTrip({ key: "default", origin: fallback }, fromDefault, "site-a", CEDAR)).toEqual({ kind: "ready", origin: fallback, to: CEDAR, route: drive });
    // The phone's fix is in but not its answer: the default's answer stays, still saying where it is from.
    expect(cardTrip({ key: "phone", origin: phone }, fromDefault, "site-a", CEDAR)).toEqual({ kind: "ready", origin: fallback, to: CEDAR, route: drive });
    // No road, or a project the answer does not cover: the straight line from the answer's start.
    expect(cardTrip({ key: "default", origin: fallback }, fromDefault, "site-b", CEDAR)).toEqual({ kind: "ready", origin: fallback, to: CEDAR, route: null });
    expect(cardTrip({ key: "default", origin: fallback }, fromDefault, "site-z", CEDAR)).toEqual({ kind: "ready", origin: fallback, to: CEDAR, route: null });
  });
});

describe("AC 76: only a public Mapbox token", () => {
  it("keeps a public token, trimmed, and turns anything else into no map", () => {
    expect(publicMapboxToken("pk.abc.DEF-123_x")).toBe("pk.abc.DEF-123_x");
    expect(publicMapboxToken("  pk.abc  ")).toBe("pk.abc");
    for (const value of [undefined, "", "pk.", "sk.abc", "tk.abc", "pk.has space", "abc", `pk.${"a".repeat(2_100)}`]) {
      expect(publicMapboxToken(value), String(value).slice(0, 20)).toBe("");
    }
  });
});
