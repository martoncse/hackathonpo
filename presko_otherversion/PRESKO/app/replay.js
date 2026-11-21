// Heat replay: swipe through a past heatwave hour by hour and see how hot each part of Iloilo City got.
// Opened from the sign-in page; needs no account and never touches the store.
import { heatIndexC, level, CALIBRATION } from "../engine.js";
import { REPLAY_PERIODS } from "../replay-data.js";
import { projection } from "./scenes.js";
import { loadThree, heat3D } from "./scene3d.js";

const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
export const DISTRICTS = [
  ["Jaro", 10.7305, 122.5585], ["La Paz", 10.7125, 122.5705], ["Mandurriao", 10.7185, 122.5335], ["Molo", 10.6965, 122.5455],
  ["Arevalo", 10.6895, 122.5175], ["City Proper", 10.6955, 122.5675], ["Lapuz", 10.7015, 122.5885],
];
// Heat colour scale (°C heat index). Band edges match the 4H levels: 27, 33, 42.
const STOPS = [[24, [70, 130, 200]], [27, [36, 158, 98]], [30, [150, 180, 40]], [33, [236, 168, 28]], [37, [226, 96, 34]], [42, [184, 34, 54]], [46, [110, 60, 165]]];
export function heatColor(hi) {
  if (hi == null || !Number.isFinite(hi)) return "var(--line)";
  if (hi <= STOPS[0][0]) return `rgb(${STOPS[0][1]})`;
  for (let k = 1; k < STOPS.length; k++) {
    const [b, cb] = STOPS[k], [a, ca] = STOPS[k - 1];
    if (hi <= b) { const f = (hi - a) / (b - a); return `rgb(${ca.map((v, j) => Math.round(v + (cb[j] - v) * f)).join(",")})`; }
  }
  return `rgb(${STOPS.at(-1)[1]})`;
}

/** Heat index (°C, adjusted to PAGASA's scale) for one model cell at hour i. */
const cellHI = (c, i) => (c.t[i] == null || c.rh[i] == null ? null : heatIndexC(c.t[i], c.rh[i]) + CALIBRATION.offset);
/** Inverse-distance weights from each place to the model cells. */
function weightsFor(lat, lon, cells) {
  const w = cells.map((c) => { const d2 = (c.lat - lat) ** 2 + ((c.lon - lon) * Math.cos((lat * Math.PI) / 180)) ** 2; return 1 / Math.max(d2, 1e-6); });
  const sum = w.reduce((a, b) => a + b, 0);
  return w.map((x) => x / sum);
}
/** A period's series, interpolated to the given places. Pure; used by the page and the tests. */
export function makeReplay(periodId, places) {
  const p = REPLAY_PERIODS.find((x) => x.id === periodId) || REPLAY_PERIODS[0];
  const W = places.map((s) => weightsFor(s.lat, s.lon, p.cells));
  const base = Date.UTC(+p.start.slice(0, 4), +p.start.slice(5, 7) - 1, +p.start.slice(8, 10), +p.start.slice(11, 13));
  const at = (i) => {
    const h = p.cells.map((c) => cellHI(c, i));
    return W.map((w) => { let v = 0; for (let k = 0; k < w.length; k++) { if (h[k] == null) return null; v += w[k] * h[k]; } return Math.round(v * 10) / 10; });
  };
  const when = (i) => new Date(base + i * 3600e3); // read with getUTC*: the archive is already in Manila time
  const days = Math.floor(p.hours / 24);
  const dailyMax = Array.from({ length: days }, (_, d) => {
    let m = -Infinity;
    for (let hr = 7; hr <= 17; hr++) for (const c of p.cells) { const v = cellHI(c, d * 24 + hr); if (v != null) m = Math.max(m, v); }
    return Math.round(m * 10) / 10;
  });
  return { period: p, at, when, days, dailyMax, hours: p.hours };
}

const fmtWhen = (d) => `${d.toLocaleDateString("en-PH", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })} · ${String(d.getUTCHours()).padStart(2, "0")}:00`;
const fmtDay = (d) => d.toLocaleDateString("en-PH", { day: "numeric", month: "short", timeZone: "UTC" });
const LEVEL_WORD = { HAYO: "HAYO", HINAY: "HINAY", HINGA: "HINGA", HINTO: "HINTO" };

let timer = null, scene = null;
export function stopReplay() { clearInterval(timer); timer = null; scene?.dispose(); scene = null; }
const webgl = () => { try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch { return false; } };
const st = { periodId: REPLAY_PERIODS[0].id, i: null, selected: null, use3D: null };

