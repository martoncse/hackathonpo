// Buyer-side check of a Shipment Evidence Passport. Runs the same shared code that signed it.
import { verifyPassport, PASSPORT_FORMAT } from "/shared/passport.js";

const $ = (id) => document.getElementById(id);
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const tick = (ok, na) => (na ? '<span class="t na">–</span>' : ok ? '<span class="t ok">✓</span>' : '<span class="t bad">✗</span>');

let passport = null;
let extraFiles = [];
let published = null; // { key_fingerprint, cooperative } served by this EUDR-Snap instance
let registry = null; // { sequence, latest_sequence } when the passport was fetched by id
let original = null; // the untouched passport, while a tamper test is shown

async function readFiles(list) {
  const read = await Promise.all([...list].map(async (f) => ({ name: f.name, bytes: new Uint8Array(await f.arrayBuffer()) })));
  for (const f of read) {
    let parsed = null;
    try {
      parsed = JSON.parse(new TextDecoder().decode(f.bytes));
    } catch {}
    if (parsed?.payload?.format === PASSPORT_FORMAT) {
      passport = parsed;
      original = null;
      registry = null;
    } else extraFiles = [...extraFiles.filter((x) => x.name !== f.name), f];
  }
  render();
}

async function render() {
  if (!passport) {
    $("out").innerHTML = "";
    $("status").textContent = extraFiles.length ? `${extraFiles.length} file(s) loaded. Now drop the passport file.` : "";
    return;
  }
  const v = await verifyPassport(passport, extraFiles);
  const p = passport.payload;
  const supplied = v.files.filter((f) => f.status !== "not supplied").length;
  const keyKnown = published?.key_fingerprint ? published.key_fingerprint === v.fingerprint : null;
  const verdict = !v.valid
    ? ["bad", "✗ Do not rely on this passport: a check failed (see below)."]
    : supplied < v.files.length || keyKnown === false
      ? ["part", `✓ Signature valid. ${supplied}/${v.files.length} pack files checked${keyKnown === false ? "; signing key is not the one this cooperative publishes here" : ""}.`]
      : ["ok", `✓ Authentic and complete: signed by ${esc(p.issuer.cooperative)}, all ${v.files.length} files unchanged.`];

  const g = p.shipment;
  const plots = p.checks.plots;
  $("status").textContent = "";
  $("out").innerHTML = `
    <div class="verdict ${verdict[0]}">${verdict[1]}</div>
    <div class="row">${original ? '<button id="restore" class="secondary">Restore the original</button><span class="hint">Showing a copy with 6,000 kg added to the goods, as if someone inflated the shipment after signing.</span>' : '<button id="tamper" class="secondary">Try to tamper: add 6,000 kg</button><span class="hint">Changes one number in a copy and re-checks it. Nothing is saved.</span>'}</div>
    <div class="card">
      <b>Checks</b>
      <ul class="checks">
        <li>${tick(v.signature)} Signature (ECDSA P-256) over the whole passport</li>
        <li>${tick(v.fingerprintMatches)} Signing key fingerprint <span class="fp">${esc(v.fingerprint)}</span>: compare it with the one the cooperative gave you</li>
        <li>${tick(keyKnown, keyKnown === null)} ${keyKnown === null ? "Not compared with a published key (no EUDR-Snap server reachable)" : keyKnown ? `Same key ${esc(published.cooperative || "the cooperative")} publishes on this server` : `Different from the key published on this server (${esc(published.key_fingerprint)})`}</li>
        <li>${tick(v.decisionChain?.ok)} Reviewer decisions: ${p.decisions.entries.length} entries, hash chain intact${v.decisionChain?.ok ? "" : ` (broken at entry ${v.decisionChain?.brokenAt + 1})`}</li>
        <li>${tick(supplied === v.files.length && !v.files.some((f) => f.status === "altered"), !supplied)} Pack files: ${supplied}/${v.files.length} supplied and checked</li>
        <li>${tick(true, !registry)} ${registry ? `Passport #${registry.sequence} in this cooperative's history${registry.latest_sequence > registry.sequence ? ` (latest is #${registry.latest_sequence})` : " (latest)"}` : `Passport #${p.history.sequence} in the cooperative's chain${p.history.previous_passport_id ? `, follows ${esc(p.history.previous_passport_id)}` : " (first)"}`}</li>
      </ul>
      ${v.errors.length ? `<p class="msg err">${v.errors.map(esc).join(" · ")}</p>` : ""}
    </div>
    <div class="card grid">
      <div><small>Passport</small><b>${esc(p.passport_id)}</b></div>
      <div><small>Issued</small>${esc(p.issued_at.replace("T", " ").slice(0, 16))} UTC</div>
      <div><small>Supplier</small>${esc(p.issuer.cooperative)}${p.issuer.registration ? `<br><small>${esc(p.issuer.registration)}</small>` : ""}</div>
      <div><small>Lot</small>${esc(g.lot_id)} · ${esc(g.market)}${g.buyer ? `<br><small>buyer ${esc(g.buyer.name)}</small>` : ""}</div>
      <div><small>Goods</small>${g.goods.map((x) => `HS ${esc(x.hs)} · ${esc(Number(x.estimated_kg_from_receipts).toLocaleString("en"))} ${esc(x.unit || "kg")} from receipts`).join("<br>")}</div>
      <div><small>Coverage</small>${g.plots} plot(s)${g.producer_cards ? ` · ${g.producer_cards} producer card(s)` : ""} · ${g.receipts.length} receipt(s)</div>
      <div><small>Deforestation check</small>${esc(p.checks.deforestation.source)} ${esc(p.checks.deforestation.version || "")}<br><small>${esc(p.checks.deforestation.checked_at || "date not recorded")}</small></div>
    </div>
    <div class="card"><b>Plots</b>
      <table><thead><tr><th>Plot</th><th>Card</th><th>ha</th><th>Whisp</th><th>Volume check</th><th>Decision</th></tr></thead><tbody>
      ${plots.map((x) => `<tr><td>${esc(x.id)}</td><td>${esc(x.producer_card || "–")}</td><td>${esc(x.hectares)}</td><td>${esc(x.whisp_risk || "not checked")}</td><td>${x.volume.kg_per_ha == null ? "–" : `${esc(x.volume.kg_per_ha.toLocaleString("en"))} ${esc(x.volume.unit)} vs ${esc(x.volume.threshold?.toLocaleString("en"))}${x.volume.flagged ? " ⚑" : ""}`}</td><td>${x.decision ? `${esc(x.decision.decision)} by ${esc(x.decision.reviewer || "?")}<br><small>${esc(x.decision.at)}</small>` : esc(x.status)}</td></tr>`).join("")}
      </tbody></table>
      ${p.decisions.entries.length ? `<p class="hint">Reasons: ${p.decisions.entries.map((e) => `<b>${esc(e.plot)}</b> ${esc(e.reason)}`).join(" · ")}</p>` : ""}
    </div>
    <div class="card"><b>Files pinned by this passport</b>
      <table><thead><tr><th></th><th>File</th><th>SHA-256</th></tr></thead><tbody>
      ${v.files.map((f) => `<tr><td>${f.status === "match" ? tick(true) : f.status === "altered" ? tick(false) : tick(false, true)}</td><td>${esc(f.filename)}<br><small>${esc(f.status === "altered" ? "CHANGED since signing" : f.status === "match" ? (f.suppliedAs !== f.filename ? `matches ${f.suppliedAs}` : "unchanged") : "not supplied")}</small></td><td><code>${esc(f.sha256)}</code></td></tr>`).join("")}
      </tbody></table>
      ${v.extraFiles?.length ? `<p class="hint">Not part of this passport: ${v.extraFiles.map(esc).join(", ")}</p>` : ""}
    </div>
    <p class="hint">${esc(p.notice)}</p>`;
  if ($("tamper")) $("tamper").onclick = () => {
    original = passport;
    passport = structuredClone(passport);
    for (const g of passport.payload.shipment.goods) g.estimated_kg_from_receipts = Number(g.estimated_kg_from_receipts || 0) + 6000;
    render();
  };
  if ($("restore")) $("restore").onclick = () => {
    passport = original;
    original = null;
    render();
  };
}

const drop = $("drop");
drop.onclick = () => $("files").click();
drop.onkeydown = (e) => (e.key === "Enter" || e.key === " ") && $("files").click();
$("files").onchange = (e) => readFiles(e.target.files);
drop.ondragover = (e) => (e.preventDefault(), drop.classList.add("over"));
drop.ondragleave = () => drop.classList.remove("over");
drop.ondrop = (e) => (e.preventDefault(), drop.classList.remove("over"), readFiles(e.dataTransfer.files));

(async () => {
  try {
    published = await (await fetch("/api/passport/key")).json();
  } catch {}
  const id = new URLSearchParams(location.search).get("id");
  if (!id) return;
  $("status").textContent = `Fetching ${id}…`;
  try {
    const r = await fetch(`/api/passports/${encodeURIComponent(id)}`);
    const body = await r.json();
    if (!r.ok) return ($("status").textContent = body.error);
    passport = body.passport;
    registry = { sequence: body.sequence, latest_sequence: body.latest_sequence };
    // Opened from the buyer's private lot link: fetch the pack files the buyer received too.
    const lotToken = new URLSearchParams(location.hash.slice(1)).get("lot");
    if (lotToken) {
      const share = await (await fetch(`/api/share/${encodeURIComponent(lotToken)}`)).json().catch(() => ({}));
      extraFiles = (share.documents || []).filter((d) => d.id !== "passport").map((d) => ({ name: d.filename, bytes: new TextEncoder().encode(d.content) }));
    }
    render();
  } catch {
    $("status").textContent = "Could not reach this server. Drop the passport file instead.";
  }
})();
