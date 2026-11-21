// Deterministic matcher. No AI here: plain string and rule matching.
// Input: confirmed pack fields + alert list + register lookup result.
// Output: one verdict (red / orange / none) with reasons. Never "safe", never green.

const STOP = new Set([
  "tablet", "tablets", "tab", "tabs", "capsule", "capsules", "injection", "inj", "solution", "suspension",
  "syrup", "film", "coated", "oral", "for", "and", "with", "the", "usp", "bp", "ip", "b.p", "i.p", "brand",
  "name", "mg", "mcg", "ml", "gm", "hydrochloride", "hcl", "sodium", "potassium", "ltd", "limited", "pvt",
  "pharma", "pharmaceuticals", "pharmaceutical", "laboratories", "labs", "healthcare", "industries",
]);

export function normBatch(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/^(LOT|BATCH|B\.?\s*NO|BN)[\s.:#/-]*/i, "")
    .replace(/[^A-Z0-9]/g, "");
}

export function tokens(value) {
  return new Set(
    String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9 ]+/g, " ")
      .split(/\s+/)
      .filter((t) => t.length >= 4 && !STOP.has(t) && !/^\d/.test(t)),
  );
}

function overlaps(a, b) {
  const tb = tokens(b);
  for (const t of tokens(a)) if (tb.has(t)) return true;
  return false;
}

// One edit apart (substitution, insertion or deletion): catches a misread character.
function oneEditApart(a, b) {
  if (a === b) return false;
  if (Math.abs(a.length - b.length) > 1) return false;
  let i = 0;
  let j = 0;
  let edits = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) {
      i++;
      j++;
      continue;
    }
    if (++edits > 1) return false;
    if (a.length > b.length) i++;
    else if (b.length > a.length) j++;
    else {
      i++;
      j++;
    }
  }
  return edits + (a.length - i) + (b.length - j) <= 1;
}

const MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
const MONTH_NAMES = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
function monthName(value) {
  const [m, y] = String(value).toUpperCase().split("-");
  const i = MONTHS.indexOf(m);
  return i === -1 ? value : `${MONTH_NAMES[i]} ${y}`;
}

// Converts CDSCO monthly "not of standard quality" rows into alert entries.
export function cdscoToAlerts(cdsco) {
  return (cdsco?.rows || []).map((r) => ({
    id: `CDSCO-NSQ-${r.month}-${r.sno}`,
    issuer: "CDSCO",
    issuer_long: "India's drug regulator (CDSCO)",
    title: `India CDSCO list of samples that failed testing, ${monthName(r.month)} (row ${r.sno})`,
    date: r.month,
    url: cdsco.source_url,
    category: "substandard",
    product: r.product,
    stated_manufacturer: r.manufacturer,
    batches: [r.batch],
    countries: ["India"],
    lots: [{ country: "India", batch: r.batch, mfg: r.mfg, expiry: r.expiry, result: r.reason }],
    quote: r.reason,
    signs: [],
    advice: "Failed a government lab test. Do not dispense this batch; quarantine and report.",
  }));
}

