import type { OutbreakEvent } from "@/lib/types";

export const events: OutbreakEvent[] = [
  {
    id: "evt-15",
    date: "2026-05-12",
    title:
      'WHO Director-General Tedros: "This is not another COVID"',
    description:
      "In a UN News statement, WHO Director-General Tedros Adhanom Ghebreyesus emphasised that the wider public risk from the MV Hondius outbreak remains low, calling the operation a successful international response and stating directly that the event is not comparable to COVID-19. The phase has shifted from active maritime response to post-evacuation surveillance, with national health authorities handling contact tracing and isolation of confirmed and probable cases in destination countries.",
    severity: "warning",
    sources: [
      "https://news.un.org/",
      "https://www.who.int/",
    ],
  },
  {
    id: "evt-14",
    date: "2026-05-11",
    title:
      "Evacuation complete — 122 individuals repatriated; 16 Americans to Nebraska",
    description:
      "All 122 individuals (87 passengers and 35 crew) have been repatriated from the MV Hondius. Sixteen US nationals arrived at the University of Nebraska Medical Center — 15 admitted to the quarantine unit, one to the biocontainment unit. A further two US passengers were flown to Atlanta for additional assessment. Two new positives have been detected after evacuation: one French passenger and one US passenger, bringing the total confirmed and probable cases to ten. A small skeleton crew remains aboard to sail the ship to Rotterdam for full decontamination.",
    severity: "critical",
    sources: [
      "https://www.nbcnews.com/",
      "https://abc7chicago.com/",
      "https://www.aljazeera.com/",
    ],
  },
  {
    id: "evt-13",
    date: "2026-05-10",
    title:
      "MV Hondius docks at Granadilla; evacuation flights begin",
    description:
      "After Spain granted permission, the MV Hondius docked at Granadilla Port, Tenerife, on Sunday 10 May. Disembarkation began in order of homeward-bound flight departure times — Spanish nationals first. The first evacuation flight took off at 13:31 local time. By late evening, seven evacuation flights had departed transporting 94 passengers of 19 nationalities to six European destinations and Canada. All travellers were escorted to shore by personnel in full-body protective equipment.",
    severity: "critical",
    sources: [
      "https://edition.cnn.com/",
      "https://www.reuters.com/",
      "https://www.npr.org/",
      "https://www.cnbc.com/",
    ],
  },
  {
    id: "evt-12",
    date: "2026-05-08",
    title:
      "WHO Disease Outbreak News: 6 lab-confirmed, 75 contacts traced in South Africa",
    description:
      "WHO published a detailed Disease Outbreak News update. Of the eight cases (three deaths), six are now laboratory-confirmed for Andes hantavirus; four patients remained hospitalised. Seventy-five contacts had been identified in South Africa, with 42 actively being traced. WHO and ECDC technical experts joined the ship's medical team. A probable case was identified at Tristan da Cunha among passengers who disembarked there on 14 April. WHO advised against routine testing or quarantine of asymptomatic contacts.",
    severity: "critical",
    sources: [
      "https://www.who.int/",
      "https://www.ecdc.europa.eu/",
    ],
  },
  {
    id: "evt-11",
    date: "2026-05-08",
    title: "MV Hondius arrives at Granadilla Port, Tenerife",
    description:
      "The MV Hondius reached Granadilla Port, Tenerife, around midday after the Atlantic crossing. More than one hundred passengers representing twenty-three nationalities remained aboard. Spanish authorities prepared a hazmat-protected disembarkation protocol for the coming days; the ship anchored offshore awaiting evacuation logistics to finalise.",
    severity: "critical",
    sources: [
      "https://edition.cnn.com/",
      "https://abcnews.go.com/",
    ],
  },
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
