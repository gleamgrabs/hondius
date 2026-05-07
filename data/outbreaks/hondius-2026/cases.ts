import type { CaseEntry } from "@/lib/types";

export const cases: CaseEntry[] = [
  {
    id: "case-nl-01",
    country: "Netherlands",
    countryCode: "NL",
    coords: [52.37, 4.9],
    caseCount: 2,
    deaths: 0,
    status: "confirmed",
    dateConfirmed: "2026-05-05",
    notes:
      "Two Dutch nationals evacuated from MV Hondius and hospitalised in the Netherlands. Both were aboard the ship when symptoms developed.",
    sourceUrl: "https://www.reuters.com/",
  },
  {
    id: "case-ch-01",
    country: "Switzerland",
    countryCode: "CH",
    coords: [46.95, 7.45],
    caseCount: 1,
    deaths: 0,
    status: "confirmed",
    dateConfirmed: "2026-05-07",
    notes:
      "A Swiss passenger who disembarked at St Helena on 24 April and returned home tested positive for the Andes hantavirus. Hospitalised; condition being monitored.",
    sourceUrl: "https://www.euronews.com/",
  },
  {
    id: "case-gb-01",
    country: "United Kingdom",
    countryCode: "GB",
    coords: [51.5, -0.12],
    caseCount: 1,
    deaths: 0,
    status: "confirmed",
    dateConfirmed: "2026-05-06",
    notes:
      "A British national was hospitalised in Johannesburg, South Africa, after presenting with hantavirus symptoms following the voyage. The case is associated with the Hondius outbreak.",
    sourceUrl: "https://apnews.com/",
  },
  {
    id: "case-de-01",
    country: "Germany",
    countryCode: "DE",
    coords: [52.52, 13.4],
    caseCount: 1,
    deaths: 1,
    status: "deceased",
    dateConfirmed: "2026-05-02",
    notes:
      "A 78-year-old German national died aboard MV Hondius on 2 May 2026, the first confirmed fatality of the outbreak.",
    sourceUrl: "https://www.reuters.com/",
  },
  {
    id: "case-onboard-01",
    country: "Aboard MV Hondius",
    countryCode: "XS",
    coords: [15.0, -25.0],
    caseCount: 3,
    deaths: 2,
    status: "confirmed",
    dateConfirmed: "2026-05-05",
    notes:
      "Three additional cases remain aboard MV Hondius in the North Atlantic, including two who are in critical condition. The ship is expected to reach Tenerife on 9 May 2026.",
    sourceUrl: "https://www.who.int/",
  },
];
