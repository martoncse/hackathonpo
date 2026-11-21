// Adapted from presko_otherversion/PRESKO/app/scene3d.js (team branch hack/catatsekali-and-eudr-snap).
// "Diorama on a site plan" (three.js r128 UMD, loaded lazily). Reads only the view model. Any failure → caller falls back to 2D.
import { projection } from "./scenes.js";

const THREE_URL = "https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js";
let loading = null;

/** 3D on by default wherever WebGL works, except with data saver, a slow network or very little memory. */
export function prefers3D() {
  const n = navigator.connection || {};
  if (n.saveData) return false;
  if (/(^|-)2g|3g/.test(n.effectiveType || "")) return false;
  if (navigator.deviceMemory && navigator.deviceMemory <= 2) return false;
  try { const c = document.createElement("canvas"); return !!(c.getContext("webgl") || c.getContext("experimental-webgl")); } catch { return false; }
}

export function loadThree(timeoutMs = 3000) {
  if (window.THREE) return Promise.resolve(window.THREE);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      const s = document.createElement("script");
      s.src = THREE_URL; s.async = true;
      s.onload = () => (window.THREE ? resolve(window.THREE) : reject(new Error("three.js missing")));
      s.onerror = () => reject(new Error("three.js failed to load"));
      document.head.append(s);
      setTimeout(() => reject(new Error("three.js timed out")), timeoutMs);
    }).catch((e) => { loading = null; throw e; });
  }
  return loading;
}

const css = (name) => getComputedStyle(document.documentElement).getPropertyValue(name).trim() || "#888";
const isLight = () => { const c = css("--bg").replace("#", ""); const n = parseInt(c.length === 3 ? c.split("").map((x) => x + x).join("") : c, 16); return ((n >> 16) & 255) * 0.3 + ((n >> 8) & 255) * 0.59 + (n & 255) * 0.11 > 128; };
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function shell(THREE, el, { fitRadius = 8 } = {}) {
  el.innerHTML = "";
  const canvas = document.createElement("canvas");
  canvas.setAttribute("aria-hidden", "true");
  el.append(canvas);
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, devicePixelRatio || 1));
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  const scene = new THREE.Scene();
  const fov = 30;
  const camera = new THREE.PerspectiveCamera(fov, 1, 0.1, 400);
  scene.add(new THREE.HemisphereLight(0xffffff, new THREE.Color(css("--ground")), 0.65));
  const sun = new THREE.DirectionalLight(0xffe9c7, 0.85);
  sun.position.set(-6, 16, 9); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  const sc = sun.shadow.camera; sc.left = -fitRadius - 1; sc.right = fitRadius + 1; sc.top = fitRadius + 1; sc.bottom = -fitRadius - 1; sc.near = 1; sc.far = 60;
  scene.add(sun);
  const baseR = (fitRadius / Math.sin(((fov / 2) * Math.PI) / 180)) * 1.08;
  const view = { theta: Math.PI / 4, phi: 0.9, r: baseR, target: new THREE.Vector3(0, 0, 0) };
  const place = () => {
    camera.position.set(view.target.x + view.r * Math.sin(view.phi) * Math.sin(view.theta), view.r * Math.cos(view.phi), view.target.z + view.r * Math.sin(view.phi) * Math.cos(view.theta));
    camera.lookAt(view.target);
  };
  const resize = () => { const w = el.clientWidth || 600, h = el.clientHeight || 440; renderer.setSize(w, h, false); camera.aspect = w / h; camera.updateProjectionMatrix(); };
  let drag = null;
  canvas.addEventListener("pointerdown", (e) => { drag = { x: e.clientX, y: e.clientY, moved: false }; canvas.setPointerCapture(e.pointerId); });
  canvas.addEventListener("pointermove", (e) => {
    if (!drag) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
    view.theta -= dx * 0.008; view.phi = Math.min(1.3, Math.max(0.35, view.phi - dy * 0.006));
    drag.x = e.clientX; drag.y = e.clientY; place();
  });
  canvas.addEventListener("wheel", (e) => { e.preventDefault(); view.r = Math.min(baseR * 1.6, Math.max(baseR * 0.6, view.r * (1 + Math.sign(e.deltaY) * 0.08))); place(); }, { passive: false });
  const tweens = [];
  const tween = (obj, key, to, ms = 400, delay = 0) => {
    if (reduced()) { obj[key] = to; return; }
    tweens.push({ obj, key, from: obj[key], to, t0: performance.now() + delay, ms });
  };
  let raf = 0, alive = true, firstFrame = false;
  const loop = (t) => {
    if (!alive) return;
    for (let i = tweens.length - 1; i >= 0; i--) {
      const tw = tweens[i]; if (t < tw.t0) continue;
      const k = Math.min(1, (t - tw.t0) / tw.ms), e = 1 - Math.pow(1 - k, 3);
      tw.obj[tw.key] = tw.from + (tw.to - tw.from) * e; if (k >= 1) tweens.splice(i, 1);
    }
    if (tweens.some((tw) => tw.obj === view)) place();
    renderer.render(scene, camera); firstFrame = true; raf = requestAnimationFrame(loop);
  };
  const ro = new ResizeObserver(resize); ro.observe(el);
  resize(); place(); raf = requestAnimationFrame(loop);
  const pick = (e, objects) => {
    const r = canvas.getBoundingClientRect();
    const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    const ray = new THREE.Raycaster(); ray.setFromCamera(v, camera);
    return ray.intersectObjects(objects, false)[0]?.object || null;
  };
  const toScreen = (vec) => { const p = vec.clone().project(camera); const r = canvas.getBoundingClientRect(); return { x: ((p.x + 1) / 2) * r.width, y: ((1 - p.y) / 2) * r.height }; };
  return {
    THREE, scene, camera, canvas, view, place, tween, pick, toScreen, baseR,
    get dragged() { return drag?.moved; }, endDrag() { drag = null; },
    get firstFrame() { return firstFrame; },
    dispose() { alive = false; cancelAnimationFrame(raf); ro.disconnect(); renderer.dispose(); renderer.forceContextLoss(); },
  };
}

