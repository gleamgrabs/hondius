import type { OutbreakEvent } from "@/lib/types";

export const events: OutbreakEvent[] = [
  {
    id: "evt-10",
    date: "2026-05-07",
    title: "Eight confirmed cases; Canary Islands denies entry",
    description:
      "The total of confirmed cases rose to eight. The president of the Canary Islands announced the ship would not be permitted to dock there. The vessel was redirected toward Tenerife with an estimated arrival of 9 May. A Swiss passenger who had disembarked at St Helena tested positive for hantavirus after returning home.",
    severity: "critical",
    sources: [
      "https://www.reuters.com/",
      "https://www.euronews.com/",
    ],
  },
  {
    id: "evt-09",
    date: "2026-05-05",
    title: "Three deaths confirmed; seven cases total",
    description:
      "WHO confirmed three deaths and seven cases aboard MV Hondius — two confirmed, five suspected. Contact-tracing efforts were underway for the 23 passengers who disembarked at St Helena on 24 April.",
    severity: "critical",
    sources: ["https://www.who.int/"],
  },
  {
    id: "evt-08",
    date: "2026-05-04",
    title: "WHO confirms hantavirus outbreak; Cabo Verde denies docking",
    description:
      "The World Health Organization formally confirmed the Andes-strain hantavirus outbreak aboard the ship. Cabo Verde refused to allow MV Hondius to dock, citing public health concerns.",
    severity: "critical",
    sources: [
      "https://www.who.int/",
      "https://apnews.com/",
    ],
  },
  {
    id: "evt-07",
    date: "2026-05-02",
    title: "First death: 78-year-old German passenger",
    description:
      "A 78-year-old German national died aboard MV Hondius, becoming the first confirmed fatality of the outbreak. She had been experiencing respiratory symptoms consistent with hantavirus pulmonary syndrome.",
    severity: "critical",
    sources: ["https://www.reuters.com/"],
  },
  {
    id: "evt-06",
    date: "2026-04-28",
    title: "Additional passengers develop symptoms",
    description:
      "Several more passengers reported symptoms including fever, muscle aches, and respiratory difficulty. The ship's medical staff isolated affected individuals. Samples were sent ashore for laboratory analysis.",
    severity: "warning",
    sources: ["https://oceanwide-expeditions.com/"],
  },
  {
    id: "evt-05",
    date: "2026-04-24",
    title: "St Helena port call: 23 passengers disembark",
    description:
      "MV Hondius made a scheduled stop at St Helena island. Twenty-three passengers disembarked and flew onward to their home countries, unaware that a hantavirus outbreak was developing aboard. Destinations included Australia, Taiwan, the United States, Spain, Switzerland, and the Netherlands.",
    severity: "warning",
    location: "St Helena, South Atlantic",
    sources: ["https://oceanwide-expeditions.com/", "https://www.reuters.com/"],
  },
  {
    id: "evt-04",
    date: "2026-04-15",
    title: "Symptom cluster identified; first medical assessments",
    description:
      "The ship's physician noted a cluster of patients with similar fever and respiratory symptoms. An initial assessment suggested possible viral illness; a definitive diagnosis had not yet been made.",
    severity: "warning",
    sources: ["https://oceanwide-expeditions.com/"],
  },
  {
    id: "evt-03",
    date: "2026-04-06",
    title: "First symptom onset in Dutch passenger",
    description:
      "A Dutch national aboard MV Hondius began experiencing fever — the first known symptom onset associated with the outbreak. The patient was assessed by the ship's medical staff and isolated as a precautionary measure.",
    severity: "info",
    sources: ["https://www.reuters.com/"],
  },
  {
    id: "evt-02",
    date: "2026-04-03",
    title: "MV Hondius reaches Antarctic waters",
    description:
      "The vessel entered Antarctic waters south of Drake Passage. Passengers participated in Zodiac excursions to shore sites, including contact with nesting seabird colonies and areas inhabited by small mammals.",
    severity: "info",
    location: "Antarctic Peninsula",
    sources: ["https://oceanwide-expeditions.com/"],
  },
  {
    id: "evt-01",
    date: "2026-04-01",
    title: "MV Hondius departs Ushuaia",
    description:
      "Oceanwide Expeditions' vessel MV Hondius departed Ushuaia, Argentina, with approximately 150 people aboard — including 89 passengers and 61 crew — on a voyage through Antarctica and the South Atlantic toward Cabo Verde.",
    severity: "info",
    location: "Ushuaia, Argentina",
    sources: ["https://oceanwide-expeditions.com/"],
  },
];
