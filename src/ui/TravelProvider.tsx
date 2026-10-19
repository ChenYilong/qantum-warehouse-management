"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConnection } from "./ConnectionBar";
import { Icon } from "./Icon";
import { MAP } from "./messages";
import { cardTrip, matrixBatches, matrixUrl, originNote, parseMatrix, tripOrigin, type Fix, type LatLng, type TravelState, type TripAnswer } from "./travel";
import styles from "./primitives.module.css";

export interface Place {
  readonly id: string;
  readonly location: LatLng;
}

interface Travel {
  readonly fix: Fix;
  /** What the card for this project says about the trip there (AC 75). */
  readonly tripFor: (siteId: string, to: LatLng) => TravelState;
  readonly locate: () => void;
}

/** Outside a provider: the straight line from the default address, and nothing to ask. */
const NO_TRAVEL: Travel = {
  fix: { status: "idle" },
  tripFor: (_siteId, to) => ({ kind: "ready", origin: tripOrigin({ status: "idle" }), to, route: null }),
  locate: () => undefined,
};

const TravelContext = createContext<Travel>(NO_TRAVEL);

export function useTravel(): Travel {
  return useContext(TravelContext);
}

/**
 * The trip to each project on the list (AC 75). Until the phone shares where it is, every trip starts from the demo's
 * default address. The phone's position is asked for only when "Use my location" is tapped, or by itself when the
 * phone already allows it, and it replaces the default once its answer is in. Online and with a token, one
 * driving-matrix request per nine projects; otherwise every project gets the straight line and no drive time. The
 * position goes only to Mapbox and is never stored.
 */
export function TravelProvider({ token, places, children }: { token: string; places: readonly Place[]; children: ReactNode }) {
  const connection = useConnection();
  const [fix, setFix] = useState<Fix>({ status: "idle" });
  const [answer, setAnswer] = useState<TripAnswer | null>(null);
  const asked = useRef(0);

  const locate = useCallback(() => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setFix({ status: "unavailable" });
      return;
    }
    const request = ++asked.current;
    setFix({ status: "locating" });
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (request !== asked.current) return;
        setFix({ status: "ready", origin: { lat: position.coords.latitude, lng: position.coords.longitude } });
      },
      (error) => {
        if (request !== asked.current) return;
        setFix({ status: error.code === error.PERMISSION_DENIED ? "denied" : "unavailable" });
      },
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    );
  }, []);

  // Without a tap, only when the phone has already allowed this site its location.
  useEffect(() => {
    let live = true;
    navigator.permissions
      ?.query({ name: "geolocation" })
      .then((status) => {
        if (live && status.state === "granted") locate();
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [locate]);

  const origin = tripOrigin(fix);
  const online = connection.state === "online";
  const placesKey = places.map((place) => `${place.id}@${place.location.lat},${place.location.lng}`).join("|");
  const startKey = `${origin.kind}@${origin.point.lat},${origin.point.lng}`;
  const requestKey = token && online && places.length > 0 ? `${startKey}|${placesKey}` : "";

  useEffect(() => {
    if (requestKey === "") return;
    const abort = new AbortController();
    const start = origin;
    const batches = matrixBatches(places);
    void Promise.all(
      batches.map(async (batch) => {
        try {
          const response = await fetch(
            matrixUrl(
              start.point,
              batch.map((place) => place.location),
              token,
            ),
            { cache: "no-store", signal: abort.signal },
          );
          const parsed = parseMatrix(response.ok ? await response.json() : null, batch.length);
          return batch.map((place, index) => [place.id, parsed[index] ?? null] as const);
        } catch {
          return batch.map((place) => [place.id, null] as const);
        }
      }),
    ).then((answers) => {
      if (!abort.signal.aborted) setAnswer({ key: requestKey, origin: start, byId: Object.fromEntries(answers.flat()) });
    });
    return () => abort.abort();
    // The key covers the start, the token, the connection and the projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const value = useMemo<Travel>(
    () => ({
      fix,
      tripFor: (siteId, to) => cardTrip({ key: requestKey, origin: tripOrigin(fix) }, answer, siteId, to),
      locate,
    }),
    [fix, locate, requestKey, answer],
  );

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

/** "Use my location" (AC 75): one tap for every project on the list, and the line that says where distances are from. */
export function TravelButton() {
  const { fix, locate } = useTravel();
  return (
    <div className={styles.travelBar}>
      <button type="button" className={styles.button} onClick={locate} disabled={fix.status === "locating"} aria-describedby="travel-hint">
        <Icon name="pin" />
        {fix.status === "ready" ? MAP.updateLocation : MAP.useLocation}
      </button>
      <p id="travel-hint" className={styles.muted} data-travel-note="" aria-live="polite">
        {originNote(fix.status)}
      </p>
    </div>
  );
}
