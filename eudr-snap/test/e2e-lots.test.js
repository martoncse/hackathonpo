// The handoff the business model rests on: cooperative -> named EU importer -> filing -> downstream.
// Real server, temp data dir, recorded (mocked low-risk) Whisp result; no live calls.
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const servers = [];
after(() => servers.forEach((s) => s.kill()));

async function start() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "eudr-lots-"));
  const farms = JSON.parse(fs.readFileSync(path.join(root, "profiles/cocoa-ci/sample-farms.json"))).farms;
  const raw = { type: "FeatureCollection", features: farms.map((f) => ({ type: "Feature", properties: { external_id: f.id, risk_pcrop: "low" } })) };
  fs.writeFileSync(path.join(tmp, "cache.json"), JSON.stringify({ source: "cached", checked_at: "2026-11-21T10:00:00.000Z", raw }));
  const env = { ...process.env, PORT: String(5900 + Math.floor(Math.random() * 90)), EUDR_PROFILE: "cocoa-ci", EUDR_DATA_DIR: tmp, EUDR_WHISP_CACHE: path.join(tmp, "cache.json"), WHISP_API_KEY: "", ANTHROPIC_API_KEY: "" };
  const child = spawn(process.execPath, ["server.js"], { cwd: root, env });
  servers.push(child);
  await new Promise((ok, fail) => {
    const t = setTimeout(() => fail(new Error("server did not start")), 10000);
    child.stdout.on("data", (d) => String(d).includes("running at") && (clearTimeout(t), ok()));
  });
  return async (method, url, body) => {
    const res = await fetch(`http://localhost:${env.PORT}${url}`, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
    return { status: res.status, body: await res.json() };
  };
}

const sha = (t) => crypto.createHash("sha256").update(t).digest("hex");

test("a lot goes to a named buyer, each receipt only once, and the filing flows back", async () => {
  const api = await start();

  // No buyer named: refused.
  assert.equal((await api("POST", "/api/lots/create", { buyer: { name: "" } })).status, 400);
  // A plot that isn't cleared can't be put in an EU lot.
  assert.equal((await api("POST", "/api/lots/create", { buyer: { name: "Importer A" }, plot_ids: ["C3"] })).status, 422);

  // Lot 1 to Importer A: the cleared plots C1, C2 (C3/C4 need review, C5 is blocked).
  const one = await api("POST", "/api/lots/create", { buyer: { name: "Importer A", email: "dd@importer-a.example" } });
  assert.equal(one.status, 201);
  assert.deepEqual(one.body.lot.plot_ids, ["C1", "C2"]);
  assert.deepEqual(one.body.lot.receipts, ["BA-501", "BA-502", "BA-503", "BA-504", "BA-505", "BA-506"]);
  assert.equal(one.body.lot.kg, 1300 + 1080);
  const dds = JSON.parse(one.body.documents.find((d) => d.id === "dds").content);
  assert.match(dds.operator.name, /^Importer A \[named by the supplier/);
  assert.match(one.body.documents.find((d) => d.id === "report").content, /Importer A/);

  // The same purchases can't go to a second buyer.
  const again = await api("POST", "/api/lots/create", { buyer: { name: "Importer B" } });
  assert.equal(again.status, 409);

  // A new purchase can.
  await api("POST", "/api/deliveries", { plot_id: "C2", date: "2026-03-10", season: "2025-26", kg: 200, receipt: "BA-950" });
  const two = await api("POST", "/api/lots/create", { buyer: { name: "Importer B" } });
  assert.equal(two.status, 201);
  assert.deepEqual(two.body.lot.receipts, ["BA-950"]);
  assert.deepEqual(two.body.lot.plot_ids, ["C2"]);
  assert.equal(two.body.lot.kg, 200);

  // The buyer's private link: same frozen pack, fingerprints match.
  const token = one.body.lot.share_path.split("#")[1];
  assert.ok(token.length >= 20);
  const view = await api("GET", `/api/share/${token}`);
  assert.equal(view.status, 200);
  for (const d of view.body.documents) assert.equal(sha(d.content), d.sha256, d.id);
  assert.equal(view.body.handoff, null);
  assert.equal((await api("GET", "/api/share/not-a-real-token")).status, 404);

  // The importer's own decision: name and reason required, appended with a hash linked to the passport.
  assert.equal(view.body.profile.country_risk, "standard");
  assert.equal((await api("POST", `/api/share/${token}/decision`, { decision: "accept_evidence", name: "", reason: "x" })).status, 400);
  assert.equal((await api("POST", `/api/share/${token}/decision`, { decision: "certify", name: "M. Dupont", reason: "x" })).status, 400);
  await api("POST", `/api/share/${token}/decision`, { decision: "request_info", name: "M. Dupont", reason: "Legality questionnaire missing" });
  const dec = await api("POST", `/api/share/${token}/decision`, { decision: "accept_evidence", name: "M. Dupont", reason: "Questionnaire received <b>ok</b>" });
  assert.equal(dec.status, 200);
  const [d1, d2] = dec.body.lot.importer_decisions;
  assert.equal(d2.prev, d1.hash);
  assert.equal(d2.passport_sha256, view.body.documents.find((d) => d.id === "passport").sha256);
  assert.equal((await api("GET", `/api/share/${token}`)).body.lot.importer_decisions.length, 2);

  // The importer records its filing; the cooperative's register shows it.
  assert.equal((await api("POST", `/api/share/${token}/filing`, { reference: "x", verification: "y" })).status, 400);
  const filed = await api("POST", `/api/share/${token}/filing`, { reference: "26FRABC123456", verification: "VX12AB34" });
  assert.equal(filed.status, 200);
  assert.equal(filed.body.handoff.referenceNumber, "26FRABC123456");
  assert.match(filed.body.handoff.forDownstream, /2025\/2650/);
  const reg = await api("GET", "/api/lots/register");
  assert.deepEqual(reg.body.lots.map((l) => [l.buyer.name, l.status]), [["Importer A", "filed"], ["Importer B", "sent"]]);
  assert.ok(!JSON.stringify(reg.body).includes('"documents"'));

  // Demo reset clears the lots too.
  await api("DELETE", "/api/deliveries");
  assert.deepEqual((await api("GET", "/api/lots/register")).body.lots, []);
});
