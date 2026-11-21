// 3D map layer for the EUDR-Snap story: globe, terrain, extruded plots, flows, tree-loss.
/* global maplibregl */

const ESRI = "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}";
const TERRARIUM = "https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png";
const HANSEN_LOSS = "https://storage.googleapis.com/earthenginepartners-hansen/tiles/gfc_v1.11/loss_alpha/{z}/{x}/{y}.png";

export const ROTTERDAM = [4.4, 51.9];
export const COLOURS = {
  green: "#2bd576",
  amber: "#ffb020",
  red: "#ff4d4f",
  excluded: "#8a3a3d",
  unchecked: "#c9d6e3",
  eu: "#5ee7ff",
  noneu: "#b18cff",
};

const empty = () => ({ type: "FeatureCollection", features: [] });
const raf = (fn) => requestAnimationFrame(fn);
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function tween(ms, onFrame) {
  return new Promise((resolve) => {
    const t0 = performance.now();
    const step = (now) => {
      const t = Math.min(1, (now - t0) / ms);
      onFrame(ease(t), t);
      if (t < 1) raf(step);
      else resolve();
    };
    raf(step);
  });
}

// Great-circle points between two lon/lat pairs.
function greatCircle([lon1, lat1], [lon2, lat2], n = 128) {
  const r = Math.PI / 180;
  const [p1, l1, p2, l2] = [lat1 * r, lon1 * r, lat2 * r, lon2 * r];
  const d = 2 * Math.asin(Math.sqrt(Math.sin((p2 - p1) / 2) ** 2 + Math.cos(p1) * Math.cos(p2) * Math.sin((l2 - l1) / 2) ** 2));
  const out = [];
  for (let i = 0; i <= n; i++) {
    const f = i / n;
    const A = Math.sin((1 - f) * d) / Math.sin(d);
    const B = Math.sin(f * d) / Math.sin(d);
    const x = A * Math.cos(p1) * Math.cos(l1) + B * Math.cos(p2) * Math.cos(l2);
    const y = A * Math.cos(p1) * Math.sin(l1) + B * Math.cos(p2) * Math.sin(l2);
    const z = A * Math.sin(p1) + B * Math.sin(p2);
    out.push([Math.atan2(y, x) / r, Math.atan2(z, Math.sqrt(x * x + y * y)) / r]);
  }
  return out;
}

// Gentle curve on the ground between a farm and the warehouse.
function groundArc(a, b, n = 48) {
  const mid = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const ctrl = [mid[0] - dy * 0.25, mid[1] + dx * 0.25];
  const out = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    out.push([
      (1 - t) ** 2 * a[0] + 2 * (1 - t) * t * ctrl[0] + t * t * b[0],
      (1 - t) ** 2 * a[1] + 2 * (1 - t) * t * ctrl[1] + t * t * b[1],
    ]);
  }
  return out;
}

// Small circle polygon (for extruding point plots as columns).
function circle([lon, lat], metres, n = 28) {
  const dLat = metres / 111320;
  const dLon = dLat / Math.cos((lat * Math.PI) / 180);
  const ring = [];
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    ring.push([lon + Math.cos(a) * dLon, lat + Math.sin(a) * dLat]);
  }
  return { type: "Polygon", coordinates: [ring] };
}

export function centroid(geom) {
  if (geom.type === "Point") return geom.coordinates;
  const ring = geom.coordinates[0].slice(0, -1);
  return [ring.reduce((s, p) => s + p[0], 0) / ring.length, ring.reduce((s, p) => s + p[1], 0) / ring.length];
}