function mat(THREE, color, extra = {}) { return new THREE.MeshStandardMaterial({ color: new THREE.Color(color), roughness: 0.8, metalness: 0, flatShading: true, ...extra }); }
function withEdges(THREE, mesh, color, opacity) {
  const e = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry), new THREE.LineBasicMaterial({ color: new THREE.Color(color), transparent: true, opacity }));
  mesh.add(e); return e;
}
function slab(THREE, w, h) {
  const g = new THREE.BoxGeometry(w, 0.25, h);
  const side = mat(THREE, css("--ground-side")), top = mat(THREE, css("--ground"));
  const m = new THREE.Mesh(g, [side, side, top, side, side, side]);
  m.position.y = -0.125; m.receiveShadow = true;
  return m;
}

const PRESETS = { overview: { theta: Math.PI / 4, phi: 0.9 }, north: { theta: Math.PI, phi: 0.78 }, south: { theta: 0, phi: 0.78 } };

/** Division: a puck per school; a column rises with official face-to-face sections; see-through ghost = F2F request. */
export function division3D(THREE, el, vm, { onSelect, onHover } = {}) {
  const P = projection(vm.schools, 12);
  const S = shell(THREE, el, { fitRadius: Math.hypot(P.W + 1.5, P.H + 1.5) / 2 });
  S.scene.add(slab(THREE, P.W + 1.5, P.H + 1.5));
  const kmUnits = P.kmPx; // projection(…, 12) gives scene units per km
  const divisions = Math.max(2, Math.round((P.W + 1.5) / kmUnits));
  const grid = new THREE.GridHelper(divisions * kmUnits, divisions, new THREE.Color(css("--line")), new THREE.Color(css("--line")));
  grid.material.transparent = true; grid.material.opacity = 0.6; grid.position.y = 0.002; S.scene.add(grid);
  const light = isLight(), edgeOp = light ? 0.22 : 0.5, ink = css("--ink");
  const cx = P.W / 2, cz = P.H / 2;
  const maxF2F = Math.max(1, ...vm.schools.map((v) => Math.max(v.f2fSections || 0, v.requestSections || 0)));
  const marks = new Map();
  for (const v of vm.schools) {
    const x = P.x(v.lon) - cx, z = P.y(v.lat) - cz;
    const puck = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.08, 24), mat(THREE, css("--line-strong")));
    puck.position.set(x, 0.04, z); puck.castShadow = true; puck.userData.id = v.id; withEdges(THREE, puck, ink, edgeOp); S.scene.add(puck);
    const inset = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.085, 24), mat(THREE, css("--line-strong")));
    inset.position.set(x, 0.045, z); S.scene.add(inset);
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.2, 1, 12), mat(THREE, css("--line-strong")));
    col.position.set(x, 0.08, z); col.scale.y = 0.001; col.castShadow = true; col.userData.id = v.id; withEdges(THREE, col, ink, edgeOp); S.scene.add(col);
    const gmat = new THREE.MeshBasicMaterial({ color: new THREE.Color(css("--request")), transparent: true, opacity: 0.1, depthWrite: false });
    const ghost = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 1, 16), gmat);
    ghost.position.set(x, 0.08, z); ghost.visible = false; withEdges(THREE, ghost, css("--request"), 0.7); S.scene.add(ghost);
    marks.set(v.id, { puck, inset, col, ghost, x, z, lon: v.lon });
  }
  const sel = new THREE.Mesh(new THREE.RingGeometry(0.34, 0.4, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(ink), side: THREE.DoubleSide }));
  sel.rotation.x = -Math.PI / 2; sel.position.y = 0.003; sel.visible = false; S.scene.add(sel);
  const lons = vm.schools.map((v) => v.lon).sort((a, b) => a - b);
  let last = null;
  function update(vm2, { selected } = {}) {
    const wave = last && last !== vm2.hi;
    for (const v of vm2.schools) {
      const m = marks.get(v.id); if (!m) continue;
      const color = new THREE.Color(vm2.waiting ? css("--line-strong") : css(`--${v.planType}`));
      m.puck.material.color = color; m.col.material.color = color;
      m.inset.material.color = color.clone().multiplyScalar(0.6);
      const h = vm2.waiting ? 0.001 : (3 * (v.f2fSections || 0)) / maxF2F;
      const delay = wave ? Math.min(600, lons.indexOf(m.lon) * 12) : 0;
      S.tween(m.col.scale, "y", Math.max(0.001, h), 400, delay); S.tween(m.col.position, "y", 0.08 + h / 2, 400, delay);
      const gh = vm2.waiting ? 0 : (3 * (v.requestSections || 0)) / maxF2F;
      m.ghost.visible = gh > 0; m.ghost.scale.y = Math.max(0.01, gh); m.ghost.position.y = 0.08 + gh / 2;
      const dim = selected && selected !== v.id ? 0.6 : 1;
      for (const o of [m.puck, m.col]) { o.material.transparent = dim < 1; o.material.opacity = dim; }
    }
    const s = selected && marks.get(selected);
    sel.visible = !!s; if (s) sel.position.set(s.x, 0.003, s.z);
    last = vm2.hi;
  }
  update(vm);
  const pickables = [...marks.values()].flatMap((m) => [m.puck, m.col]);
  S.canvas.addEventListener("pointerup", (e) => { if (!S.dragged) { const o = S.pick(e, pickables); if (o) onSelect?.(o.userData.id); } S.endDrag(); });
  S.canvas.addEventListener("pointermove", (e) => {
    const o = S.pick(e, pickables);
    if (!o) return onHover?.(null);
    const m = marks.get(o.userData.id);
    const top = new THREE.Vector3(m.x, Math.max(0.2, m.col.scale.y + 0.2), m.z);
    onHover?.(o.userData.id, S.toScreen(top));
  });
  return {
    update, firstFrame: () => S.firstFrame, dispose: S.dispose,
    screenOf(id) { const m = marks.get(id); return m ? S.toScreen(new THREE.Vector3(m.x, Math.max(0.2, m.col.scale.y + 0.2), m.z)) : null; },
    preset(name) { const p = PRESETS[name] || PRESETS.overview; S.tween(S.view, "theta", p.theta, 600); S.tween(S.view, "phi", p.phi, 600); S.tween(S.view, "r", S.baseR, 600); if (reduced()) S.place(); },
  };
}

