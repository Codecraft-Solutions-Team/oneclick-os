// OneClick website back end. Lives in the Codecraft Firebase project as its own codebase
// ("oneclick"), so deploying it never touches the Codecraft site's functions.
//
// oneclickReport: takes a problem report from oneclickos.org/report and sends it to two places:
//   1. a PUBLIC issue in Codecraft-Solutions-Team/oneclick-os, with the email and anything that
//      looks private (emails, phone numbers, IP addresses, long keys or tokens) removed;
//   2. a PRIVATE issue in Codecraft-Solutions-Team/codecraft-workspace with the full original
//      report and the reporter's email, so Codecraft can reply. It links to the public issue.
// Every report is also saved to Firestore first, so a report is never lost if GitHub is unreachable.
const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();
const GITHUB_TOKEN = defineSecret("ONECLICK_GITHUB_TOKEN");
const PUBLIC_REPO = "Codecraft-Solutions-Team/oneclick-os";
const PRIVATE_REPO = "Codecraft-Solutions-Team/codecraft-workspace";
const KINDS = {
  "Something doesn't work": "bug",
  "It won't install or start": "install",
  "A game or app won't run": "compatibility",
  "It looks wrong": "design",
  "An idea or request": "idea",
  "A problem with this website": "website",
};
// Removes things people sometimes paste by accident. Returns the cleaned text and how many were removed.
function redact(text) {
  let n = 0;
  const out = String(text || "")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, () => (n++, "[email removed]"))
    .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, () => (n++, "[number removed]"))
    .replace(/\b(?:\d{1,3}\.){3}\d{1,3}\b/g, () => (n++, "[address removed]"))
    .replace(/\b(?:github_pat_|ghp_|sk-|AIza|xox[bap]-)[A-Za-z0-9_-]{10,}/g, () => (n++, "[key removed]"))
    .replace(/\b[A-Za-z0-9_-]{32,}\b/g, () => (n++, "[key removed]"))
    .replace(/(password|passwd|pwd|pin|passcode)\s*(is|=|:)\s*\S+/gi, (_, w) => (n++, w + " [removed]"));
  return { text: out, n };
}
const clip = (v, n) => String(v || "").replace(/\r/g, "").trim().slice(0, n);

// Simple per-address limit: at most 5 reports per 10 minutes.
const recent = new Map();
function tooMany(ip) {
  const now = Date.now(), list = (recent.get(ip) || []).filter(t => now - t < 600000);
  list.push(now); recent.set(ip, list);
  return list.length > 5;
}

exports.oneclickReport = onRequest(
  { secrets: [GITHUB_TOKEN], region: "us-central1", memory: "256MiB", maxInstances: 3 },
  async (req, res) => {
    if (req.method !== "POST") return res.status(405).json({ error: "Use POST" });
    const b = req.body || {};
    if (b.website) return res.json({ ok: true });                    // hidden field only bots fill in
    const ip = String(req.headers["x-forwarded-for"] || req.ip || "").split(",")[0].trim();
    if (tooMany(ip)) return res.status(429).json({ error: "Too many reports from here. Please try again in a few minutes." });

    const kind = KINDS[b.kind] ? b.kind : "Something doesn't work";
    const what = clip(b.what, 4000);
    if (what.length < 10) return res.status(400).json({ error: "Please describe what happened in a few words." });
    const expected = clip(b.expected, 2000), pc = clip(b.pc, 200), version = clip(b.version, 40), email = clip(b.email, 200);

    const gh = (repo, payload) => fetch(`https://api.github.com/repos/${repo}/issues`, {
      method: "POST",
      headers: { Authorization: `Bearer ${GITHUB_TOKEN.value()}`, Accept: "application/vnd.github+json", "User-Agent": "oneclick-report-form" },
      body: JSON.stringify(payload),
    });
    const lines = (o) => [
      `**Type:** ${kind}`, "", "**What happened**", o.what,
      o.expected && "\n**What they expected**\n" + o.expected,
      "", `**Computer:** ${o.pc || "not given"}`, `**OneClick version:** ${version || "not given"}`,
    ].filter(x => x !== false && x !== "");

    // 1. Save the full report privately first.
    const ref = await admin.firestore().collection("oneclick_reports").add({
      kind, what, expected, pc, version, email, created: admin.firestore.FieldValue.serverTimestamp(), issue: null, privateIssue: null,
    });

    // 2. Public copy, with anything private removed.
    const w = redact(what), e = redact(expected), c = redact(pc);
    const removed = w.n + e.n + c.n;
    let number = null, url = null;
    try {
      const r = await gh(PUBLIC_REPO, {
        title: `[${KINDS[kind]}] ${w.text.split("\n")[0].slice(0, 80)}`,
        body: [...lines({ what: w.text, expected: e.text, pc: c.text }), "", "_Sent from the report form on oneclickos.org. Private details are removed from public reports._"].join("\n"),
        labels: ["tester report", KINDS[kind]],
      });
      if (r.ok) { const d = await r.json(); number = d.number; url = d.html_url; await ref.update({ issue: number }); }
      else console.error("GitHub (public) said", r.status, await r.text());
    } catch (err) { console.error("GitHub (public) unreachable", err); }

    // 3. Private copy with the full original and the reply address.
    try {
      const r = await gh(PRIVATE_REPO, {
        title: `[OneClick ${KINDS[kind]}] ${what.split("\n")[0].slice(0, 80)}`,
        body: [...lines({ what, expected, pc }), `**Reply to:** ${email || "no email given"}`,
          number ? `**Public copy:** https://github.com/${PUBLIC_REPO}/issues/${number}` : "**Public copy:** not filed",
          removed ? `**Removed from the public copy:** ${removed} item(s)` : "", "", "_From the report form on oneclickos.org._"].filter(x => x !== "").join("\n"),
        labels: ["oneclick", KINDS[kind]],
      });
      if (r.ok) { const d = await r.json(); await ref.update({ privateIssue: d.number }); }
      else console.error("GitHub (private) said", r.status, await r.text());
    } catch (err) { console.error("GitHub (private) unreachable", err); }

    res.json({ ok: true, reference: ref.id.slice(0, 8).toUpperCase(), number, url });
  }
);
