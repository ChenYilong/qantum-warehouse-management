"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { MAP } from "./messages";
import { useTravel } from "./TravelProvider";
import { directionsUrl, MAP_STYLE, travelLabel, type LatLng, type TravelState } from "./travel";
import styles from "./primitives.module.css";

type MapState = "waiting" | "loading" | "ready" | "failed";

/**
 * A project's map (AC 74): Mapbox GL JS, created only when the card nears the screen, centred on the project with a
 * pin in its signal colour. It does not pan or zoom. A link laid over it, under Mapbox's credits, opens the directions
 * for a tap; it is hidden from keyboards and screen readers, which have Directions below. If the map can't start (no
 * WebGL, Mapbox failing), it hides and Directions still works.
 */
function SiteMap({ siteId, token, location, colour, href }: { siteId: string; token: string; location: LatLng; colour: string; href: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<MapState>("waiting");

  useEffect(() => {
    const element = holder.current;
    if (!element) return;
    let cancelled = false;
    let map: { remove: () => void } | null = null;
    const start = async () => {
      setState("loading");
      try {
        const { default: mapboxgl } = await import("mapbox-gl");
        if (cancelled) return;
        const created = new mapboxgl.Map({
          container: element,
          accessToken: token,
          style: MAP_STYLE,
          center: [location.lng, location.lat],
          zoom: 14,
          interactive: false,
        });
        map = created;
        new mapboxgl.Marker({ color: colour }).setLngLat([location.lng, location.lat]).addTo(created);
        created.once("load", () => {
          if (!cancelled) setState("ready");
        });
        created.on("error", () => {
          if (!cancelled && !created.loaded()) setState("failed");
        });
      } catch {
        if (!cancelled) setState("failed");
      }
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          void start();
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => {
      cancelled = true;
      observer.disconnect();
      map?.remove();
    };
  }, [token, location.lat, location.lng, colour]);

  return (
    <div className={styles.siteMap} data-map={siteId} data-map-state={state}>
      <div ref={holder} className={styles.siteMapCanvas} />
      <a className={styles.siteMapLink} href={href} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true" data-map-link>
        <span className={styles.srOnly}>{MAP.directions}</span>
      </a>
    </div>
  );
}

/**
 * Where a project is and how to get there (AC 74, 75): its map when there is a token, a line about the trip once the
 * phone's position is known, and Directions, which opens the phone's maps app from where it is to the project.
 */
export function SitePlace({
  siteId,
  titleId,
  location,
  token,
  colour,
}: {
  siteId: string;
  titleId: string;
  location: LatLng;
  token: string;
  colour: string;
}) {
  const { fix, routeFor } = useTravel();
  const href = directionsUrl(location);
  let state: TravelState;
  if (fix.status === "ready") {
    const route = routeFor(siteId);
    state = route === undefined ? { kind: "routing" } : { kind: "ready", origin: fix.origin, to: location, route };
  } else {
    state = { kind: fix.status };
  }
  const label = travelLabel(state);
  return (
    <div className={styles.sitePlace}>
      {token ? <SiteMap siteId={siteId} token={token} location={location} colour={colour} href={href} /> : null}
      <div className={styles.sitePlaceRow}>
        {label ? (
          <p className={styles.siteTravel} data-travel={siteId}>
            <Icon name="pin" />
            <span>{label}</span>
          </p>
        ) : null}
        <a className={styles.button} href={href} target="_blank" rel="noopener noreferrer" aria-describedby={titleId}>
          {MAP.directions}
          <Icon name="chevron-right" />
        </a>
      </div>
    </div>
  );
}
