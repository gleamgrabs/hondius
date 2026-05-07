"use client";

import { useEffect, useState } from "react";
import {
  MapContainer,
  TileLayer,
  Polyline,
  CircleMarker,
  Marker,
  Tooltip,
  Popup,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { CaseEntry, RouteWaypoint } from "@/lib/types";
import {
  completedRouteCoords,
  upcomingRouteCoords,
} from "@/data/outbreaks/hondius-2026/locations";
import { formatDate } from "@/lib/seo";

interface MapInnerProps {
  cases: CaseEntry[];
  route: RouteWaypoint[];
  /** Slug for live polling. If omitted, no client-side polling. */
  outbreakSlug?: string;
}

/**
 * Подгружает свежие cases из /api/outbreaks/{slug}/cases раз в 60 сек.
 * - Только когда вкладка видна (document.visibilityState === 'visible').
 * - Initial render использует SSR-cases (для SEO + быстрого первого фрейма).
 * - Replacement маркеров происходит только если набор реально изменился (по id+caseCount+deaths).
 */
function useLiveCases(initial: CaseEntry[], slug?: string): CaseEntry[] {
  const [cases, setCases] = useState<CaseEntry[]>(initial);

  useEffect(() => {
    if (!slug || typeof window === "undefined") return;

    let cancelled = false;
    const url = `/api/outbreaks/${encodeURIComponent(slug)}/cases`;

    async function fetchOnce() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) return;
        const json = (await res.json()) as { ok: boolean; cases?: CaseEntry[] };
        if (cancelled || !json.ok || !Array.isArray(json.cases)) return;
        setCases((prev) => (sameSignature(prev, json.cases!) ? prev : json.cases!));
      } catch {
        /* network error — silent, will retry on next interval */
      }
    }

    // Первый запрос — после mount.
    fetchOnce();

    // Polling 60s, только если вкладка видна.
    const id = window.setInterval(fetchOnce, 60_000);

    // Сразу подтягиваем при возврате к вкладке.
    const onVisibility = () => {
      if (document.visibilityState === "visible") fetchOnce();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [slug]);

  return cases;
}

function sameSignature(a: CaseEntry[], b: CaseEntry[]): boolean {
  if (a.length !== b.length) return false;
  const sig = (c: CaseEntry) =>
    `${c.id}|${c.caseCount}|${c.deaths}|${c.status}|${c.coords.join(",")}`;
  const aSet = new Set(a.map(sig));
  return b.every((c) => aSet.has(sig(c)));
}

function FitBounds() {
  const map = useMap();
  useEffect(() => {
    map.fitBounds(
      [
        [-65, -70],
        [30, 30],
      ],
      { padding: [30, 30] }
    );
  }, [map]);
  return null;
}

function radiusForCases(n: number): number {
  return Math.max(22, Math.sqrt(n) * 16);
}

function makePulsingIcon(count: number, sizePx: number) {
  return L.divIcon({
    className: "case-marker-wrap",
    html: `
      <div class="case-marker" style="width:${sizePx}px;height:${sizePx}px;position:relative;transform:translate(-50%,-50%);">
        <div class="case-pulse"></div>
        <div class="case-pulse case-pulse-2"></div>
        <div class="case-dot" style="opacity:0.85;"></div>
        <div class="case-count">${count}</div>
      </div>
    `,
    iconSize: [sizePx, sizePx],
    iconAnchor: [0, 0],
  });
}

