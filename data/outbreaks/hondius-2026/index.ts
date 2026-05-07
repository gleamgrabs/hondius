import type { OutbreakData } from "@/lib/types";
import { meta } from "./meta";
import { events } from "./events";
import { cases } from "./cases";
import { route } from "./locations";
import { sources } from "./sources";
import { disembarked } from "./disembarked";

export const hondiusOutbreak: OutbreakData = {
  meta,
  events,
  cases,
  route,
  sources,
  disembarked,
};

export { meta, events, cases, route, sources, disembarked };
