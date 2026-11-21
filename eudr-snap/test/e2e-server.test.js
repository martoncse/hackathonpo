// End to end over HTTP: purchase in -> rules -> review -> legal pack out, for both profiles.
// Runs the real server in a temp data dir. Whisp is never called: the CI run uses a recorded
// (mocked, all low-risk) Whisp result; the Colombian run uses the repo's saved result read-only.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const servers = [];
after(() => servers.forEach((s) => s.kill()));

async function start(profile) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eudr-e2e-"));
  const env = { ...process.env, PORT: String(5400 + Math.floor(Math.random() * 500)), EUDR_DATA_DIR: tmp, WHISP_API_KEY: "", ANTHROPIC_API_KEY: "" };
  if (profile) {
    const farms = JSON.parse(fs.readFileSync(path.join(root, "profiles", profile, "sample-farms.json"))).farms;
    const raw = { type: "FeatureCollection", features: farms.map((f) => ({ type: "Feature", properties: { external_id: f.id, risk_pcrop: "low", Ind_04_disturbance_after_2020: "no" } })) };
    env.EUDR_PROFILE = profile;
    env.EUDR_WHISP_CACHE = path.join(tmp, "whisp-cache.json");
    fs.writeFileSync(env.EUDR_WHISP_CACHE, JSON.stringify({ source: "cached", checked_at: "2026-11-21T10:00:00.000Z", raw }));
  } else {
    delete env.EUDR_PROFILE;
  }
  const child = spawn(process.execPath, ["server.js"], { cwd: root, env });
  servers.push(child);
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("server did not start")), 10000);
    child.stdout.on("data", (d) => String(d).includes("running at") && (clearTimeout(t), ok()));
    child.on("exit", (code) => fail(new Error("server exited " + code)));
  });
  const base = `http://localhost:${env.PORT}`;
  return async (method, url, body) => {
    const res = await fetch(base + url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
}

test("Côte d'Ivoire: a recorded purchase flows into the rules, the review and the legal pack", async () => {
  const api = await start("cocoa-ci");
  assert.equal((await api("GET", "/api/farms")).body.profile.id, "cocoa-ci");

  // Bad input is refused.
  assert.equal((await api("POST", "/api/deliveries", { plot_id: "C1", date: "2026-03-02", season: "2025-26", kg: 100, receipt: "BA-501" })).status, 409);
  assert.equal((await api("POST", "/api/deliveries", { plot_id: "C1", date: "2026-03-02", season: "2025-26", kg: -5, receipt: "BA-900" })).status, 400);
  assert.equal((await api("POST", "/api/deliveries", { plot_id: "NOPE", date: "2026-03-02", season: "2025-26", kg: 5, receipt: "BA-900" })).status, 400);

  // Kouassi was clear (1,300 kg on 3.2 ha). A new 2,000 kg receipt makes it 3,300 kg = 1,031 kg/ha > 924.
  let status = Object.fromEntries((await api("GET", "/api/risk/saved")).body.results.map((r) => [r.id, r.status]));
  assert.deepEqual(status, { C1: "green", C2: "green", C3: "review", C4: "review", C5: "blocked" });
  const rec = await api("POST", "/api/deliveries", { plot_id: "C1", date: "2026-03-02", season: "2025-26", kg: 2000, receipt: "BA-900" });
  assert.equal(rec.status, 201);
  assert.equal(rec.body.result.status, "review");
  assert.match(rec.body.result.yield.flag, /CP-DEMO-0001/);

  // A tainted lot is refused (no mass balance).
  const refused = await api("POST", "/api/export", { lot: { id: "EU-CI-T", market: "EU", plot_ids: ["C1", "C2"] } });
  assert.equal(refused.status, 422);
  assert.match(refused.body.blocking.join(" "), /tainted/);

  // Review: accepting needs a reason; then accept C1 and C3, exclude C4.
  assert.equal((await api("POST", "/api/review", { plot_id: "C1", decision: "accept" })).status, 400);
  await api("POST", "/api/review", { plot_id: "C1", decision: "accept", reason: "Field visit: second plot found, mapping booked", reviewer: "A. Koné" });
  await api("POST", "/api/review", { plot_id: "C3", decision: "accept", reason: "Card holder's sons farm a third plot, mapping booked", reviewer: "A. Koné" });
  await api("POST", "/api/review", { plot_id: "C4", decision: "exclude", reason: "High-risk plot", reviewer: "A. Koné" });

  // C3 shares a card with excluded C4: the card's sales can't be split, so C3 can't ship either.
  const mixed = await api("POST", "/api/export", { lot: { id: "EU-CI-M", market: "EU", plot_ids: ["C1", "C2", "C3"] } });
  assert.equal(mixed.status, 422);
  const c3 = (await api("GET", "/api/risk/saved")).body.results.find((r) => r.id === "C3");
  assert.equal(c3.eligible, false);
  assert.deepEqual(c3.card_blocked_by, ["C4"]);

  // Accepting the whole card (both plots) clears it.
  await api("POST", "/api/review", { plot_id: "C4", decision: "accept", reason: "Card holder's sons farm a third plot, mapping booked", reviewer: "A. Koné" });
  const pack = await api("POST", "/api/export", { lot: { id: "EU-CI-1", market: "EU", plot_ids: ["C1", "C2", "C3", "C4"] } });
  assert.equal(pack.status, 200);
  const docs = Object.fromEntries(pack.body.documents.map((d) => [d.id, d]));
  assert.deepEqual(Object.keys(docs).sort(), ["art10", "art11", "art9", "dds", "geojson", "report", "retention"]);

  const geo = JSON.parse(docs.geojson.content);
  assert.equal(geo.features.length, 4);
  assert.ok(geo.features.every((f) => f.properties.ProducerCountry === "CI" && typeof f.properties.Area === "number"));
  const dds = JSON.parse(docs.dds.content);
  assert.equal(dds.commodities[0].hsHeading, "180100");
  assert.equal(dds.commodities[0].estimatedKgFromDeliveries, 3300 + 1080 + 3400);
  const art9 = JSON.parse(docs.art9.content);
  assert.ok(art9.plots.find((p) => p.id === "C1").deliveries.some((d) => d.receipt === "BA-900"));
  const art11 = JSON.parse(docs.art11.content).entries;
  assert.equal(art11.length, 3);
  const pp = art9.plots.find((p) => p.id === "C1").productionPeriod;
  assert.deepEqual([pp.from, pp.to], ["2025-10-14", "2026-03-02"]);
  assert.ok(art11.some((e) => e.reviewer === "A. Koné" && /Field visit/.test(e.reason)));

  const report = docs.report.content;
  assert.match(report, /Côte d&#39;Ivoire \(CI\)/);
  assert.match(report, /DRAFT prepared by EUDR-Snap/);
  assert.match(report, /BA-900/);
  assert.match(report, /typed in/);
  assert.match(report, /Field visit: second plot found/);
  assert.match(report, /CP-DEMO-0003/);
  assert.doesNotMatch(report, /Colombia|IDEAM/);
  for (const id of ["geojson", "dds", "art9", "art10", "art11"]) assert.ok(report.includes(docs[id].sha256), id);
  assert.ok(docs.retention.content.includes(docs.report.sha256));

  // A new receipt is new evidence: the earlier accept on that card reopens.
  const more = await api("POST", "/api/deliveries", { plot_id: "C3", date: "2026-03-05", season: "2025-26", kg: 500, receipt: "BA-902" });
  assert.deepEqual(more.body.reopened.sort(), ["C3", "C4"]);
  assert.equal(more.body.result.status, "review");

  // Demo reset removes recorded purchases AND decisions.
  await api("DELETE", "/api/deliveries");
  status = Object.fromEntries((await api("GET", "/api/risk/saved")).body.results.map((r) => [r.id, r.status]));
  assert.deepEqual(status, { C1: "green", C2: "green", C3: "review", C4: "review", C5: "blocked" });
});

test("Côte d'Ivoire: a flagged producer can't be cleared with a tiny, mislabelled or future receipt", async () => {
  const api = await start("cocoa-ci");
  // Future date, and a season that doesn't contain the date, are refused.
  assert.equal((await api("POST", "/api/deliveries", { plot_id: "C3", date: "2031-01-01", season: "2030-31", kg: 1, receipt: "X-1" })).status, 400);
  const wrong = await api("POST", "/api/deliveries", { plot_id: "C3", date: "2026-03-02", season: "2099", kg: 1, receipt: "X-2" });
  assert.equal(wrong.status, 400);
  assert.match(wrong.body.error, /belongs to season 2025-26/);
  // A real but tiny receipt in a newer campaign doesn't hide the flagged 2025-26 campaign.
  const tiny = await api("POST", "/api/deliveries", { plot_id: "C3", date: "2026-10-05", season: "2026-27", kg: 1, receipt: "X-3" });
  assert.equal(tiny.status, 201);
  assert.equal(tiny.body.result.status, "review");
  assert.equal(tiny.body.result.yield.season, "2025-26");
});

test("Colombia (default profile): the same path still produces the pack and report", async () => {
  const api = await start(null);
  const farms = await api("GET", "/api/farms");
  assert.equal(farms.body.profile.id, "");
  const pack = await api("POST", "/api/export", { lot: { id: "EU-CO-1", market: "EU", plot_ids: ["F1"] } });
  assert.equal(pack.status, 200);
  const report = pack.body.documents.find((d) => d.id === "report").content;
  assert.match(report, /Colombia \(CO\)/);
  assert.match(report, /090111/);
  assert.equal((await api("POST", "/api/export", {})).status, 400);
});