const SHIP_ICON = L.divIcon({
  className: "ship-marker-wrap",
  html: `<div class="ship-marker">▲</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

// Linear interpolation between waypoints, returns position at time t∈[0,1] along the path
function pointAlongPath(
  path: Array<[number, number]>,
  t: number
): [number, number] {
  if (path.length < 2) return path[0] ?? [0, 0];
  const segments = path.length - 1;
  const scaled = t * segments;
  const seg = Math.min(Math.floor(scaled), segments - 1);
  const local = scaled - seg;
  const [a, b] = [path[seg], path[seg + 1]];
  return [a[0] + (b[0] - a[0]) * local, a[1] + (b[1] - a[1]) * local];
}

function AnimatedShip() {
  // Ship sails along the upcoming route (Cabo Verde → Canaries → Tenerife) repeatedly
  const path = upcomingRouteCoords;
  const [pos, setPos] = useState<[number, number]>(path[0]);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      setPos(pointAlongPath(path, 0.4));
      return;
    }

    const start = Date.now();
    const period = 18_000; // 18s per cycle
    let raf: number;
    const tick = () => {
      const t = ((Date.now() - start) % period) / period;
      // ease in-out: ship slows down at endpoints
      const eased = 0.5 - 0.5 * Math.cos(Math.PI * t);
      setPos(pointAlongPath(path, eased));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [path]);

  return <Marker position={pos} icon={SHIP_ICON} interactive={false} />;
}

export default function MapInner({
  cases,
  route,
  outbreakSlug,
}: MapInnerProps) {
  const liveCases = useLiveCases(cases, outbreakSlug);
  return (
    <MapContainer
      center={[0, -20]}
      zoom={2}
      style={{ height: "100%", width: "100%" }}
      scrollWheelZoom={false}
      zoomControl={true}
      attributionControl={true}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={20}
      />
      <FitBounds />

      {/* Completed route — solid blue line */}
      <Polyline
        positions={completedRouteCoords}
        pathOptions={{
          color: "#4a92e0",
          weight: 2,
          opacity: 0.9,
        }}
      />

      {/* Upcoming route — dashed */}
      <Polyline
        positions={upcomingRouteCoords}
        pathOptions={{
          color: "#4a92e0",
          weight: 2,
          opacity: 0.55,
          dashArray: "4, 6",
        }}
      />

      {/* Animated ship */}
      <AnimatedShip />

      {/* Route waypoints */}
      {route.map((wp) => {
        const isDisembark = wp.type === "disembark";
        const isDenied = wp.type === "denied";
        return (
          <CircleMarker
            key={wp.name}
            center={wp.coords}
            radius={isDisembark ? 7 : 4}
            pathOptions={{
              color: isDisembark
                ? "#f5a524"
                : isDenied
                ? "#ff3b30"
                : "#4a92e0",
              fillColor: isDisembark
                ? "#f5a524"
                : isDenied
                ? "#ff3b30"
                : "#0d1117",
              fillOpacity: isDisembark ? 0.9 : 1,
              weight: isDisembark ? 2 : 1.5,
            }}
          >
            <Tooltip direction="top" offset={[0, -8]}>
              {wp.name}
            </Tooltip>
            {wp.notes && (
              <Popup>
                <div>
                  <strong style={{ color: "#ff3b30" }}>{wp.name}</strong>
                  <br />
                  <span>{wp.notes}</span>
                  {wp.date && (
                    <>
                      <br />
                      <span style={{ fontSize: 10, color: "#8a93a0" }}>
                        {formatDate(wp.date)}
                      </span>
                    </>
                  )}
                </div>
              </Popup>
            )}
          </CircleMarker>
        );
      })}

      {/* Pulsating case markers */}
      {liveCases.map((c) => {
        const size = radiusForCases(c.caseCount) * 2;
        return (
          <Marker
            key={c.id}
            position={c.coords}
            icon={makePulsingIcon(c.caseCount, size)}
          >
            <Tooltip direction="top" offset={[0, -size / 2]}>
              {c.country}: {c.caseCount} case{c.caseCount !== 1 ? "s" : ""}
            </Tooltip>
            <Popup>
              <div style={{ minWidth: 180 }}>
                <strong
                  style={{
                    display: "block",
                    color: "#ff3b30",
                    fontSize: 12,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    marginBottom: 6,
                  }}
                >
                  ▣ {c.country}
                </strong>
                <table style={{ fontSize: 11, borderCollapse: "collapse" }}>
                  <tbody>
                    <tr>
                      <td style={{ paddingRight: 8, color: "#8a93a0" }}>
                        Cases
                      </td>
                      <td style={{ color: "#ff3b30" }}>
                        <strong>{c.caseCount}</strong>
                      </td>
                    </tr>
                    {c.deaths > 0 && (
                      <tr>
                        <td style={{ paddingRight: 8, color: "#8a93a0" }}>
                          Deaths
                        </td>
                        <td style={{ color: "#ff3b30" }}>
                          <strong>{c.deaths}</strong>
                        </td>
                      </tr>
                    )}
                    <tr>
                      <td style={{ paddingRight: 8, color: "#8a93a0" }}>
                        Status
                      </td>
                      <td style={{ textTransform: "uppercase" }}>{c.status}</td>
                    </tr>
                    {c.dateConfirmed && (
                      <tr>
                        <td style={{ paddingRight: 8, color: "#8a93a0" }}>
                          Confirmed
                        </td>
                        <td>{formatDate(c.dateConfirmed)}</td>
                      </tr>
                    )}
                  </tbody>
                </table>
                <p
                  style={{
                    fontSize: 10,
                    color: "#8a93a0",
                    marginTop: 6,
                    marginBottom: 0,
                    lineHeight: 1.4,
                  }}
                >
                  {c.notes}
                </p>
                {c.sourceUrl && (
                  <a
                    href={c.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: 10,
                      color: "#ff3b30",
                      textTransform: "uppercase",
                      letterSpacing: "0.1em",
                    }}
                  >
                    » Source ↗
                  </a>
                )}
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
