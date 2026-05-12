import type { OutbreakMeta } from "@/lib/types";

export const meta: OutbreakMeta = {
  id: "hondius-2026",
  slug: "hondius-2026",
  title: "MV Hondius hantavirus outbreak",
  pathogen: "Hantavirus (Andes strain)",
  pathogenSlug: "hantavirus",
  location: "North Atlantic / aboard MV Hondius",
  status: "contained",
  startDate: "2026-04-01",
  lastUpdated: "2026-05-12",
  summary:
    "A cruise ship returning from Antarctica became the site of a hantavirus outbreak that killed three people and spread to passengers in at least seven countries. The ship was evacuated in Tenerife on 10 May 2026; monitoring of disembarked passengers continues through the maximum 8-week incubation window.",
  stats: {
    cases: 8,
    deaths: 3,
    countries: 5,
    disembarkedUnaware: 23,
    firstSymptomDate: "2026-04-06",
  },
};
