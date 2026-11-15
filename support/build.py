#!/usr/bin/env python3
"""Builds the OneClick OS support centre (support.oneclickos.org).

Articles live in content/<category>/<slug>.md:

    title: Install apps from the App Store
    summary: One line shown in lists and search.
    order: 10            (optional, smaller comes first)
    ---
    Body in a small Markdown subset: ## and ### headings, paragraphs,
    - lists, 1. steps, > Note: callouts, **bold**, `code`, [links](url),
    ```code blocks```.

Output goes to public/. Run: python3 support/build.py
"""
import html, json, re, shutil
from pathlib import Path

ROOT = Path(__file__).parent
CONTENT, STATIC, OUT = ROOT / "content", ROOT / "static", ROOT / "public"

CATEGORIES = [
    ("getting-started", "Getting started", "Try it, install it, and finish setup."),
    ("desktop", "Using the desktop", "Start menu, taskbar, windows, files and the Mac look."),
    ("apps", "Apps", "Installing apps, Office, Windows programs and cloud drives."),
    ("gaming", "Gaming", "Steam, controllers, cloud gaming and what will not run."),
    ("settings", "Settings and hardware", "Wi-Fi, displays, sound, printers, accounts and privacy."),
    ("updates", "Updates and safety", "How updates work, undoing one, and keeping files safe."),
    ("windows", "Coming from Windows", "Where your Windows habits and files fit in."),
    ("troubleshooting", "Fixing problems", "When something does not start, crashes or looks wrong."),
]
CAT = {k: (n, d) for k, n, d in CATEGORIES}
VER = "?v=3"

ICON = {
 "getting-started": '<path d="M5 12h14M13 6l6 6-6 6"/>',
 "desktop": '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="M8 21h8M12 17v4"/>',
 "apps": '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
 "gaming": '<path d="M7 9h10a4 4 0 0 1 4 4v1a3 3 0 0 1-5.4 1.8L14.5 14h-5l-1.1 1.8A3 3 0 0 1 3 14v-1a4 4 0 0 1 4-4z"/><path d="M8 11v3M6.5 12.5h3"/>',
 "settings": '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1"/>',
 "updates": '<path d="M20 12a8 8 0 1 1-2.3-5.7M20 4v5h-5"/>',
 "windows": '<path d="M4 5.5 11 4.5v7H4zM13 4.2 20 3v8.5h-7zM4 12.5h7v7l-7-1zM13 12.5h7V21l-7-1.2z"/>',
 "troubleshooting": '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
}

def svg(paths, cls="ic"):
    return f'<svg class="{cls}" viewBox="0 0 24 24" aria-hidden="true">{paths}</svg>'

SEARCH = svg('<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>')

def inline(t):
    t = html.escape(t, quote=False)
    t = re.sub(r"`([^`]+)`", r"<code>\1</code>", t)
    t = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", t)
    def link(m):
        url = m.group(2)
        if url.startswith("/") and not url.startswith("//"):
            pass
        ext = ' rel="noopener"' if url.startswith("http") else ""
        return f'<a href="{html.escape(url)}"{ext}>{m.group(1)}</a>'
    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", link, t)

def slugify(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")

def render(md):
    out, toc, lines, i = [], [], md.splitlines(), 0
    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1; continue
        if ln.startswith("```"):
            buf = []; i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i]); i += 1
            out.append("<pre><code>" + html.escape("\n".join(buf)) + "</code></pre>"); i += 1; continue
        m = re.match(r"(#{2,3}) (.+)", ln)
        if m:
            lvl, txt = len(m.group(1)), m.group(2)
            hid = slugify(txt)
            if lvl == 2: toc.append((hid, txt))
            out.append(f'<h{lvl} id="{hid}">{inline(txt)}</h{lvl}>'); i += 1; continue
        if ln.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i][1:].strip()); i += 1
            txt = " ".join(buf)
            kind = "warn" if re.match(r"(Warning|Important|Careful)\b", txt) else "note"
            out.append(f'<div class="callout {kind}">{inline(txt)}</div>'); continue
        if re.match(r"[-*] ", ln) or re.match(r"\d+\. ", ln):
            ordered = bool(re.match(r"\d+\. ", ln)); tag = "ol" if ordered else "ul"
            pat = r"\d+\. " if ordered else r"[-*] "
            items = []
            while i < len(lines) and (re.match(pat, lines[i]) or (lines[i].startswith("   ") and items)):
                if re.match(pat, lines[i]):
                    items.append(re.sub(pat, "", lines[i], count=1).strip())
                else:
                    items[-1] += " " + lines[i].strip()
                i += 1
            cls = ' class="steps"' if ordered else ""
            out.append(f"<{tag}{cls}>" + "".join(f"<li>{inline(x)}</li>" for x in items) + f"</{tag}>"); continue
        buf = []
        while i < len(lines) and lines[i].strip() and not re.match(r"(#{2,3} |>|[-*] |\d+\. |```)", lines[i]):
            buf.append(lines[i].strip()); i += 1
        out.append("<p>" + inline(" ".join(buf)) + "</p>")
    return "\n".join(out), toc

