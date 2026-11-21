// Parent messages: fixed templates per plan type, in English, Filipino and Hiligaynon.
// Hiligaynon follows the register of Iloilo radio (code-switched); a native speaker should check it before use.

const JOIN = { en: " and ", tl: " at ", hil: " kag " };
const HEAD = { en: "ADVISORY", tl: "ABISO", hil: "PAHIBALO" };
const BODY = {
  full: { en: (t) => `classes run as usual tomorrow (${t}). Bring water.`, tl: (t) => `normal ang klase bukas (${t}). Magdala ng tubig.`, hil: (t) => `padayon ang face-to-face classes buwas suno sa regular nga oras (${t}). Magdala sang tubig.` },
  hayoPartial: { en: (t, n) => `classes run as usual tomorrow (${t}) for most sections; ${n} sections do modular work at home. The school will tell each section.`, tl: (t, n) => `normal ang klase bukas (${t}) para sa karamihan; ${n} seksyon ang magmo-modular sa bahay.`, hil: (t, n) => `padayon ang face-to-face classes buwas (${t}) para sa kalabanan; ${n} ka section ang modular sa balay.` },
  split: { en: (t) => `tomorrow is a shortened face-to-face day: ${t} only. The school will tell each section its time. Bring water.`, tl: (t) => `maikli ang face-to-face na klase bukas: ${t} lamang. Sasabihin ng paaralan ang oras ng bawat seksyon.`, hil: (t) => `mubo ang face-to-face classes buwas: ${t} lang. Ipahibalo sang eskwelahan ang oras sang kada section.` },
  splitPartial: { en: (t, n) => `tomorrow is a shortened face-to-face day (${t}) for most sections; ${n} sections do modular work at home. The school will tell each section.`, tl: (t, n) => `maikli ang face-to-face na klase bukas (${t}) para sa karamihan; ${n} seksyon ang magmo-modular sa bahay.`, hil: (t, n) => `mubo ang face-to-face classes buwas (${t}) para sa kalabanan; ${n} ka section ang modular sa balay.` },
  home: { en: () => `face-to-face classes are suspended tomorrow. Classes continue through light modular or online work at home.`, tl: () => `suspendido ang face-to-face na klase bukas. Magpapatuloy ang klase sa magaan na modular o online sa bahay.`, hil: () => `suspended ang face-to-face classes buwas. Magapadayon ang klase paagi sa modular kag online sa balay.` },
  request: { en: () => `face-to-face classes are suspended tomorrow. Classes continue through light modular or online work at home. The school has asked the SDO to allow some classes in cooler rooms; wait for a second notice.`, tl: () => `suspendido ang face-to-face na klase bukas. Magpapatuloy ang klase sa modular o online sa bahay. Humiling ang paaralan sa SDO na payagan ang ilang klase sa mas malamig na silid; hintayin ang ikalawang abiso.`, hil: () => `suspended ang face-to-face classes buwas. Magapadayon ang klase paagi sa modular kag online sa balay. Nagpangabay ang eskwelahan sa SDO nga ibalik ang face-to-face classes sa mas mabugnaw nga classroom; hulaton ang ikaduha nga pahibalo.` },
  stop: { en: () => `all classes are suspended tomorrow, including modular and online work. Keep children in a cool place and give them water.`, tl: () => `suspendido ang lahat ng klase bukas, pati modular at online. Panatilihin ang mga bata sa malamig na lugar at painumin ng tubig.`, hil: () => `suspended ang tanan nga klase buwas, pati ang modular kag online. Indi anay maghimo sang school work. Magpabilin sa mabugnaw nga lugar kag mag-inom sang tubig.` },
};
const LEVEL_WORD = { HAYO: "regular classes", HINAY: "a shortened day", HINGA: "no face-to-face classes", HINTO: "no classes at all" };

// Dates in messages: a forwarded "tomorrow" is wrong the next day, so every message names its day.
const WD = { en: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"], tl: ["Lin", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"], hil: ["Dom", "Lun", "Mar", "Miy", "Huw", "Biy", "Sab"] };
const MO = { en: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"], tl: ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"], hil: ["Ene", "Peb", "Mar", "Abr", "May", "Hun", "Hul", "Ago", "Set", "Okt", "Nob", "Dis"] };
const FOR = { en: "for", tl: "para sa", hil: "para sa" };
/** "Tue 24 Nov" from an ISO date, in the message language (no locale data needed). */
export function msgDate(iso, lang = "en") {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return `${WD[lang][dt.getDay()]} ${d} ${MO[lang][m - 1]}`;
}
const fmtTime = (iso) => { try { return new Date(iso).toLocaleTimeString("en-PH", { hour: "2-digit", minute: "2-digit" }); } catch { return ""; } };