/** Renders the replay page into `main`. `schools` = [{ id, name, lat, lon }]. */
export function replayPage(main, schools) {
  stopReplay();
  if (st.use3D == null) st.use3D = webgl();
  const R = makeReplay(st.periodId, schools);
  const D = makeReplay(st.periodId, DISTRICTS.map(([name, lat, lon]) => ({ name, lat, lon })));
  if (st.i == null || st.i >= R.hours) {
    // Start at 14:00 on the day the period is known for (the suspension), else on its hottest afternoon.
    const FOCUS = { "2024-04": "2024-04-01", "2026-11": "2026-11-03" };
    const f = FOCUS[R.period.id], d0 = f ? Math.round((Date.UTC(+f.slice(0, 4), +f.slice(5, 7) - 1, +f.slice(8, 10)) - R.when(0).getTime()) / 864e5) : -1;
    const d = d0 >= 0 && d0 < R.days ? d0 : R.dailyMax.indexOf(Math.max(...R.dailyMax));
    st.i = d * 24 + 14;
  }
  const P = projection([...schools, ...DISTRICTS.map(([, lat, lon]) => ({ lat, lon }))], 640);
  const maxDay = Math.max(...R.dailyMax), minDay = Math.min(...R.dailyMax);
  const bars = R.dailyMax.map((v, d) => {
    const h = 18 + ((v - minDay) / Math.max(1, maxDay - minDay)) * 30;
    return `<button class="rp-bar" data-day="${d}" style="height:${h.toFixed(0)}px;background:${heatColor(v)}" title="${fmtDay(R.when(d * 24))}: up to ${v.toFixed(1)}°C" aria-label="${fmtDay(R.when(d * 24))}, up to ${v.toFixed(1)}°C"></button>`;
  }).join("");
  main.innerHTML = `<div class="replay-page">
    <div class="rp-head">
      <div><h1>Heat replay</h1><p class="muted small">${esc(R.period.note)}</p></div>
      <div class="row" role="group" aria-label="Period">${REPLAY_PERIODS.map((p) => `<button class="chip-btn" data-period="${p.id}" aria-pressed="${p.id === st.periodId}">${esc(p.label)}</button>`).join("")}</div>
    </div>
    <section class="card rp-now" aria-live="polite">
      <div><div class="eyebrow" id="rpWhen"></div><div class="rp-hi"><b id="rpHi" class="mono"></b><span id="rpLvl"></span></div><p class="small" id="rpCount"></p></div>
      <div class="rp-controls">
        <button id="rpPrev" aria-label="One hour back">‹</button>
        <button id="rpPlay" class="primary" aria-label="Play">▶ Play</button>
        <button id="rpNext" aria-label="One hour forward">›</button>
      </div>
    </section>
    <section class="card rp-time" aria-label="Timeline">
      <div class="rp-bars" style="grid-template-columns:repeat(${R.days},1fr)">${bars}</div>
      <input type="range" id="rpSlider" min="0" max="${R.hours - 1}" step="1" value="${st.i}" aria-label="Time">
      <div class="row small muted" style="justify-content:space-between"><span>${fmtDay(R.when(0))}</span><span>Daily peak during school hours (07:00–17:00)</span><span>${fmtDay(R.when(R.hours - 1))}</span></div>
    </section>
    <div class="rp-main">
      <section class="card rp-map" aria-label="Map of Iloilo City schools by heat index">
        <div class="rp-stage" id="rpStage"></div>
        <div class="tools">${st.use3D ? `<button data-preset="overview">Overview</button><button data-preset="north">North</button><button data-preset="south">South</button>` : ""}<button id="rpView">${st.use3D ? "2D map" : "3D view"}</button></div>
        <div class="tip" id="rpTip" hidden></div>
        <p class="small muted rp-hint">${st.use3D ? "Drag to turn the city, scroll to zoom, tap a column to follow a school. Taller and redder means hotter." : "Tap a school to follow it."}</p>
        <div class="rp-legend"><span class="small">Heat index</span><i style="background:linear-gradient(90deg,${[24, 27, 30, 33, 37, 42, 46].map((v) => heatColor(v)).join(",")})"></i>
          <span class="rp-ticks small mono"><span>24</span><span>27</span><span>33</span><span>42</span><span>46°C</span></span></div>
      </section>
      <section class="card rp-side">
        <div class="eyebrow">This day, hour by hour</div>
        <svg id="rpDay" viewBox="0 0 240 110" class="rp-day" role="img" aria-label="City heat index through the day"></svg>
        <div id="rpPick" class="small"><p class="muted">Tap a school to follow it.</p></div>
      </section>
    </div>
    <p class="small muted">Weather: Open-Meteo historical archive, hourly temperature and humidity on the model grid over the city, blended for each school. Heat index adjusted +${CALIBRATION.offset}°C to PAGASA's scale.</p>
    <p class="small"><a href="#start">Back to sign in</a></p>
  </div>`;

  const $ = (s) => main.querySelector(s);
  const stage = $("#rpStage");
  let dots = [], halos = [], townHi = [];
  const draw2D = () => {
    stage.innerHTML = `<svg class="map" viewBox="-16 -16 ${P.W + 32} ${P.H + 32}" role="img" aria-label="Iloilo City heat map">
      <g id="rpHalo">${schools.map((s) => `<circle cx="${P.x(s.lon).toFixed(1)}" cy="${P.y(s.lat).toFixed(1)}" r="26" opacity=".22"/>`).join("")}</g>
      <g id="rpDots">${schools.map((s) => `<circle class="rp-dot" data-id="${s.id}" cx="${P.x(s.lon).toFixed(1)}" cy="${P.y(s.lat).toFixed(1)}" r="7" stroke="var(--surface)" stroke-width="1.5" tabindex="0" role="button"><title>${esc(s.name)}</title></circle>`).join("")}</g>
      <g>${DISTRICTS.map(([n, lat, lon]) => `<g transform="translate(${P.x(lon).toFixed(1)},${P.y(lat).toFixed(1)})"><text class="rp-town" text-anchor="middle" y="-4">${esc(n)}</text><text class="rp-town-hi mono" text-anchor="middle" y="12"></text></g>`).join("")}</g>
    </svg>`;
    dots = [...stage.querySelectorAll(".rp-dot")]; halos = [...stage.querySelectorAll("#rpHalo circle")]; townHi = [...stage.querySelectorAll(".rp-town-hi")];
    dots.forEach((el) => { el.onclick = () => pick(el.dataset.id); el.onkeydown = (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); pick(el.dataset.id); } }; });
  };
  const col3 = (hi) => (hi == null ? "#8a8f8c" : heatColor(hi));
  const tip = $("#rpTip");
  const fallback2D = () => { st.use3D = false; scene?.dispose(); scene = null; replayPage(main, schools); };
  const mount3D = () => {
    stage.innerHTML = `<div class="c3d rp-c3d"></div>`;
    loadThree().then((THREE) => {
      if (!main.isConnected || !stage.isConnected) return;
      scene = heat3D(THREE, stage.firstChild, schools, DISTRICTS.map(([name, lat, lon]) => ({ name, lat, lon })), {
        onSelect: (id) => pick(String(id)),
        onHover: (id, pos) => {
          if (id == null) { tip.hidden = true; return; }
          const k = schools.findIndex((x) => String(x.id) === String(id)), v = R.at(st.i)[k];
          tip.hidden = false; tip.style.left = `${stage.offsetLeft + pos.x + 12}px`; tip.style.top = `${stage.offsetTop + pos.y}px`;
          tip.textContent = `${schools[k].name}: ${v == null ? "–" : `${v.toFixed(1)}°C ${level(v)}`}`;
        },
      });
      update();
      setTimeout(() => { if (scene && !scene.firstFrame()) fallback2D(); }, 3000);
    }).catch(fallback2D);
  };
  const dayChart = (i) => {
    const d0 = Math.floor(i / 24) * 24, city = [];
    for (let h = 0; h < 24; h++) { const v = R.at(d0 + h).filter((x) => x != null); city.push(v.length ? v.reduce((a, b) => a + b, 0) / v.length : null); }
    const lo = 22, hi = 48, X = (h) => 8 + (h / 23) * 224, Y = (v) => 100 - ((v - lo) / (hi - lo)) * 90;
    const band = (a, b, c) => `<rect x="8" width="224" y="${Y(b).toFixed(1)}" height="${(Y(a) - Y(b)).toFixed(1)}" fill="${c}" opacity=".12"/>`;
    const pts = city.map((v, h) => (v == null ? null : `${X(h).toFixed(1)},${Y(v).toFixed(1)}`)).filter(Boolean).join(" ");
    const h = i - d0, cv = city[h];
    $("#rpDay").innerHTML = `${band(lo, 27, heatColor(25))}${band(27, 33, heatColor(30))}${band(33, 42, heatColor(37))}${band(42, hi, heatColor(44))}
      <rect x="${X(7).toFixed(1)}" y="8" width="${(X(17) - X(7)).toFixed(1)}" height="92" fill="none" stroke="var(--line-strong)" stroke-dasharray="3 3"/>
      <polyline points="${pts}" fill="none" stroke="var(--ink)" stroke-width="2"/>
      ${cv != null ? `<circle cx="${X(h).toFixed(1)}" cy="${Y(cv).toFixed(1)}" r="4.5" fill="${heatColor(cv)}" stroke="var(--ink)" stroke-width="1.5"/>` : ""}
      <text x="8" y="108" class="rp-axis">00</text><text x="${X(7) - 6}" y="108" class="rp-axis">07</text><text x="${X(17) - 6}" y="108" class="rp-axis">17</text><text x="220" y="108" class="rp-axis">23</text>`;
  };
  const update = () => {
    const i = st.i, v = R.at(i), dv = D.at(i), when = R.when(i);
    const ok = v.filter((x) => x != null), avg = ok.length ? ok.reduce((a, b) => a + b, 0) / ok.length : null;
    const counts = {}; for (const x of ok) { const l = level(x); counts[l] = (counts[l] || 0) + 1; }
    $("#rpWhen").textContent = fmtWhen(when);
    $("#rpHi").textContent = avg == null ? "–" : `${avg.toFixed(1)}°C`;
    $("#rpHi").style.color = heatColor(avg);
    const L = avg == null ? null : level(avg);
    $("#rpLvl").innerHTML = L ? `<span class="lvl ${L}">${LEVEL_WORD[L]}</span>` : "";
    $("#rpCount").textContent = ok.length ? `City average across ${ok.length} schools. ${["HINTO", "HINGA", "HINAY", "HAYO"].filter((l) => counts[l]).map((l) => `${counts[l]} at ${l}`).join(", ")}.` : "No data for this hour.";
    if (scene) scene.update(v, dv, col3, st.selected);
    dots.forEach((el, k) => el.setAttribute("fill", heatColor(v[k])));
    halos.forEach((el, k) => el.setAttribute("fill", heatColor(v[k])));
    townHi.forEach((el, k) => { el.textContent = dv[k] == null ? "" : `${dv[k].toFixed(1)}°`; el.setAttribute("fill", heatColor(dv[k])); });
    main.querySelectorAll(".rp-bar").forEach((b, d) => b.classList.toggle("on", d === Math.floor(i / 24)));
    $("#rpSlider").value = i;
    if (st.selected != null) {
      const k = schools.findIndex((s) => s.id === st.selected);
      if (k >= 0) $("#rpPick").innerHTML = `<p><b>${esc(schools[k].name)}</b></p><p><span class="mono" style="font-size:22px;color:${heatColor(v[k])}">${v[k] == null ? "–" : `${v[k].toFixed(1)}°C`}</span> ${v[k] == null ? "" : `<span class="lvl ${level(v[k])}">${level(v[k])}</span>`}</p>`;
    }
    dots.forEach((el) => el.setAttribute("r", el.dataset.id === String(st.selected) ? "10" : "7"));
    dayChart(i);
  };
  function pick(id) { st.selected = String(id); update(); }
  const setI = (i) => { st.i = Math.max(0, Math.min(R.hours - 1, i)); update(); };
  const playBtn = $("#rpPlay");
  const setPlaying = (on) => {
    stopReplay();
    playBtn.textContent = on ? "❚❚ Pause" : "▶ Play"; playBtn.setAttribute("aria-label", on ? "Pause" : "Play");
    if (on) timer = setInterval(() => { if (!main.isConnected) return stopReplay(); if (st.i >= R.hours - 1) { setPlaying(false); return; } setI(st.i + 1); }, 220);
  };
  playBtn.onclick = () => setPlaying(!timer);
  $("#rpPrev").onclick = () => { setPlaying(false); setI(st.i - 1); };
  $("#rpNext").onclick = () => { setPlaying(false); setI(st.i + 1); };
  $("#rpSlider").oninput = (e) => { setPlaying(false); setI(+e.target.value); };
  main.querySelectorAll(".rp-bar").forEach((b) => (b.onclick = () => { setPlaying(false); setI(+b.dataset.day * 24 + 14); }));
  main.querySelectorAll("[data-period]").forEach((b) => (b.onclick = () => { if (b.dataset.period === st.periodId) return; st.periodId = b.dataset.period; st.i = null; replayPage(main, schools); }));
  $("#rpView").onclick = () => { st.use3D = !st.use3D; replayPage(main, schools); };
  main.querySelectorAll("[data-preset]").forEach((b) => (b.onclick = () => scene?.preset(b.dataset.preset)));
  if (st.use3D) mount3D(); else draw2D();
  main.onkeydown = (e) => { if (e.target.tagName === "INPUT") return; if (e.key === "ArrowLeft") setI(st.i - 1); if (e.key === "ArrowRight") setI(st.i + 1); };
  update();
}