def parse(path):
    raw = path.read_text(encoding="utf-8")
    head, _, body = raw.partition("\n---\n")
    meta = {}
    for ln in head.splitlines():
        if ":" in ln:
            k, v = ln.split(":", 1); meta[k.strip()] = v.strip()
    return meta, body

HEAD = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 240 240'%3E%3Cpath d='M74 66 A76 76 0 1 0 166 66' fill='none' stroke='%232dd4bf' stroke-width='26' stroke-linecap='round'/%3E%3Ccircle cx='120' cy='52' r='17' fill='%23fff'/%3E%3C/svg%3E">
<link rel="stylesheet" href="/static/support.css{ver}">
<script>try{{var t=localStorage.getItem('oneclick-theme');if(t)document.documentElement.dataset.theme=t}}catch(e){{}}</script>
</head>
<body>
<div class="devbar">OneClick OS is an early test version. Some things here describe features still being finished. <a href="https://oneclickos.org/test-version">Read the test notice</a></div>
<header class="top"><div class="wrap">
  <a href="/" class="brand"><img data-wordmark src="/static/wordmark-dark.svg" alt="OneClick OS"><span>Support</span></a>
  <form class="hsearch" action="/search" role="search"><input name="q" type="search" placeholder="Search help" aria-label="Search help"></form>
  <nav><a href="https://oneclickos.org">Main site</a><a href="https://oneclickos.org/report">Report a problem</a></nav>
  <button id="theme" aria-label="Switch between light and dark"><svg viewBox="0 0 24 24"><path d="M20 14.5A8 8 0 0 1 9.5 4 8 8 0 1 0 20 14.5z"/></svg></button>
</div></header>
<main class="wrap">
"""
FOOT = """</main>
<footer><div class="wrap"><span>OneClick OS support, by Codecraft Solutions Studio</span><span><a href="https://oneclickos.org/privacy">Privacy</a><a href="https://oneclickos.org/terms">Terms</a><a href="https://oneclickos.org/report">Report a problem</a></span></div></footer>
<script src="/static/support.js{ver}"></script>
</body>
</html>
"""

def page(title, desc, body):
    return HEAD.format(title=html.escape(title), desc=html.escape(desc), ver=VER) + body + FOOT.format(ver=VER)

def main():
    if OUT.exists(): shutil.rmtree(OUT)
    shutil.copytree(STATIC, OUT / "static")
    arts = {k: [] for k in CAT}
    for f in sorted(CONTENT.glob("*/*.md")):
        cat = f.parent.name
        if cat not in CAT: raise SystemExit(f"unknown category {cat} ({f})")
        meta, body = parse(f)
        for need in ("title", "summary"):
            if need not in meta: raise SystemExit(f"{f}: missing {need}")
        arts[cat].append({**meta, "slug": f.stem, "cat": cat, "body": body, "order": int(meta.get("order", 50))})
    for k in arts: arts[k].sort(key=lambda a: (a["order"], a["title"]))
    allarts = [a for k, _, _ in CATEGORIES for a in arts[k]]
    byslug = {a["slug"]: a for a in allarts}
    if len(byslug) != len(allarts): raise SystemExit("two articles share a file name")

    index = []
    for a in allarts:
        body_html, toc = render(a["body"])
        # check internal links
        for href in re.findall(r'href="(/[^"#]*)', body_html):
            p = href.strip("/").split("/")
            if href == "/" or href.startswith("/static") or href.startswith("/search"): continue
            if len(p) == 1 and p[0] in CAT: continue
            if len(p) == 2 and p[0] in CAT and p[1] in byslug and byslug[p[1]]["cat"] == p[0]: continue
            raise SystemExit(f"{a['cat']}/{a['slug']}: broken link {href}")
        cname = CAT[a["cat"]][0]
        sib = arts[a["cat"]]
        side = "".join(f'<a href="/{a["cat"]}/{s["slug"]}"{" class=on" if s is a else ""}>{html.escape(s["title"])}</a>' for s in sib)
        toc_html = ("<nav class='toc'><b>On this page</b>" + "".join(f'<a href="#{h}">{html.escape(t)}</a>' for h, t in toc) + "</nav>") if len(toc) > 1 else ""
        pos = sib.index(a)
        nxt = f'<a class="next" href="/{a["cat"]}/{sib[pos+1]["slug"]}"><small>Next</small>{html.escape(sib[pos+1]["title"])}</a>' if pos + 1 < len(sib) else ""
        body = f"""<div class="crumbs"><a href="/">Support</a><span>/</span><a href="/{a['cat']}">{cname}</a></div>
