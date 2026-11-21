// Demo accounts for the static prototype (no backend). Each account maps to exactly one role, plus a school for school roles.
// Names are fictional. The domain is reserved for testing (.test). In a pilot this is replaced by the division's own sign-in.
export const DEMO_MODE = true;
export const DEMO_DOMAIN = "presko-demo.test";
export const ACCOUNTS = [
  { email: `drrm@${DEMO_DOMAIN}`, pin: "1600", kind: "coordinator", name: "Demo Coordinator", title: "DRRM coordinator, SDO Iloilo City", time: "16:00", verb: "Publish tomorrow's forecast" },
  { email: `head.pandac@${DEMO_DOMAIN}`, pin: "1630", kind: "head", school: "Pandac Elementary School", name: "Demo Head (Pandac)", title: "School head, Pandac ES", time: "16:30", verb: "Record tomorrow's level, message parents" },
  { email: `sds@${DEMO_DOMAIN}`, pin: "1645", kind: "sdo", name: "Demo Approver", title: "SDO approver", time: "16:45", verb: "Approve or return decisions" },
  { email: `teacher.pandac@${DEMO_DOMAIN}`, pin: "0800", kind: "teacher", school: "Pandac Elementary School", name: "Demo Teacher (Pandac)", title: "Teacher on duty, Pandac ES", time: "08:00", verb: "Enter the 8:00 classroom readings" },
  { email: `custodian.pandac@${DEMO_DOMAIN}`, pin: "0700", kind: "custodian", school: "Pandac Elementary School", name: "Demo Custodian (Pandac)", title: "Property custodian, Pandac ES", time: "Week 1", verb: "Describe buildings and timetable" },
  { email: `head.jibaoan@${DEMO_DOMAIN}`, pin: "1631", kind: "head", school: "Jibao-an Elementary School", name: "Demo Head (Jibao-an)", title: "School head, Jibao-an ES", time: "16:30", verb: "A second school, for comparison" },
];
const norm = (s) => String(s || "").trim().toLowerCase();

/** Returns the account for these credentials, or null (never says which part was wrong). */
export function authenticate(email, pin) {
  const a = ACCOUNTS.find((x) => x.email === norm(email));
  return a && a.pin === String(pin || "").trim() ? a : null;
}
export const accountByEmail = (email) => ACCOUNTS.find((x) => x.email === norm(email)) || null;

const KEY = "presko:session";
const stores = () => { const out = []; try { out.push(localStorage); } catch {} try { out.push(sessionStorage); } catch {} return out; };
/** Session = which account, not which role; the role always comes from the account. */
export function loadSession() {
  for (const s of stores()) { try { const v = JSON.parse(s.getItem(KEY) || "null"); if (v && accountByEmail(v.email)) return v; } catch {} }
  return null;
}
export function saveSession(account, remember) {
  const v = { email: account.email, at: new Date().toISOString() };
  clearSession();
  try { (remember ? localStorage : sessionStorage).setItem(KEY, JSON.stringify(v)); } catch {}
  return v;
}
export function clearSession() { for (const s of stores()) { try { s.removeItem(KEY); } catch {} } }
