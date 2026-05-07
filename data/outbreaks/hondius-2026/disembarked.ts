import type { DisembarkedDestination } from "@/lib/types";

export const disembarked: DisembarkedDestination[] = [
  {
    country: "Switzerland",
    countryCode: "CH",
    passengerCount: 3,
    hasConfirmedCase: true,
  },
  {
    country: "Netherlands",
    countryCode: "NL",
    passengerCount: 4,
    hasConfirmedCase: true,
  },
  {
    country: "United States",
    countryCode: "US",
    passengerCount: 4,
    hasConfirmedCase: false,
  },
  {
    country: "Australia",
    countryCode: "AU",
    passengerCount: 3,
    hasConfirmedCase: false,
  },
  {
    country: "United Kingdom",
    countryCode: "GB",
    passengerCount: 2,
    hasConfirmedCase: true,
  },
  {
    country: "Spain",
    countryCode: "ES",
    passengerCount: 2,
    hasConfirmedCase: false,
  },
  {
    country: "Taiwan",
    countryCode: "TW",
    passengerCount: 2,
    hasConfirmedCase: false,
  },
  {
    country: "Germany",
    countryCode: "DE",
    passengerCount: 2,
    hasConfirmedCase: false,
  },
  {
    country: "Other destinations",
    countryCode: "XX",
    passengerCount: 1,
    hasConfirmedCase: false,
  },
];