<div class="art">
<aside class="side"><b>{cname}</b>{side}</aside>
<article><h1>{inline(a['title'])}</h1><p class="lead">{inline(a['summary'])}</p>{toc_html}
{body_html}
<div class="helpful"><span>Still stuck?</span><a href="https://oneclickos.org/report">Report a problem</a><a href="/search">Search all help</a></div>
{nxt}</article>
</div>
"""
        d = OUT / a["cat"] / a["slug"]
        d.mkdir(parents=True, exist_ok=True)
        (d / "index.html").write_text(page(f"{a['title']} | OneClick OS Support", a["summary"], body))
        text = re.sub(r"<[^>]+>", " ", body_html)
        index.append(dict(t=a["title"], s=a["summary"], c=cname, u=f"/{a['cat']}/{a['slug']}", x=html.unescape(re.sub(r"\s+", " ", text))[:3000]))

    for k, name, desc in CATEGORIES:
        items = "".join(f'<a class="row" href="/{k}/{a["slug"]}"><b>{html.escape(a["title"])}</b><span>{html.escape(a["summary"])}</span></a>' for a in arts[k])
        body = f'<div class="crumbs"><a href="/">Support</a></div><div class="cathead">{svg(ICON[k],"ic big")}<div><h1>{name}</h1><p class="lead">{desc}</p></div></div><div class="list">{items}</div>'
        (OUT / k).mkdir(parents=True, exist_ok=True)
        (OUT / k / "index.html").write_text(page(f"{name} | OneClick OS Support", desc, body))

    cards = "".join(f'<a class="card" href="/{k}">{svg(ICON[k])}<b>{n}</b><span>{d}</span><em>{len(arts[k])} articles</em></a>' for k, n, d in CATEGORIES)
    popular = [byslug[s] for s in ("try-it-first", "install-on-a-pc", "dual-boot-with-windows", "install-apps", "how-updates-work", "undo-an-update", "windows-programs", "which-games-work") if s in byslug]
    pop = "".join(f'<a href="/{a["cat"]}/{a["slug"]}">{html.escape(a["title"])}</a>' for a in popular)
    body = f"""<section class="hero"><h1>How can we help?</h1><p>Plain answers for everything in OneClick OS, written for people coming from Windows.</p>
<form action="/search" role="search" class="bigsearch">{SEARCH}<input name="q" type="search" placeholder="Try &quot;printer&quot;, &quot;Steam&quot; or &quot;undo update&quot;" aria-label="Search help" autofocus></form>
{('<div class="popular"><b>Popular</b>' + pop + '</div>') if pop else ''}</section>
<section class="cards">{cards}</section>
<section class="contact"><div><h2>Did not find it?</h2><p>Tell us what went wrong. We read every report, and answer by email if you leave one.</p></div><a class="btn" href="https://oneclickos.org/report">Report a problem</a></section>
"""
    (OUT / "index.html").write_text(page("OneClick OS Support", "Help articles for OneClick OS.", body))
    (OUT / "search").mkdir(exist_ok=True)
    (OUT / "search" / "index.html").write_text(page("Search | OneClick OS Support", "Search OneClick OS help.",
        f'<div class="crumbs"><a href="/">Support</a></div><h1>Search help</h1><form action="/search" role="search" class="bigsearch">{SEARCH}<input id="q" name="q" type="search" placeholder="Search help" aria-label="Search help"></form><div id="results" class="list"></div>'))
    (OUT / "static" / "index.json").write_text(json.dumps(index, separators=(",", ":")))
    (OUT / "404.html").write_text(page("Not found | OneClick OS Support", "Page not found.",
        '<section class="hero"><h1>That page is not here</h1><p>It may have moved. Try searching instead.</p><form action="/search" class="bigsearch"><input name="q" type="search" placeholder="Search help"></form><p><a href="/">Back to all help</a></p></section>'))
    print(f"built {len(allarts)} articles in {len(CATEGORIES)} categories")

main()
