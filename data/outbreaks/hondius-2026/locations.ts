import type { RouteWaypoint } from "@/lib/types";

export const route: RouteWaypoint[] = [
  {
    name: "Ushuaia, Argentina",
    coords: [-54.8, -68.3],
    date: "2026-04-01",
    type: "origin",
    notes: "Departure port",
  },
  {
    name: "Drake Passage",
    coords: [-60.5, -62.0],
    type: "waypoint",
  },
  {
    name: "Antarctic Peninsula",
    coords: [-64.8, -62.9],
    date: "2026-04-03",
    type: "waypoint",
    notes: "Zodiac excursions to shore sites",
  },
  {
    name: "South Georgia",
    coords: [-54.2, -36.5],
    date: "2026-04-10",
    type: "waypoint",
  },
  {
    name: "St Helena",
    coords: [-15.97, -5.72],
    date: "2026-04-24",
    type: "disembark",
    notes: "23 passengers disembarked here on 24 April, unaware of the outbreak",
  },
  {
    name: "Cabo Verde",
    coords: [14.93, -23.51],
    type: "denied",
    notes: "Denied docking permission on 4 May 2026",
  },
  {
    name: "Canary Islands",
    coords: [28.1, -15.4],
    type: "denied",
    notes: "Denied entry by regional government on 7 May 2026",
  },
  {
    name: "Tenerife, Spain",
    coords: [28.29, -16.62],
    date: "2026-05-09",
    type: "destination",
    notes: "Estimated arrival 9 May 2026",
  },
];

export const completedRouteCoords: Array<[number, number]> = [
  [-54.8, -68.3],
  [-60.5, -62.0],
  [-64.8, -62.9],
  [-54.2, -36.5],
  [-15.97, -5.72],
  [14.93, -23.51],
];

export const upcomingRouteCoords: Array<[number, number]> = [
  [14.93, -23.51],
  [28.1, -15.4],
  [28.29, -16.62],
];
