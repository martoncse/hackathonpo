// Presko accounts. Each account maps to exactly one role, plus a school for school roles.
// Accounts are issued by the SDO; the list lives here until Presko has a server. Sign-in details are in ../ACCOUNTS.md.
export const DOMAIN = "presko.local";
export const ACCOUNTS = [
  { email: `drrm@${DOMAIN}`, pin: "1600", kind: "coordinator", name: "Ramon Villanueva", title: "DRRM coordinator, SDO Iloilo City" },
  { email: `approver@${DOMAIN}`, pin: "1645", kind: "sdo", name: "Carmela Ortiz", title: "Approver, SDO Iloilo City" },
  { email: `head.pandac@${DOMAIN}`, pin: "1630", kind: "head", school: "Pandac Elementary School", name: "Liza Gonzaga", title: "School head, Pandac ES" },
  { email: `teacher.pandac@${DOMAIN}`, pin: "0800", kind: "teacher", school: "Pandac Elementary School", name: "Joel Tan", title: "Teacher on duty, Pandac ES" },
  { email: `custodian.pandac@${DOMAIN}`, pin: "0700", kind: "custodian", school: "Pandac Elementary School", name: "Nestor Lim", title: "Property custodian, Pandac ES" },
  { email: `head.jibaoan@${DOMAIN}`, pin: "1631", kind: "head", school: "Jibao-an Elementary School", name: "Arnel Sison", title: "School head, Jibao-an ES" },
];
export const AUTH_FAIL = "That email and PIN don't match an account.";
const norm = (s) => String(s || "").trim().toLowerCase();

/** Returns the account for these credentials, or null (never says which part was wrong). */
export function authenticate(email, pin) {
  const a = ACCOUNTS.find((x) => x.email === norm(email));
  return a && a.pin === String(pin || "").trim() ? a : null;
}
export const accountByEmail = (email) => ACCOUNTS.find((x) => x.email === norm(email)) || null;

// ---- session: which account is signed in on this device. Kept apart from the data blob. ----
// `stores` = { local, session } (localStorage / sessionStorage in the browser, memoryStorage() stubs in tests).
export const SESSION_KEY = "presko:session";
export function browserStores() {
  const out = { local: null, session: null };
  if (typeof window === "undefined") return out;
  try { out.local = window.localStorage; } catch {}
  try { out.session = window.sessionStorage; } catch {}
  return out;
}
const list = (st) => [st?.local, st?.session].filter(Boolean);
/** Session = which account, not which role; the role always comes from the account. */
export function loadSession(st = browserStores()) {
  for (const s of list(st)) {
    try {
      const v = JSON.parse(s.getItem(SESSION_KEY) || "null");
      if (v && accountByEmail(v.email)) return { email: v.email, remember: v.remember === true, at: typeof v.at === "string" ? v.at : "" };
    } catch {}
  }
  return null;
}
export function saveSession(account, remember, st = browserStores(), at = new Date()) {
  const v = { email: account.email, at: at.toISOString(), remember: !!remember };
  clearSession(st);
  const target = remember ? st?.local : st?.session;
  try { target?.setItem(SESSION_KEY, JSON.stringify(v)); } catch {}
  return v;
}
export function clearSession(st = browserStores()) { for (const s of list(st)) { try { s.removeItem(SESSION_KEY); } catch {} } }
