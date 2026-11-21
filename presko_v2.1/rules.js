// Presko regulatory rules, as reported by secondary sources on 21 Nov 2026.
// The primary texts of DM 064 s.2026, EO 130 s.2026 and DO 22 s.2024 could not be read (their sites returned 403),
// so each rule cites the outlet it came from. Research: presko_otherversion/research_notes on the team branch.

export const SOURCES = {
  dm064: { label: "DepEd Memorandum No. 064, s. 2026 (4H heat levels)", url: "https://astig.ph/deped-memorandum-64-heat-class-suspension-42-degrees-2026/" },
  dm064b: { label: "DM 064 s. 2026 summary (DepEd Tambayan)", url: "https://www.depedtambayanph.net/2026/10/deped-memo-064-s-2026-el-nino-4h-scenario.html" },
  readings: { label: "DM 064 indoor monitoring at 08:00, 12:00, 14:00 (DepEdClub)", url: "https://depedclub.com/deped-heat-guidelines-2026-4h-class-suspensions/" },
  do22: { label: "DepEd Order No. 22, s. 2024 (class suspensions; repealed DO 37 s. 2022)", url: "https://deped-muntinlupa.com/wp-content/uploads/2025/03/NUM-2025-122.pdf" },
  eo130: { label: "Executive Order No. 130, s. 2026 (automatic, localized and school-level suspensions)", url: "https://www.manilatimes.net/2026/11/04/news/national/palace-releases-class-suspension-guidelines/2460865" },
  eo130b: { label: "EO 130: schools may suspend on PAGASA forecasts (GMA)", url: "https://www.gmanetwork.com/news/topstories/nation/1008199/qc-aligns-heat-related-class-suspension-rules-with-deped-marcos-eo/story/" },
  eo24: { label: "Iloilo City EO No. 24, s. 2025 (city heat-index thresholds)", url: "https://www.gmanetwork.com/regionaltv/news/106983/new-protocols-issued-on-class-suspension-in-iloilo-city-due-to-heat-index/story" },
  nov3: { label: "3 Nov 2026: 122 Western Visayas schools suspend at a 43 °C forecast (PNA)", url: "https://www.pna.gov.ph/article/122-w-visayas-public-schools-suspend-in-person-classes-due-to-extreme-heat" },
  sds: { label: "School heads must inform the Schools Division Superintendent (Daily Guardian)", url: "https://www.dailyguardian.com.ph/blog/extreme-heat-suspends-classes-in-122-western-visayas-schools" },
};

// DM 064 s. 2026 "4H" levels. Bands equal PAGASA's heat-index categories. Loss of school water supply forces at least HINGA.
// plans: what Presko may recommend at that level (Presko plan types, see PLAN_LABEL).
export const FOURH = [
  { id: "HAYO", max: 26.99, range: "below 27 °C", pagasa: "Not hazardous", allows: "Regular face-to-face classes, with heat precautions (hydration breaks, ventilated rooms, outdoor activity early or in shade)", plans: ["full", "split", "splitPartial", "home"] },
  { id: "HINAY", max: 32.99, range: "27–32 °C", pagasa: "Caution", allows: "Shortened face-to-face day (for example 06:00–10:00 and 14:00–18:00), hybrid or home-based", plans: ["split", "splitPartial", "home"] },
  { id: "HINGA", max: 41.99, range: "33–41 °C, or no water at school", pagasa: "Extreme caution", allows: "No face-to-face classes; light home-based work (modules, DepEd TV/radio)", plans: ["home"] },
  { id: "HINTO", max: Infinity, range: "42 °C and above", pagasa: "Danger / extreme danger", allows: "All academic activity suspended, including home-based and online", plans: ["stop"] },
];
const ORDER = FOURH.map((l) => l.id);
export const levelInfo = (id) => FOURH.find((l) => l.id === id);
export function level(hi, { water = true } = {}) {
  const byHeat = FOURH.find((l) => hi <= l.max).id;
  return !water && ORDER.indexOf(byHeat) < ORDER.indexOf("HINGA") ? "HINGA" : byHeat;
}
export const stricter = (a, b) => (ORDER.indexOf(a) >= ORDER.indexOf(b) ? a : b);

// Who decides (DM 064; DepEd-6; Usec. Garma): the school head chooses, in coordination with the SDO, and informs the SDS.
// "The school head cannot just decide to send students home": the SDO vets any departure from the level's default.
export const AUTHORITY = "The principal chooses tomorrow's level with the Schools Division Office and informs the Schools Division Superintendent (DM 064 s. 2026). Departures from the level's default plan, and requests for face-to-face classes on a Hinga day, need SDO approval.";

// Iloilo City EO 24 s. 2025 overlay (LGU "localized" tier under EO 130). PAGASA's 5 p.m. advisory the day before.
// The automatic threshold is reported as 42 °C (GMA, Mar 2025), 41 °C (Apr 2025) and 40 °C (UN ESCAP, 2026).
export const CITY = { instrument: "Iloilo City EO 24 s. 2025", optional: 40, autoDefault: 42, autoOptions: [40, 41, 42] };
export function cityOverlay(hi, auto = CITY.autoDefault) {
  if (hi >= auto) return { status: "auto", text: `${CITY.instrument}: automatic citywide face-to-face suspension at ${auto} °C or above.` };
  if (hi >= CITY.optional) return { status: "optional", text: `${CITY.instrument}: suspension optional for school heads at ${CITY.optional} °C or above.` };
  return null;
}
export const EO130 = "EO 130 s. 2026: automatic, localized (LGU) and school-level suspensions. Implementing guidelines pending; numeric heat trigger unconfirmed.";

// Plan types (shared with the 3D/2D scenes).
export const PLAN_ORDER = ["full", "split", "splitPartial", "home", "request", "stop"];
export const PLAN_LABEL = {
  full: "Regular day", split: "Shortened day", splitPartial: "Shortened + some at home",
  home: "Home-based", request: "Home-based, grounds for F2F", stop: "No classes",
};