/** School: buildings as boxes by storey, rooms tinted by flag, roof by type, emptied buildings faded; sun arc with lit slots. */
export function school3D(THREE, el, v) {
  const S = shell(THREE, el, { fitRadius: 4.6 });
  S.scene.add(slab(THREE, 11, 5));
  const group = new THREE.Group(); S.scene.add(group);
  const light = isLight(), ink = css("--ink");
  function build(v2) {
    while (group.children.length) group.remove(group.children[0]);
    const cell = 0.7, gap = 0.08, story = 0.75;
    const widths = v2.buildings.map((b) => Math.ceil(b.rooms / b.storeys) * (cell + gap));
    const total = widths.reduce((a, w) => a + w + 0.8, -0.8);
    let x = -total / 2;
    v2.buildings.forEach((b, i) => {
      const perFloor = Math.ceil(b.rooms / b.storeys);
      const color = b.emptied ? css("--line-strong") : css(`--${b.flag === "green" ? "full" : b.flag === "amber" ? "split" : "home"}`);
      let k = 0;
      for (let f = 0; f < b.storeys; f++) for (let c = 0; c < perFloor && k < b.rooms; c++, k++) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(cell, story * 0.9, cell * 1.4), mat(THREE, color, { transparent: b.emptied, opacity: b.emptied ? 0.35 : 1 }));
        m.position.set(x + c * (cell + gap) + cell / 2, f * story + story * 0.45, 0); m.castShadow = !b.emptied;
        withEdges(THREE, m, ink, light ? 0.22 : 0.5); group.add(m);
      }
      const roofH = b.roofType === "slab" ? 0.18 : 0.05;
      const roofMat = b.roofType === "bare" ? new THREE.MeshStandardMaterial({ color: 0xcdd2d5, metalness: 0.4, roughness: 0.5, flatShading: true })
        : mat(THREE, b.roofType === "slab" ? css("--ink-2") : css("--line-strong"));
      const roof = new THREE.Mesh(new THREE.BoxGeometry(widths[i] + 0.15, roofH, cell * 1.6), roofMat);
      roof.position.set(x + widths[i] / 2 - gap / 2, b.storeys * story + roofH / 2, 0); roof.castShadow = true; group.add(roof);
      x += widths[i] + 0.8;
    });
    const arcR = Math.max(4, total / 2 + 1.2);
    const base = new THREE.Mesh(new THREE.TorusGeometry(arcR, 0.015, 6, 64, Math.PI), new THREE.MeshBasicMaterial({ color: new THREE.Color(css("--line-strong")) }));
    base.position.set(0, 0.05, -1.8); group.add(base);
    for (const s of v2.litSlots) {
      const a0 = ((Math.max(6, s.start) - 6) / 12) * Math.PI, a1 = ((Math.min(18, s.end) - 6) / 12) * Math.PI;
      const seg = new THREE.Mesh(new THREE.TorusGeometry(arcR, 0.06, 6, 32, a1 - a0), new THREE.MeshBasicMaterial({ color: new THREE.Color(light ? css("--ink") : "#FFFFFF") }));
      seg.rotation.z = Math.PI - a1; seg.position.set(0, 0.05, -1.8); group.add(seg);
    }
  }
  build(v);
  return { update: build, firstFrame: () => S.firstFrame, dispose: S.dispose };
}

