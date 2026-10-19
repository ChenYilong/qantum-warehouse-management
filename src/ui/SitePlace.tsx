"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./Icon";
import { MAP } from "./messages";
import { useTravel } from "./TravelProvider";
import { directionsUrl, MAP_STYLE, travelLabel, type LatLng } from "./travel";
import styles from "./primitives.module.css";

type MapState = "waiting" | "loading" | "ready" | "failed";

/**
 * A project's map (AC 74), under the project's name and above its signal, as wide as the signal: Mapbox GL JS,
 * created only when the card nears the screen, centred on the project with a pin in its signal colour. It does not
 * pan or zoom. A link laid over it, under Mapbox's credits, opens the directions for a tap; it is hidden from keyboards
 * and screen readers, which have Directions at the card's foot. If the map can't start (no WebGL, Mapbox failing), it
 * hides and Directions still works.
 */
export function SiteMap({ siteId, token, location, colour }: { siteId: string; token: string; location: LatLng; colour: string }) {
  const holder = useRef<HTMLDivElement>(null);
  const href = directionsUrl(location);
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
 * How to get to a project (AC 74, 75), at the card's foot: how far it is and how long the drive takes, from the phone
 * once it shares where it is and from the default address until then, and Directions, which opens the phone's maps
 * app from where it is to the project.
 */
export function SitePlace({ siteId, titleId, location }: { siteId: string; titleId: string; location: LatLng }) {
  const { tripFor } = useTravel();
  const href = directionsUrl(location);
  const label = travelLabel(tripFor(siteId, location));
  return (
    <div className={styles.sitePlaceRow}>
      <p className={styles.siteTravel} data-travel={siteId}>
        <Icon name="pin" />
        <span>{label}</span>
      </p>
      <a className={styles.button} href={href} target="_blank" rel="noopener noreferrer" aria-describedby={titleId}>
        {MAP.directions}
        <Icon name="chevron-right" />
      </a>
    </div>
  );
}
