"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useConnection } from "./ConnectionBar";
import { Icon } from "./Icon";
import { MAP } from "./messages";
import { matrixBatches, matrixUrl, parseMatrix, type LatLng, type Route } from "./travel";
import styles from "./primitives.module.css";

/** Where the phone is, as far as this page knows (AC 75). */
type Fix =
  | { readonly status: "idle" }
  | { readonly status: "locating" }
  | { readonly status: "denied" }
  | { readonly status: "unavailable" }
  | { readonly status: "ready"; readonly origin: LatLng };

export interface Place {
  readonly id: string;
  readonly location: LatLng;
}

interface Travel {
  readonly fix: Fix;
  /** Undefined while the drive is being worked out; null when there is no route. */
  readonly routeFor: (siteId: string) => Route | null | undefined;
  readonly locate: () => void;
}

const TravelContext = createContext<Travel>({ fix: { status: "idle" }, routeFor: () => null, locate: () => undefined });

export function useTravel(): Travel {
  return useContext(TravelContext);
}

/** The routes worked out for one fix and one set of projects, so an answer for an older request is never shown. */
interface Routes {
  readonly key: string;
  readonly byId: Readonly<Record<string, Route | null>>;
}

/**
 * The phone's position and the drive to each project on the list (AC 75). It asks for the position only when
 * "Show distance and time" is tapped, or by itself when the phone already allows it. Then, online and with a token,
 * one driving-matrix request per nine projects; otherwise every project gets the straight line and no drive time.
 * The position goes only to Mapbox and is never stored.
 */
export function TravelProvider({ token, places, children }: { token: string; places: readonly Place[]; children: ReactNode }) {
  const connection = useConnection();
  const [fix, setFix] = useState<Fix>({ status: "idle" });
  const [routes, setRoutes] = useState<Routes>({ key: "", byId: {} });
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

  const origin = fix.status === "ready" ? fix.origin : null;
  const online = connection.state === "online";
  const placesKey = places.map((place) => `${place.id}@${place.location.lat},${place.location.lng}`).join("|");
  const requestKey = origin && token && online && places.length > 0 ? `${origin.lat},${origin.lng}|${placesKey}` : "";

  useEffect(() => {
    if (!origin || requestKey === "") return;
    const abort = new AbortController();
    const batches = matrixBatches(places);
    void Promise.all(
      batches.map(async (batch) => {
        try {
          const response = await fetch(
            matrixUrl(
              origin,
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
      if (!abort.signal.aborted) setRoutes({ key: requestKey, byId: Object.fromEntries(answers.flat()) });
    });
    return () => abort.abort();
    // The key covers the origin, the token, the connection and the projects.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestKey]);

  const value = useMemo<Travel>(
    () => ({
      fix,
      routeFor: (siteId) => {
        if (requestKey === "") return null;
        if (routes.key !== requestKey) return undefined;
        return routes.byId[siteId] ?? null;
      },
      locate,
    }),
    [fix, locate, requestKey, routes],
  );

  return <TravelContext.Provider value={value}>{children}</TravelContext.Provider>;
}

/** "Show distance and time" (AC 75): one tap for every project on the list. */
export function TravelButton() {
  const { fix, locate } = useTravel();
  return (
    <div className={styles.travelBar}>
      <button type="button" className={styles.button} onClick={locate} disabled={fix.status === "locating"} aria-describedby="travel-hint">
        <Icon name="pin" />
        {fix.status === "ready" ? MAP.updateDistance : MAP.showDistance}
      </button>
      <p id="travel-hint" className={styles.muted}>
        {MAP.distanceHint}
      </p>
    </div>
  );
}