/**
 * Heat replay: one column per school on the city plate; height and colour follow the heat index.
 * places = [{ id, name, lat, lon }], labels = [{ name, lat, lon }] (districts, drawn as HTML over the canvas).
 * update(values, labelValues, colorOf, selected) re-tints and re-heights; returns nothing.
 */
export function heat3D(THREE, el, places, labels, { onSelect, onHover } = {}) {
  const P = projection([...places, ...labels], 12);
  const S = shell(THREE, el, { fitRadius: Math.hypot(P.W + 1.5, P.H + 1.5) / 2 });
  S.scene.add(slab(THREE, P.W + 1.5, P.H + 1.5));
  const divisions = Math.max(2, Math.round((P.W + 1.5) / P.kmPx));
  const grid = new THREE.GridHelper(divisions * P.kmPx, divisions, new THREE.Color(css("--line")), new THREE.Color(css("--line")));
  grid.material.transparent = true; grid.material.opacity = 0.5; grid.position.y = 0.002; S.scene.add(grid);
  const ink = css("--ink"), edgeOp = isLight() ? 0.25 : 0.5, cx = P.W / 2, cz = P.H / 2;
  const marks = new Map();
  for (const p of places) {
    const x = P.x(p.lon) - cx, z = P.y(p.lat) - cz;
    const col = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 1, 14), mat(THREE, css("--line-strong")));
    col.position.set(x, 0.5, z); col.castShadow = true; col.userData.id = p.id; withEdges(THREE, col, ink, edgeOp); S.scene.add(col);
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.75, 28), new THREE.MeshBasicMaterial({ color: 0x888888, transparent: true, opacity: 0.28, depthWrite: false }));
    glow.rotation.x = -Math.PI / 2; glow.position.set(x, 0.004, z); S.scene.add(glow);
    marks.set(String(p.id), { col, glow, x, z });
  }
  const sel = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.38, 32), new THREE.MeshBasicMaterial({ color: new THREE.Color(ink), side: THREE.DoubleSide }));
  sel.rotation.x = -Math.PI / 2; sel.position.y = 0.006; sel.visible = false; S.scene.add(sel);
  // District labels as HTML, re-projected every frame so they follow the camera.
  const layer = document.createElement("div"); layer.className = "h3d-labels"; el.append(layer);
  const tags = labels.map((l) => { const d = document.createElement("div"); d.className = "h3d-tag"; d.innerHTML = `<b></b><span class="mono"></span>`; d.firstChild.textContent = l.name; layer.append(d); return { d, v: new THREE.Vector3(P.x(l.lon) - cx, 0.3, P.y(l.lat) - cz) }; });
  let alive = true;
  const follow = () => { if (!alive) return; for (const t of tags) { const s = S.toScreen(t.v); t.d.style.transform = `translate(${s.x}px, ${s.y}px) translate(-50%, -100%)`; } requestAnimationFrame(follow); };
  requestAnimationFrame(follow);
  const H = (hi) => (hi == null ? 0.02 : Math.max(0.05, (hi - 22) * 0.16)); // 22 °C → flat, 46 °C → about 3.8 units
  function update(values, labelValues, colorOf, selected) {
    places.forEach((p, k) => {
      const m = marks.get(String(p.id)), hi = values[k], c = new THREE.Color(colorOf(hi));
      m.col.material.color = c; m.glow.material.color = c;
      const h = H(hi);
      S.tween(m.col.scale, "y", h, 180); S.tween(m.col.position, "y", h / 2, 180);
    });
    tags.forEach((t, k) => { const v = labelValues[k]; t.d.lastChild.textContent = v == null ? "" : `${v.toFixed(1)}°`; t.d.style.setProperty("--c", colorOf(v)); });
    const s = selected != null && marks.get(String(selected));
    sel.visible = !!s; if (s) sel.position.set(s.x, 0.006, s.z);
  }
  const pickables = [...marks.values()].map((m) => m.col);
  S.canvas.addEventListener("pointerup", (e) => { if (!S.dragged) { const o = S.pick(e, pickables); if (o) onSelect?.(o.userData.id); } S.endDrag(); });
  S.canvas.addEventListener("pointermove", (e) => {
    const o = S.pick(e, pickables);
    if (!o) return onHover?.(null);
    const m = marks.get(String(o.userData.id));
    onHover?.(o.userData.id, S.toScreen(new THREE.Vector3(m.x, m.col.scale.y + 0.2, m.z)));
  });
  return {
    update, firstFrame: () => S.firstFrame,
    dispose() { alive = false; S.dispose(); },
    preset(name) { const p = PRESETS[name] || PRESETS.overview; S.tween(S.view, "theta", p.theta, 600); S.tween(S.view, "phi", p.phi, 600); S.tween(S.view, "r", S.baseR, 600); if (reduced()) S.place(); },
  };
}
