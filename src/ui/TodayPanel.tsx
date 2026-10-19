"use client";

import "mapbox-gl/dist/mapbox-gl.css";
import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { Icon } from "./Icon";
import { KindIcon } from "./KindIcon";
import { OperatorRow } from "./OperatorRow";
import { StatusChip } from "./StatusChip";
import { firstProject, nextTab, schematicPositions, segmentGroup, TODAY, TODAY_GROUPS, type Today, type TodayGroup, type TodayProject } from "./today";
import { DEFAULT_ORIGIN, MAP_STYLE, type LatLng } from "./travel";
import styles from "./primitives.module.css";

type MapState = "none" | "loading" | "ready" | "failed";

/** How far from the map's edges a pin may sit, so its label and the drawer over the map's foot never hide it. */
const PIN_ROOM = { insetX: 64, insetTop: 40, insetBottom: 64 } as const;

/** Mapbox's camera, fitted to the pins with the same room. */
const FIT_PADDING = { top: PIN_ROOM.insetTop, bottom: PIN_ROOM.insetBottom, left: PIN_ROOM.insetX, right: PIN_ROOM.insetX } as const;

/** Waits this long for Mapbox before falling back to the plain panel. */
const MAP_TIMEOUT_MS = 8_000;

interface MapboxLike {
  project: (lngLat: [number, number]) => { x: number; y: number };
  fitBounds: (bounds: [[number, number], [number, number]], options: object) => void;
  jumpTo: (options: { center: [number, number]; zoom: number }) => void;
  resize: () => void;
  remove: () => void;
  loaded: () => boolean;
  once: (event: "load", listener: () => void) => void;
  on: (event: "error", listener: () => void) => void;
}

/**
 * Today's panel (AC 77 to 79), after the author's design "I · Verdict + tabs + map (B+D+E)": the verdict with its bar
 * and, inside it, the tabs; then the chosen tab's map and the drawer. The tab, the bar, the pins and the drawer move
 * together: a tab lights its segments, shows its pins and opens the drawer on its first project; a pin takes the
 * drawer.
 */