export class Map3D {
  constructor(container, { lite = false } = {}) {
    this.lite = lite;
    this.heightFactor = 0;
    this.markers = new Map();
    this.spinning = false;
    this.map = new maplibregl.Map({
      container,
      style: {
        version: 8,
        projection: { type: "globe" },
        sources: {
          sat: { type: "raster", tiles: [ESRI], tileSize: 256, maxzoom: 19, attribution: "Imagery © Esri, Maxar, Earthstar Geographics" },
          dem: { type: "raster-dem", tiles: [TERRARIUM], encoding: "terrarium", tileSize: 256, maxzoom: 14, attribution: "Terrain: Mapzen/AWS Terrain Tiles" },
          loss: { type: "raster", tiles: [HANSEN_LOSS], tileSize: 256, maxzoom: 12, attribution: "Tree cover loss: Hansen/UMD/Google/USGS/NASA" },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "#05070d" } },
          { id: "sat", type: "raster", source: "sat", paint: { "raster-saturation": -0.15, "raster-contrast": 0.1 } },
          { id: "loss", type: "raster", source: "loss", paint: { "raster-opacity": 0, "raster-opacity-transition": { duration: 1500 }, "raster-hue-rotate": 320 } },
        ],
        sky: {
          "sky-color": "#0b1a33",
          "horizon-color": "#3a6ea5",
          "fog-color": "#0b1a33",
          "sky-horizon-blend": 0.6,
          "horizon-fog-blend": 0.4,
          "fog-ground-blend": 0.2,
          "atmosphere-blend": ["interpolate", ["linear"], ["zoom"], 0, 1, 6, 0.6, 9, 0],
        },
      },
      center: [-30, 18],
      zoom: 1.6,
      pitch: 0,
      maxPitch: 80,
      pixelRatio: Math.min(window.devicePixelRatio || 1, 2),
      attributionControl: { compact: true },
    });
    this.ready = new Promise((resolve) => this.map.on("load", resolve)).then(() => this._addLayers());
    this.map.on("mousedown", () => (this.spinning = false));
  }

  _addLayers() {
    const m = this.map;
    m.addSource("arc", { type: "geojson", data: empty(), lineMetrics: true });
    m.addLayer({ id: "arc-glow", type: "line", source: "arc", paint: { "line-color": COLOURS.eu, "line-width": 12, "line-opacity": 0.25, "line-blur": 8 } });
    m.addLayer({ id: "arc", type: "line", source: "arc", layout: { "line-cap": "round" }, paint: { "line-width": 3, "line-gradient": ["interpolate", ["linear"], ["line-progress"], 0, "#5ee7ff", 1, "#2bd576"] } });

    m.addSource("flows", { type: "geojson", data: empty() });
    m.addLayer({ id: "flows-glow", type: "line", source: "flows", paint: { "line-color": ["get", "colour"], "line-width": 10, "line-opacity": 0.22, "line-blur": 6 } });
    m.addLayer({ id: "flows", type: "line", source: "flows", layout: { "line-cap": "butt" }, paint: { "line-color": ["get", "colour"], "line-width": 3.5, "line-dasharray": [0, 4, 3] } });

    // Light beams: wide, tall, translucent columns so plot status reads at regional zoom.
    m.addSource("beams", { type: "geojson", data: empty() });
    m.addLayer({
      id: "beams",
      type: "fill-extrusion",
      source: "beams",
      maxzoom: 13, // close-ups show the real plot extrusion instead
      paint: {
        "fill-extrusion-color": ["get", "colour"],
        "fill-extrusion-height": ["*", ["get", "bh"], 0],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.42,
      },
    });
    m.addSource("plots", { type: "geojson", data: empty() });
    m.addLayer({
      id: "plots-ext",
      type: "fill-extrusion",
      source: "plots",
      paint: {
        "fill-extrusion-color": ["get", "colour"],
        "fill-extrusion-height": ["*", ["get", "h"], 0],
        "fill-extrusion-base": 0,
        "fill-extrusion-opacity": 0.88,
      },
    });
    m.addLayer({ id: "plots-line", type: "line", source: "plots", paint: { "line-color": ["get", "colour"], "line-width": 2.5, "line-blur": 1 } });

    m.addSource("walk", { type: "geojson", data: empty() });
    m.addLayer({ id: "walk", type: "line", source: "walk", filter: ["==", ["geometry-type"], "LineString"], layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#5ee7ff", "line-width": 4 } });
    m.addLayer({ id: "walk-head", type: "circle", source: "walk", filter: ["==", ["geometry-type"], "Point"], paint: { "circle-radius": 9, "circle-color": "#5ee7ff", "circle-stroke-color": "#fff", "circle-stroke-width": 2, "circle-pitch-alignment": "map" } });

    this._dashLoop();
  }

  setLite(lite) {
    this.lite = lite;
    if (lite) this.map.setTerrain(null);
    else if (this.map.getZoom() > 4) this.map.setTerrain({ source: "dem", exaggeration: 1.6 });
  }

  enableTerrain() {
    if (!this.lite) this.map.setTerrain({ source: "dem", exaggeration: 1.6 });
  }

  spin() {
    this.spinning = true;
    const step = () => {
      if (!this.spinning) return;
      const c = this.map.getCenter();
      this.map.setCenter([c.lng + 0.06, c.lat]);
      raf(step);
    };
    raf(step);
  }

  async drawArc(to) {
    const pts = greatCircle(ROTTERDAM, to);
    const token = (this.arcToken = (this.arcToken || 0) + 1);
    await tween(2600, (e) => {
      if (token !== this.arcToken) return;
      const n = Math.max(2, Math.round(e * pts.length));
      this.map.getSource("arc").setData({ type: "Feature", geometry: { type: "LineString", coordinates: pts.slice(0, n) } });
    });
  }

  clearArc() {
    this.arcToken = (this.arcToken || 0) + 1;
    this.map.getSource("arc")?.setData(empty());
  }

  fly(opts) {
    this.spinning = false;
    return new Promise((resolve) => {
      this.map.once("moveend", resolve);
      this.map.flyTo({ essential: true, curve: 1.6, ...opts });
    });
  }

  fit(coords, opts = {}) {
    this.spinning = false;
    const b = coords.reduce((acc, c) => acc.extend(c), new maplibregl.LngLatBounds(coords[0], coords[0]));
    return new Promise((resolve) => {
      this.map.once("moveend", resolve);
      this.map.setPadding({ top: 0, bottom: 0, left: 0, right: 0 });
      const wide = window.innerWidth > 760;
      const padding = wide
        ? { top: 110, bottom: 120, left: 70, right: Math.min(520, window.innerWidth * 0.45) }
        : { top: 70, bottom: Math.round(window.innerHeight * 0.58), left: 30, right: 30 };
      this.map.fitBounds(b, { padding, duration: 3500, ...opts });
    });
  }

  // plots: [{ id, geometry, colour, height }]
  setPlots(plots) {
    this.map.getSource("beams")?.setData({
      type: "FeatureCollection",
      features: plots.map((p) => ({ type: "Feature", properties: { colour: p.colour, bh: p.height * 14 }, geometry: circle(centroid(p.geometry), 650, 24) })),
    });
    this.map.getSource("plots")?.setData({
      type: "FeatureCollection",
      features: plots.map((p) => ({
        type: "Feature",
        properties: { id: p.id, colour: p.colour, h: p.height },
        geometry: p.geometry.type === "Point" ? circle(p.geometry.coordinates, 70) : p.geometry,
      })),
    });
  }

  async raisePlots(ms = 1800) {
    await tween(ms, (e) => {
      this.heightFactor = e;
      this.map.setPaintProperty("plots-ext", "fill-extrusion-height", ["*", ["get", "h"], e]);
      this.map.setPaintProperty("beams", "fill-extrusion-height", ["*", ["get", "bh"], e]);
    });
  }

  // markers: [{ id, lngLat, label, sub, colour, onClick }]
  setMarkers(list) {
    for (const item of list) {
      let entry = this.markers.get(item.id);
      if (!entry) {
        const el = document.createElement("button");
        el.className = "pin";
        el.innerHTML = `<span class="pin-rings"><i></i><i></i><i></i></span><span class="pin-dot"></span><span class="pin-label"><b></b><small></small></span>`;
        el.addEventListener("click", (ev) => {
          ev.stopPropagation();
          entry.onClick?.();
        });
        const marker = new maplibregl.Marker({ element: el, anchor: "center" }).setLngLat(item.lngLat).addTo(this.map);
        entry = { el, marker };
        this.markers.set(item.id, entry);
      }
      entry.onClick = item.onClick;
      entry.marker.setLngLat(item.lngLat);
      entry.el.style.setProperty("--c", item.colour);
      entry.el.querySelector("b").textContent = item.label;
      entry.el.querySelector("small").textContent = item.sub || "";
      entry.el.classList.toggle("hidden", Boolean(item.hidden));
      entry.el.classList.toggle("alert", Boolean(item.alert));
      entry.el.classList.toggle("warehouse", Boolean(item.warehouse));
    }
  }

  setScanning(on) {
    for (const { el } of this.markers.values()) el.classList.toggle("scanning", on && !el.classList.contains("warehouse"));
  }

  showLoss(on) {
    this.map.setPaintProperty("loss", "raster-opacity", on ? 0.55 : 0);
  }

  // flows: [{ from, to, colour }]
  setFlows(flows) {
    this.map.getSource("flows")?.setData({
      type: "FeatureCollection",
      features: flows.map((f) => ({ type: "Feature", properties: { colour: f.colour }, geometry: { type: "LineString", coordinates: groundArc(f.from, f.to) } })),
    });
  }

  _dashLoop() {
    // Marching-ants animation (MapLibre "animate a line" pattern).
    const seq = [[0, 4, 3], [0.5, 4, 2.5], [1, 4, 2], [1.5, 4, 1.5], [2, 4, 1], [2.5, 4, 0.5], [3, 4, 0], [0, 0.5, 3, 3.5], [0, 1, 3, 3], [0, 1.5, 3, 2.5], [0, 2, 3, 2], [0, 2.5, 3, 1.5], [0, 3, 3, 1], [0, 3.5, 3, 0.5]];
    let i = -1;
    const step = (t) => {
      const next = Math.floor((t / 60) % seq.length);
      if (next !== i && this.map.getLayer("flows")) {
        this.map.setPaintProperty("flows", "line-dasharray", seq[next]);
        i = next;
      }
      raf(step);
    };
    raf(step);
  }

  async walkBoundary(ring, ms = 4200) {
    const coords = ring.slice();
    await tween(ms, (e) => {
      const pos = e * (coords.length - 1);
      const i = Math.floor(pos);
      const f = pos - i;
      const a = coords[i];
      const b = coords[Math.min(i + 1, coords.length - 1)];
      const head = [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
      const line = [...coords.slice(0, i + 1), head];
      this.map.getSource("walk").setData({
        type: "FeatureCollection",
        features: [
          { type: "Feature", properties: {}, geometry: { type: "LineString", coordinates: line.length > 1 ? line : [head, head] } },
          { type: "Feature", properties: {}, geometry: { type: "Point", coordinates: head } },
        ],
      });
    });
  }

  clearWalk() {
    this.map.getSource("walk")?.setData(empty());
  }
}