function parseMonthYear(value) {
  const m = String(value || "").match(/(\d{1,2})\s*[/.-]\s*(\d{2,4})/);
  if (!m) return null;
  let year = Number(m[2]);
  if (year < 100) year += 2000;
  const month = Number(m[1]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

/**
 * @param {object} pack confirmed fields: product, strength, batch, manufacturer, expiry, registration_no
 * @param {object[]} alerts active alerts
 * @param {object} register { checked: bool, found: obj|null, source: "live"|"cache"|"none" }
 * @param {Date} today
 */
export function checkPack(pack, alerts, register = { checked: false }, today = new Date()) {
  const batch = normBatch(pack.batch);
  const reasons = [];
  const notes = [];
  let level = "none";
  const bump = (to) => {
    if (to === "red" || (to === "orange" && level === "none")) level = to;
  };

  if (!batch) {
    return { level: "incomplete", headline: "Type or confirm the batch number first.", reasons, notes, matches: [] };
  }

  const matches = [];
  for (const alert of alerts) {
    for (const b of alert.batches) {
      const nb = normBatch(b);
      const productOk = pack.product ? overlaps(pack.product, alert.product) : null;
      const makerOk = pack.manufacturer ? overlaps(pack.manufacturer, alert.stated_manufacturer) : null;
      if (nb === batch) {
        if (productOk || (productOk === null && batch.length >= 5) || (productOk === null && makerOk)) {
          matches.push({ alert, kind: "exact", batch: b });
        } else {
          matches.push({ alert, kind: "other-product", batch: b });
        }
      } else if (batch.length >= 5 && oneEditApart(nb, batch) && productOk !== false) {
        matches.push({ alert, kind: "near", batch: b });
      }
    }
  }

  for (const m of matches) {
    const { alert } = m;
    if (m.kind === "exact") {
      bump("red");
      reasons.push({
        level: "red",
        text: `Matches ${alert.title}: quarantine.`,
        detail: `${alert.category === "falsified" ? "Falsified" : "Failed lab test"}: ${alert.product}, batch ${m.batch}.`,
        alert_id: alert.id,
      });
      if (!pack.product) notes.push(`Check the pack is ${alert.product}: the batch number alone matched.`);
    } else if (m.kind === "near") {
      bump("orange");
      reasons.push({
        level: "orange",
        text: `Batch ${pack.batch} is one character away from batch ${m.batch} in ${alert.title}: hold and check the pack by eye.`,
        alert_id: alert.id,
      });
    } else {
      bump("orange");
      reasons.push({
        level: "orange",
        text: `The same batch code ${m.batch} is on ${alert.title}, for a different product (${alert.product}): hold and verify.`,
        alert_id: alert.id,
      });
    }
  }

  if (pack.registration_no) {
    if (register.checked && !register.found) {
      bump("orange");
      reasons.push({
        level: "orange",
        text: `Registration no. ${pack.registration_no} not found in the register: hold and verify.`,
      });
    } else if (register.found && /inactive/i.test(register.found.status || "")) {
      bump("orange");
      reasons.push({
        level: "orange",
        text: `Registration no. ${pack.registration_no} is marked inactive in the register (listed to ${register.found.expiry_date}): hold and verify.`,
      });
    } else if (register.found) {
      notes.push(`Registered: ${register.found.product}, ${register.found.applicant} (${register.source === "live" ? "live register" : "cached register"}).`);
      if (pack.product && !overlaps(pack.product, register.found.product) && !overlaps(pack.product, register.found.ingredient)) {
        bump("orange");
        reasons.push({
          level: "orange",
          text: `Registration no. ${pack.registration_no} belongs to ${register.found.product}, not ${pack.product}: hold and verify.`,
        });
      }
    } else if (!register.checked) {
      notes.push("The register could not be reached: registration number not checked.");
    }
  } else {
    notes.push("No registration number entered: check it against the register by hand.");
  }

  const exp = parseMonthYear(pack.expiry);
  if (exp) {
    const endOfMonth = new Date(exp.year, exp.month, 0);
    if (endOfMonth < today) {
      bump("orange");
      reasons.push({ level: "orange", text: `Expired (${pack.expiry}): do not dispense.` });
    }
  }

  let headline;
  if (level === "red") headline = reasons.find((r) => r.level === "red").text;
  else if (level === "orange") headline = reasons.find((r) => r.level === "orange").text;
  else headline = "No alert found for this batch. This is not a quality clearance; lab testing still applies.";

  return { level, headline, reasons, notes, matches: matches.map((m) => ({ kind: m.kind, alert_id: m.alert.id })) };
}

// Sweep: which received batches does a newly added alert hit?
export function sweep(alert, stockEntries) {
  return stockEntries.filter((e) =>
    alert.batches.some((b) => normBatch(b) === normBatch(e.batch) && overlaps(e.product, alert.product)),
  );
}

// GS1 element string → fields. Handles FNC1 as \x1d or "]d2" prefix, and the
// human-readable "(01)...(17)...(10)..." form.
export function parseGs1(raw) {
  if (!raw) return null;
  let s = String(raw).replace(/^\]d2|^\]C1|^\]Q3/, "");
  const out = {};
  if (s.includes("(")) {
    for (const m of s.matchAll(/\((\d{2,4})\)([^(]+)/g)) out[m[1]] = m[2].trim();
  } else {
    const fixed = { "01": 14, "17": 6, "11": 6, "15": 6 };
    while (s.length) {
      if (s[0] === "\x1d") {
        s = s.slice(1);
        continue;
      }
      const ai = s.slice(0, 2);
      s = s.slice(2);
      if (fixed[ai]) {
        out[ai] = s.slice(0, fixed[ai]);
        s = s.slice(fixed[ai]);
      } else if (["10", "21"].includes(ai)) {
        const end = s.indexOf("\x1d");
        out[ai] = end === -1 ? s : s.slice(0, end);
        s = end === -1 ? "" : s.slice(end + 1);
      } else break;
    }
  }
  if (!out["01"] && !out["10"]) return null;
  const exp = out["17"];
  return {
    gtin: out["01"] || null,
    batch: out["10"] || null,
    serial: out["21"] || null,
    expiry: exp ? `${exp.slice(2, 4)}/20${exp.slice(0, 2)}` : null,
  };
}