export function TodayPanel({ today, token }: { today: Today; token: string }) {
  const [group, setGroup] = useState<TodayGroup>(today.initialGroup);
  const [chosenId, setChosenId] = useState<string | null>(firstProject(today.projects, today.initialGroup)?.id ?? null);
  const tabRefs = useRef<Partial<Record<TodayGroup, HTMLButtonElement | null>>>({});
  const shown = today.projects.filter((project) => project.group === group);
  const chosen = shown.find((project) => project.id === chosenId) ?? shown[0] ?? null;

  const choose = (next: TodayGroup) => {
    setGroup(next);
    setChosenId(firstProject(today.projects, next)?.id ?? null);
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const next = nextTab(TODAY_GROUPS, group, event.key);
    if (next === null) return;
    event.preventDefault();
    choose(next);
    tabRefs.current[next]?.focus();
  };

  return (
    <div className={styles.today} data-today={today.tone}>
      <section className={styles.verdict} aria-labelledby="today-verdict" data-verdict="">
        <div className={styles.verdictTop}>
          <span className={styles.verdictToday}>{TODAY.today}</span>
          <span className={styles.verdictTotals}>{today.totals}</span>
        </div>
        <h2 id="today-verdict" className={styles.verdictHeadline}>
          {today.headline}
        </h2>
        {today.segments.length > 0 ? (
          <div className={styles.verdictBar} role="img" aria-label={today.barLabel}>
            {today.segments.map((kind, index) => (
              <span key={`${kind}-${index}`} className={styles.verdictSegment} data-segment={kind} data-lit={segmentGroup(kind) === group ? "" : undefined} />
            ))}
          </div>
        ) : null}
        <div className={styles.verdictTabs} role="tablist" aria-label={TODAY.tabsLabel} onKeyDown={onKeyDown}>
          {today.tabs.map((tab) => {
            const selected = tab.group === group;
            return (
              <button
                key={tab.group}
                ref={(element) => {
                  tabRefs.current[tab.group] = element;
                }}
                type="button"
                role="tab"
                id={`today-tab-${tab.group}`}
                className={styles.verdictTab}
                aria-selected={selected}
                aria-controls="today-tabpanel"
                tabIndex={selected ? 0 : -1}
                onClick={() => choose(tab.group)}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </section>
      <div role="tabpanel" id="today-tabpanel" aria-labelledby={`today-tab-${group}`} className={styles.todayTabPanel}>
        <ProjectsMap projects={shown} chosenId={chosen?.id ?? null} onChoose={setChosenId} token={token} />
        <Drawer project={chosen} />
      </div>
    </div>
  );
}

/**
 * The chosen tab's projects as pins (AC 79). With a token, on a Mapbox map fitted to them that does not pan or zoom;
 * without one, or when the map can't load, on a plain panel in their relative places. A pin is a 48px button; the
 * chosen one is larger and pressed.
 */
function ProjectsMap({
  projects,
  chosenId,
  onChoose,
  token,
}: {
  projects: readonly TodayProject[];
  chosenId: string | null;
  onChoose: (id: string) => void;
  token: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxLike | null>(null);
  const [state, setState] = useState<MapState>(token ? "loading" : "none");
  const [size, setSize] = useState<{ width: number; height: number } | null>(null);
  /** Where Mapbox put each pin, for one set of pins at one size, so a stale placement is never shown. */
  const [projected, setProjected] = useState<{ readonly key: string; readonly points: readonly { x: number; y: number }[] } | null>(null);
  const placed = projects.filter((project): project is TodayProject & { location: LatLng } => project.location !== null);
  const placesKey = placed.map((project) => `${project.id}@${project.location.lat},${project.location.lng}`).join("|");
  const viewKey = `${placesKey}|${size ? `${size.width}x${size.height}` : ""}`;

  useEffect(() => {
    const element = box.current;
    if (!element) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setSize({ width: rect.width, height: rect.height });
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const element = canvas.current;
    if (!token || !element) return;
    let cancelled = false;
    let created: MapboxLike | null = null;
    const timer = setTimeout(() => {
      if (!cancelled && !(created?.loaded() ?? false)) setState("failed");
    }, MAP_TIMEOUT_MS);
    const start = async () => {
      try {
        const { default: mapboxgl } = await import("mapbox-gl");
        if (cancelled) return;
        const instance = new mapboxgl.Map({
          container: element,
          accessToken: token,
          style: MAP_STYLE,
          center: [DEFAULT_ORIGIN.point.lng, DEFAULT_ORIGIN.point.lat],
          zoom: 11,
          interactive: false,
        }) as unknown as MapboxLike;
        created = instance;
        map.current = instance;
        instance.once("load", () => {
          if (!cancelled) setState("ready");
        });
        instance.on("error", () => {
          if (!cancelled && !instance.loaded()) setState("failed");
        });
      } catch {
        if (!cancelled) setState("failed");
      }
    };
    void start();
    return () => {
      cancelled = true;
      clearTimeout(timer);
      created?.remove();
      map.current = null;
    };
  }, [token]);

  // Fit the camera to the chosen tab's pins whenever they or the map's size change, then ask Mapbox where they are.
  useEffect(() => {
    const instance = map.current;
    if (state !== "ready" || !instance || !size) return;
    instance.resize();
    const first = placed[0]?.location;
    if (first && placed.length === 1) {
      instance.jumpTo({ center: [first.lng, first.lat], zoom: 13 });
    } else if (placed.length > 1) {
      const lngs = placed.map((project) => project.location.lng);
      const lats = placed.map((project) => project.location.lat);
      instance.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: FIT_PADDING, maxZoom: 14, animate: false },
      );
    }
    const frame = requestAnimationFrame(() => {
      setProjected({ key: viewKey, points: placed.map((project) => instance.project([project.location.lng, project.location.lat])) });
    });
    return () => cancelAnimationFrame(frame);
    // The view key covers the pins and the map's size.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state, viewKey]);

  // On the map, Mapbox's placement once it is in; on the plain panel, the projects' relative places.
  const positions =
    state === "ready"
      ? projected?.key === viewKey
        ? projected.points
        : null
      : state === "loading" || !size
        ? null
        : schematicPositions(
            placed.map((project) => project.location),
            { width: size.width, height: size.height, ...PIN_ROOM },
          );

  return (
    <div ref={box} className={styles.projectsMap} role="group" aria-label={TODAY.mapLabel} data-projects-map={state}>
      {token ? <div ref={canvas} className={styles.projectsMapCanvas} /> : null}
      {positions && size
        ? placed.map((project, index) => {
            const at = positions[index];
            if (!at) return null;
            const chosen = project.id === chosenId;
            return (
              <button
                key={project.id}
                type="button"
                className={styles.pin}
                data-pin={project.id}
                data-side={at.x > size.width * 0.6 ? "left" : "right"}
                aria-pressed={chosen}
                aria-label={`${project.name}, ${project.status.label}`}
                aria-controls="today-drawer"
                style={{ left: `${at.x}px`, top: `${at.y}px` }}
                onClick={() => onChoose(project.id)}
              >
                <span className={styles.pinSpot} aria-hidden="true">
                  <span className={styles.pinDot} data-pin-dot="" style={{ background: project.colour }} />
                </span>
                <span className={styles.pinLabel} aria-hidden="true">
                  {project.shortName}
                </span>
              </button>
            );
          })
        : null}
    </div>
  );
}

/** The chosen project (AC 79), in the project's own words: what its card says, without its map. */
function Drawer({ project }: { project: TodayProject | null }) {
  return (
    <section id="today-drawer" className={styles.drawer} aria-label={TODAY.drawerLabel}>
      <span className={styles.drawerHandle} aria-hidden="true" />
      {project ? (
        <>
          <StatusChip status={project.status} />
          <Link id="today-drawer-name" className={styles.drawerTitle} href={project.href}>
            <span className={styles.kindTitle}>
              <KindIcon kind="site" />
              {project.name}
            </span>
            <Icon name="chevron-right" />
          </Link>
          <div className={styles.drawerDetails}>
            {project.details.map((line) => (
              <p key={line}>{line}</p>
            ))}
          </div>
          {project.operator ? <OperatorRow operator={project.operator} describedBy="today-drawer-name" nameId="today-drawer-operator" /> : null}
          {project.decide ? (
            <div className={styles.siteCardActions}>
              <Link className={`${styles.button} ${styles.primary}`} href={project.decide.href} aria-describedby="today-drawer-name">
                {project.decide.label}
                <Icon name="chevron-right" />
              </Link>
            </div>
          ) : null}
        </>
      ) : (
        <p>{TODAY.empty}</p>
      )}
    </section>
  );
}