/** The parent message for a school view. `official` adds the verification line and the head's name. */
export function parentMessage(v, vm, lang, { official, schoolName }) {
  const t = v.litSlots.map((s) => s.label).join(JOIN[lang]);
  const n = v.plan.homeCount;
  const key = v.planType === "splitPartial" && v.level === "HAYO" ? "hayoPartial" : v.planType;
  const src = { en: `Based on PAGASA's heat index forecast (${vm.hi}°C, ${vm.forecast?.status || "draft"})`, tl: `Batay sa heat index forecast ng PAGASA (${vm.hi}°C, ${vm.forecast?.status || "draft"})`, hil: `Base sa PAGASA heat index forecast (${vm.hi}°C, ${vm.forecast?.status || "draft"})` }[lang];
  const body = BODY[key][lang](t, n);
  const head = vm.date ? `${HEAD[lang]} ${FOR[lang]} ${msgDate(vm.date, lang)}` : HEAD[lang];
  if (!official) return `DRAFT, NOT FOR SENDING · ${head} · ${schoolName}: ${src}, ${body}`;
  const d = v.decision;
  const sign = `— ${d?.by || "School Head"}, ${schoolName}, SDO Iloilo City · decided ${fmtTime(d?.at)}. Verify only on the school's official page and SDO Iloilo City.`;
  return `${head} · ${schoolName}: ${src}, ${body} ${sign}`;
}

/** Correction after a sent message: "was X, now Y". */
export function correctionMessage(v, vm, lang, schoolName) {
  const c = v.correction;
  const was = { en: `CORRECTION · ${schoolName}: our earlier message said ${LEVEL_WORD[c.from]} (${c.from}). It is now ${LEVEL_WORD[c.to]} (${c.to}).`,
    tl: `PAGWAWASTO · ${schoolName}: ang naunang abiso ay ${c.from}. Ngayon ay ${c.to}.`,
    hil: `KOREKSYON · ${schoolName}: ang nauna nga pahibalo amo ang ${c.from}. Subong ${c.to} na.` }[lang];
  return `${was} ${parentMessage(v, vm, lang, { official: true, schoolName })}`;
}

/** Morning update after 8:00 readings raised the level and the head re-confirmed. */
export function morningMessage(v, vm, lang, schoolName) {
  const intro = { en: `MORNING UPDATE · ${schoolName}: this morning's classroom readings call for ${v.level}.`, tl: `UPDATE NGAYONG UMAGA · ${schoolName}: batay sa mga reading ngayong umaga, ${v.level}.`, hil: `UPDATE KAINAGA · ${schoolName}: base sa mga reading kainaga, ${v.level}.` }[lang];
  return `${intro} ${parentMessage(v, vm, lang, { official: true, schoolName }).replace(/tomorrow|bukas|buwas/g, (m) => ({ tomorrow: "today", bukas: "ngayon", buwas: "subong" }[m]))}`;
}

/** Copyable staff notices. */
export function chaseText(names, date, { max = 10 } = {}) {
  const shown = names.slice(0, max), more = names.length - shown.length;
  return `Presko reminder: please record the 4H decision for ${msgDate(date)} before 17:00: ${shown.join(", ")}${more > 0 ? ` +${more} more` : ""}. Open Presko, sign in, tap Record, then send the official message.`;
}
/** One school's chase line (copy into a direct message). */
export function chaseLine(name, sentence, date) {
  return `${name}: ${sentence} for ${msgDate(date)}. Please open Presko and record or re-confirm before 17:00.`;
}
/** Hand-off from the head to the SDO approver when the head asks for a less protective level. */
export function sdoNoteText(schoolName, level, recommended, reason, date) {
  return `${schoolName} asks to use ${level} instead of ${recommended} on ${msgDate(date)}${reason ? ` (reason: ${reason})` : ""}. Please review in Presko before 16:45.`;
}
/** End-of-day situation report from the division counts. */
export function sitrepText(vm, { sentCount = 0 } = {}) {
  const d = vm.decisions || {}, n = vm.schools.length;
  const reconfirm = (d["stale-forecast"] ?? 0) + (d["stale-inputs"] ?? 0);
  return `Presko situation report for ${msgDate(vm.date)}: PAGASA heat index ${vm.hi}°C (${vm.forecast?.status || "draft"}), division level ${vm.level}. Official decisions ${d.official ?? 0} of ${n}; awaiting SDO ${d["awaiting-sdo"] ?? 0}; returned ${d.returned ?? 0}; re-confirm ${reconfirm}; no decision ${d.none ?? 0}. Parent messages marked sent by ${sentCount} of ${n} schools. Rule conflicts: ${vm.conflicts}.`;
}
export function tellHeadText(schoolName, level) {
  return `To the school head of ${schoolName}: the 8:00 readings are in and call for ${level}. Please open Presko and re-confirm today's level before sending the morning update.`;
}
