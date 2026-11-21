// 2D scenes (default on phones, and the fallback when 3D is unavailable). Read only the view model.
export const PLAN_ORDER = ["full", "split", "splitPartial", "home", "request", "stop"];
export const PLAN_LABEL = {
  full: "Regular day", split: "Shortened day", splitPartial: "Shortened + some at home",
  home: "Home-based", request: "Home-based, grounds for F2F", stop: "No classes",
};
const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Shape per plan type (colour is never the only signal). Returns SVG markup centred at (x, y). */
export function symbol(type, x, y, r = 7) {
  const c = `var(--${type})`;
  switch (type) {
    case "full": return `<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
    case "split": return `<path d="M ${x} ${y - r} A ${r} ${r} 0 1 1 ${x - r} ${y} L ${x} ${y} Z" fill="${c}" stroke="var(--split-edge)" stroke-width="1.25"/>`;
    case "splitPartial": return `<path d="M ${x - r} ${y} A ${r} ${r} 0 0 1 ${x + r} ${y} Z" fill="${c}" stroke="var(--splitPartial-edge)" stroke-width="1.25"/><circle cx="${x}" cy="${y}" r="${r}" fill="none" stroke="${c}" stroke-width="1.5"/>`;
    case "home": return `<circle cx="${x}" cy="${y}" r="${r - 1}" fill="none" stroke="${c}" stroke-width="3"/>`;
    case "request": return `<circle cx="${x}" cy="${y}" r="${r - 1}" fill="none" stroke="${c}" stroke-width="3"/><circle cx="${x}" cy="${y}" r="2.6" fill="${c}"/>`;
    case "stop": return `<circle cx="${x}" cy="${y}" r="${r - 1}" fill="none" stroke="${c}" stroke-width="3"/><path d="M ${x - 3.5} ${y - 3.5} L ${x + 3.5} ${y + 3.5} M ${x + 3.5} ${y - 3.5} L ${x - 3.5} ${y + 3.5}" stroke="${c}" stroke-width="2"/>`;
    default: return `<circle cx="${x}" cy="${y}" r="${r - 1}" fill="var(--line)"/>`;
  }
}
/** Legend: all six plan types in a fixed order with counts; absent types dimmed (so it doesn't jump between forecasts). */
export function legendHTML(counts = null) {
  return PLAN_ORDER.map((t) => {
    const n = counts ? counts[t] || 0 : null;
    return `<span class="${counts && !n ? "absent" : ""}"><svg class="sym" viewBox="0 0 16 16" aria-hidden="true">${symbol(t, 8, 8, 7)}</svg>${PLAN_LABEL[t]}${counts ? `<b class="n">${n}</b>` : ""}</span>`;
  }).join("");
}

/** Projection for the division map, from the schools' coordinates. */
export function projection(schools, W = 640) {
  const lats = schools.map((s) => s.lat), lons = schools.map((s) => s.lon);
  const minLat = Math.min(...lats) - 0.004, maxLat = Math.max(...lats) + 0.004, minLon = Math.min(...lons) - 0.004, maxLon = Math.max(...lons) + 0.004;
  const kx = Math.cos((10.72 * Math.PI) / 180);
  const H = Math.round((W * (maxLat - minLat)) / ((maxLon - minLon) * kx));
  return { W, H, x: (lon) => ((lon - minLon) / (maxLon - minLon)) * W, y: (lat) => H - ((lat - minLat) / (maxLat - minLat)) * H, kmPx: W / ((maxLon - minLon) * kx * 111.32) };
}

/** Division map, 2D. */
export function renderDivision2D(el, vm, { selected, onSelect } = {}) {
  const P = projection(vm.schools);
  const dots = vm.schools.map((v) => {
    const x = P.x(v.lon).toFixed(1), y = P.y(v.lat).toFixed(1);
    const title = vm.waiting ? v.name : `${v.name}: ${v.levelText} · ${v.planLabel}`;
    return `<g class="pt" data-id="${v.id}" tabindex="0" role="button" aria-label="${esc(title)}" style="cursor:pointer">${symbol(vm.waiting ? "none" : v.planType, +x, +y, 8)}<circle cx="${x}" cy="${y}" r="13" fill="transparent"/><title>${esc(title)}</title></g>`;
  }).join("");
  const sel = vm.schools.find((v) => v.id === selected);
  const ring = sel ? `<circle cx="${P.x(sel.lon).toFixed(1)}" cy="${P.y(sel.lat).toFixed(1)}" r="14" fill="none" stroke="var(--ink)" stroke-width="2"/>` : "";
  el.innerHTML = `<svg class="map" viewBox="-12 -12 ${P.W + 24} ${P.H + 24}" role="img" aria-label="Map of schools in Iloilo City">
    ${dots}${ring}
    </svg>`;
  el.querySelectorAll(".pt").forEach((g) => {
    g.addEventListener("click", () => onSelect?.(g.dataset.id));
    g.addEventListener("keydown", (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect?.(g.dataset.id); } });
  });
}

/** School floor plan, 2D: one block per building, storeys stacked, rooms as cells. */
export function renderSchool2D(el, v) {
  const cell = 22, gap = 3, pad = 14;
  let x = pad, svg = "";
  const tallest = Math.max(...v.buildings.map((b) => b.storeys));
  const H = pad * 2 + tallest * (cell + gap) + 46;
  for (const b of v.buildings) {
    const perFloor = Math.ceil(b.rooms / b.storeys);
    const w = perFloor * (cell + gap) - gap;
    const fill = b.emptied ? "var(--line)" : `var(--${b.flag === "green" ? "full" : b.flag === "amber" ? "split" : "home"})`;
    let k = 0;
    for (let f = 0; f < b.storeys; f++) {
      for (let c = 0; c < perFloor && k < b.rooms; c++, k++) {
        const y = H - 40 - (f + 1) * (cell + gap);
        svg += `<rect x="${x + c * (cell + gap)}" y="${y}" width="${cell}" height="${cell}" rx="3" fill="${fill}" opacity="${b.emptied ? 0.6 : 0.9}"/>`;
        if (b.emptied) svg += `<path d="M ${x + c * (cell + gap)} ${y + cell} l ${cell} -${cell}" stroke="var(--muted)" stroke-width="1"/>`;
      }
    }
    const roofY = H - 40 - b.storeys * (cell + gap) - 6;
    svg += b.roofType === "bare" ? `<rect x="${x - 3}" y="${roofY}" width="${w + 6}" height="3" fill="var(--muted)"/>` : b.roofType === "slab" ? `<rect x="${x - 3}" y="${roofY - 3}" width="${w + 6}" height="7" rx="2" fill="var(--ink)" opacity=".55"/>` : `<rect x="${x - 3}" y="${roofY}" width="${w + 6}" height="4" fill="var(--ink)" opacity=".3"/>`;
    svg += `<text x="${x}" y="${H - 22}" font-size="12" fill="var(--ink)" font-family="var(--body)">${esc(b.name)}</text><text x="${x}" y="${H - 8}" font-size="11" fill="var(--muted)" font-family="var(--body)">${b.emptied ? "emptied (8:00)" : { green: "cooler", amber: "typical", red: "hot" }[b.flag]}</text>`;
    x += Math.max(w, 80) + 24;
  }
  el.innerHTML = `<svg viewBox="0 0 ${x} ${H}" style="width:100%;max-height:260px;display:block" role="img" aria-label="Buildings of ${esc(v.name)}">${svg}</svg>`;
}

/** Class hours: tomorrow's lit slots on a 06:00–18:00 line; Hinay's 10:00–14:00 shaded. */
export function sunArc(v) {
  if (!v.litSlots.length) return `<p class="small ink2">No class hours at school tomorrow (${v.planType === "stop" ? "no classes" : "home-based"}).</p>`;
  const W = 300, x = (h) => ((h - 6) / 12) * W;
  const lit = v.litSlots.map((s) => `<rect x="${x(Math.max(6, s.start))}" y="8" width="${Math.max(2, x(Math.min(18, s.end)) - x(Math.max(6, s.start)))}" height="10" rx="2" fill="var(--ink)"/>`).join("");
  const mid = v.level === "HINAY" ? `<rect x="${x(10)}" y="5" width="${x(14) - x(10)}" height="16" fill="var(--HINAY)" opacity=".18"/>` : "";
  return `<svg viewBox="-18 0 ${W + 36} 38" style="width:100%;max-width:420px;height:auto;display:block" role="img" aria-label="Class hours: ${v.litSlots.map((s) => s.label).join(", ")}">
    <rect x="0" y="12" width="${W}" height="2" fill="var(--line-strong)"/>${mid}${lit}
    ${[6, 10, 14, 18].map((h) => `<text x="${x(h)}" y="34" font-size="11" text-anchor="middle" fill="var(--muted)" font-family="var(--mono)">${String(h).padStart(2, "0")}:00</text>`).join("")}</svg>`;
}
