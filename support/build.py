#!/usr/bin/env python3
"""Builds the OneClick OS support site (support.oneclickos.org).

Articles live in support/content/<category>/<slug>.md:

    title: Install apps from the App Store
    summary: One line shown in lists and search.
    order: 10            (optional, smaller comes first)
    ---
    Body in a small Markdown subset: ## and ### headings, paragraphs,
    - lists, 1. steps, > Note: callouts, tables, **bold**, `code`,
    [links](url), ```code blocks```.

Templates live in support/templates/*.html using Python string.Template
placeholders (${title}, ${body}, etc.). Assets are copied from website/assets/
into support/public/assets/ at build time so the two sites stay in step.

Run: python3 support/build.py [--strict-counts]
"""

import argparse
import html
import json
import re
import shutil
from pathlib import Path
from string import Template

ROOT = Path(__file__).parent
REPO_ROOT = ROOT.parent
CONTENT = ROOT / "content"
STATIC = ROOT / "static"
TEMPLATES = ROOT / "templates"
WEBSITE_ASSETS = REPO_ROOT / "website" / "assets"
OUT = ROOT / "public"
DASH_ASSETS = REPO_ROOT / "dash" / "public" / "assets"
PREVIEW_MIRROR = Path("/Users/sasenb/OneClickVM/support-site")

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
CAT = {slug: (title, desc) for slug, title, desc in CATEGORIES}
CAT_NUM = {slug: f"{idx:02d}" for idx, (slug, _, _) in enumerate(CATEGORIES, start=1)}

REQUIRED_WEBSITE_FILES = (
    "site.css",
    "story.css",
    "story-fonts.css",
    "wordmark-dark.svg",
    "wordmark-light.svg",
    "logo.svg",
    "logo-light.svg",
)
REQUIRED_STATIC_FILES = ("support.css", "support.js")
STATIC_ROUTES = {"/", "/search", "/reports", "/account", "/beta", "/404.html"}
MIN_WORDS = 150
MAX_WORDS = 600


def slugify(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def format_inline_plain(text):
    escaped = html.escape(text, quote=False)
    escaped = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", escaped)
    escaped = re.sub(r"(?<!\*)\*([^*\n]+)\*(?!\*)", r"<em>\1</em>", escaped)

    def _replace_link(match):
        label = match.group(1)
        url = match.group(2)
        ext = ' rel="noopener"' if url.startswith(("http://", "https://")) else ""
        return f'<a href="{html.escape(url, quote=True)}"{ext}>{label}</a>'

    return re.sub(r"\[([^\]]+)\]\(([^)\s]+)\)", _replace_link, escaped)


def inline(text):
    """Render inline Markdown while preserving backtick code spans verbatim."""
    parts = re.split(r"(`[^`]+`)", text)
    rendered = []
    for idx, part in enumerate(parts):
        if idx % 2 == 1 and part.startswith("`") and part.endswith("`"):
            rendered.append(f"<code>{html.escape(part[1:-1], quote=False)}</code>")
        else:
            rendered.append(format_inline_plain(part))
    return "".join(rendered)


def is_table_divider(line):
    stripped = line.strip()
    if "|" not in stripped:
        return False
    cells = [c.strip() for c in stripped.strip("|").split("|")]
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", c) for c in cells)


def split_table_row(line):
    return [c.strip() for c in line.strip().strip("|").split("|")]


def render_markdown(md):
    """Convert subset Markdown to HTML and extract ordered h2 TOC entries."""
    out = []
    toc = []
    used_ids = set()
    lines = md.replace("\r\n", "\n").splitlines()
    i = 0

    while i < len(lines):
        ln = lines[i].rstrip()
        if not ln.strip():
            i += 1
            continue

        if ln.startswith("```"):
            buf = []
            i += 1
            while i < len(lines) and not lines[i].startswith("```"):
                buf.append(lines[i])
                i += 1
            out.append("<pre><code>" + html.escape("\n".join(buf)) + "</code></pre>")
            i += 1
            continue

        if re.fullmatch(r"-{3,}", ln.strip()):
            out.append("<hr>")
            i += 1
            continue

        heading = re.match(r"^(#{2,3}) (.+)$", ln)
        if heading:
            lvl = len(heading.group(1))
            txt = heading.group(2).strip()
            base_id = slugify(txt) or "section"
            hid = base_id
            suffix = 2
            while hid in used_ids:
                hid = f"{base_id}-{suffix}"
                suffix += 1
            used_ids.add(hid)
            if lvl == 2:
                toc.append([hid, txt, False])
            out.append(f'<h{lvl} id="{hid}">{inline(txt)}</h{lvl}>')
            i += 1
            continue

        if ln.startswith(">"):
            buf = []
            while i < len(lines) and lines[i].startswith(">"):
                buf.append(lines[i][1:].strip())
                i += 1
            txt = " ".join(buf)
            kind = "warn" if re.match(r"(Warning|Important|Careful)\b", txt) else "note"
            out.append(f'<blockquote class="callout {kind}">{inline(txt)}</blockquote>')
            continue

        if "|" in ln and i + 1 < len(lines) and is_table_divider(lines[i + 1]):
            headers = split_table_row(ln)
            i += 2
            rows = []
            while i < len(lines) and "|" in lines[i] and lines[i].strip():
                rows.append(split_table_row(lines[i]))
                i += 1
            thead = "<thead><tr>" + "".join(f"<th>{inline(h)}</th>" for h in headers) + "</tr></thead>"
            tbody_rows = []
            for row in rows:
                padded = row + [""] * (len(headers) - len(row))
                cells = "".join(f"<td>{inline(c)}</td>" for c in padded[:len(headers)])
                tbody_rows.append(f"<tr>{cells}</tr>")
            tbody = "<tbody>" + "".join(tbody_rows) + "</tbody>"
            out.append(f"<table>{thead}{tbody}</table>")
            continue

        if re.match(r"^(?:[-*] |\d+\. )", ln):
            ordered = bool(re.match(r"^\d+\. ", ln))
            tag = "ol" if ordered else "ul"
            pat = r"^\d+\. " if ordered else r"^[-*] "
            items = []
            while i < len(lines) and (re.match(pat, lines[i]) or (lines[i].startswith("  ") and items)):
                if re.match(pat, lines[i]):
                    items.append(re.sub(pat, "", lines[i], count=1).strip())
                else:
                    items[-1] += " " + lines[i].strip()
                i += 1
            if ordered:
                if toc:
                    toc[-1][2] = True
                lis = "".join(
                    f'<li><button type="button" class="tick" aria-pressed="false" aria-label="Mark step {n} as done">{n}</button>'
                    f'<div class="step-body">{inline(x)}</div></li>'
                    for n, x in enumerate(items, start=1)
                )
                out.append(f'<ol class="todo">{lis}</ol>')
            else:
                out.append("<ul>" + "".join(f"<li>{inline(x)}</li>" for x in items) + "</ul>")
            continue

        buf = []
        while i < len(lines):
            cur = lines[i]
            if not cur.strip():
                break
            if re.match(r"^(#{2,3} |>|[-*] |\d+\. |```|-{3,}$)", cur.strip()):
                break
            if "|" in cur and i + 1 < len(lines) and is_table_divider(lines[i + 1]):
                break
            buf.append(cur.strip())
            i += 1
        out.append("<p>" + inline(" ".join(buf)) + "</p>")

    return "\n".join(out), toc


def parse_article(path):
    raw = path.read_text(encoding="utf-8").replace("\r\n", "\n")
    head, sep, body = raw.partition("\n---\n")
    if not sep:
        raise SystemExit(f"{path}: missing frontmatter separator '---'")
    meta = {}
    for ln in head.splitlines():
        if ":" in ln:
            k, v = ln.split(":", 1)
            meta[k.strip()] = v.strip()
    return meta, body


def plain_text_from_html(snippet):
    text = re.sub(r"<[^>]+>", " ", snippet)
    return html.unescape(re.sub(r"\s+", " ", text)).strip()


def copy_website_assets(dest_dir):
    if dest_dir.exists():
        shutil.rmtree(dest_dir)
    dest_dir.mkdir(parents=True, exist_ok=True)
    fonts_src = WEBSITE_ASSETS / "fonts"
    for name in REQUIRED_WEBSITE_FILES:
        src = WEBSITE_ASSETS / name
        if not src.is_file():
            raise SystemExit(f"missing required website asset: {src}")
        shutil.copy2(src, dest_dir / name)
    shutil.copytree(
        fonts_src,
        dest_dir / "fonts",
        ignore=shutil.ignore_patterns("* [0-9].*", ".DS_Store"),
    )


def copy_assets():
    if not WEBSITE_ASSETS.is_dir():
        raise SystemExit(f"missing website assets directory: {WEBSITE_ASSETS}")
    fonts_src = WEBSITE_ASSETS / "fonts"
    if not fonts_src.is_dir():
        raise SystemExit(f"missing website fonts directory: {fonts_src}")

    copy_website_assets(OUT / "assets")
    if DASH_ASSETS.exists():
        shutil.rmtree(DASH_ASSETS)
    copy_website_assets(DASH_ASSETS)

    static_out = OUT / "static"
    static_out.mkdir(parents=True, exist_ok=True)
    for name in REQUIRED_STATIC_FILES:
        src = STATIC / name
        if not src.is_file():
            raise SystemExit(f"missing required static asset: {src}")
        shutil.copy2(src, static_out / name)


def has_enclosing(template_text, placeholder, pattern):
    idx = template_text.find(placeholder)
    if idx < 0:
        return False
    before = template_text[max(0, idx - 200):idx]
    return bool(re.search(pattern, before, flags=re.IGNORECASE | re.DOTALL))


def load_template(name):
    path = TEMPLATES / name
    if not path.is_file():
        raise SystemExit(f"missing template file: {path}")
    return path.read_text(encoding="utf-8")


def nav_attrs(nav_active):
    topics = nav_active in ("home", "category", "article")
    return {
        "nav_topics_attr": ' aria-current="page"' if topics else "",
        "nav_search_attr": ' aria-current="page"' if nav_active == "search" else "",
        "nav_reports_attr": ' aria-current="page"' if nav_active == "reports" else "",
        "nav_beta_attr": ' aria-current="page"' if nav_active == "beta" else "",
        "nav_account_attr": ' aria-current="page"' if nav_active == "account" else "",
    }


def assert_no_unreplaced_tokens(rendered_html, label):
    stripped = re.sub(r"<pre>.*?</pre>|<code>.*?</code>", "", rendered_html, flags=re.S)
    leftover = re.findall(r"\$\{[A-Za-z_][A-Za-z0-9_]*\}", stripped)
    if leftover:
        raise SystemExit(f"{label}: unreplaced template placeholder(s): {', '.join(sorted(set(leftover)))}")


def render_page(base_tpl, inner_tpl, ctx, label):
    full_ctx = {**ctx, **nav_attrs(ctx["nav_active"])}
    body_html = Template(inner_tpl).substitute(full_ctx)
    if inner_tpl.lstrip().lower().startswith("<!doctype"):
        full_html = body_html
    else:
        full_html = Template(base_tpl).substitute({**full_ctx, "body": body_html})
    assert_no_unreplaced_tokens(full_html, label)
    return full_html


DRAFT = False  # set by --draft: report broken links instead of stopping


def link_problem(msg):
    if DRAFT:
        print("draft: " + msg)
    else:
        raise SystemExit(msg)


def check_internal_links(articles_by_slug, heading_ids_by_url):
    copied_assets = {f"/assets/{p.relative_to(OUT / 'assets').as_posix()}" for p in (OUT / "assets").rglob("*") if p.is_file()}
    copied_static = {f"/static/{p.relative_to(OUT / 'static').as_posix()}" for p in (OUT / "static").rglob("*") if p.is_file()}
    copied_static.add("/static/index.json")

    for a in articles_by_slug.values():
        src_url = f"/{a['cat']}/{a['slug']}"
        for attr, raw_target in re.findall(r'(href|src)="(/[^"]*)"', a["body_html"]):
            if raw_target.startswith("//"):
                continue
            path_part, _, frag = raw_target.partition("#")
            path_no_q = path_part.split("?", 1)[0]
            norm = path_no_q.rstrip("/") or "/"

            if norm in STATIC_ROUTES or norm in copied_assets or norm in copied_static:
                continue

            parts = norm.strip("/").split("/")
            if len(parts) == 1 and parts[0] in CAT:
                continue
            if len(parts) == 2 and parts[0] in CAT and parts[1] in articles_by_slug and articles_by_slug[parts[1]]["cat"] == parts[0]:
                if frag and frag not in heading_ids_by_url.get(norm, set()):
                    link_problem(f"{a['cat']}/{a['slug']}: broken anchor #{frag} in link {raw_target}")
                continue
            if attr == "href" and not path_no_q and frag:
                if frag not in heading_ids_by_url.get(src_url, set()):
                    link_problem(f"{a['cat']}/{a['slug']}: broken local anchor #{frag}")
                continue

            link_problem(f"{a['cat']}/{a['slug']}: broken internal link {raw_target}")


def build_categories_ledger(arts, home_tpl):
    cards = []
    for slug, name, desc in CATEGORIES:
        cat_arts = arts[slug]
        if not cat_arts:
            continue
        count = len(cat_arts)
        items = "".join(
            f'<li><a href="/{slug}/{a["slug"]}">{html.escape(a["title"])}</a></li>'
            for a in cat_arts[:5]
        )
        cards.append(
            f'<article class="topic">'
            f'<span class="num">{CAT_NUM[slug]}</span>'
            f'<h2><a href="/{slug}">{html.escape(name)}</a></h2>'
            f'<p class="topic-desc">{html.escape(desc)}</p>'
            f'<ul class="topic-links">{items}</ul>'
            f'<a class="all-link" href="/{slug}">All {count} guides</a>'
            f'</article>'
        )
    return "\n".join(cards)


def build_articles_ledger(cat_slug, cat_arts, category_tpl):
    if not cat_arts:
        return '<p class="empty">Guides for this topic are still being written.</p>'
    return "\n".join(
        f'<a class="guide" href="/{cat_slug}/{a["slug"]}">'
        f'<span class="num">{n:02d}</span>'
        f'<span class="guide-text"><b>{html.escape(a["title"])}</b>'
        f'<span>{html.escape(a["summary"])}</span></span>'
        f'</a>'
        for n, a in enumerate(cat_arts, start=1)
    )


def build_other_categories(current_slug, category_tpl):
    items = [(k, n) for k, n, _ in CATEGORIES if k != current_slug]
    if has_enclosing(category_tpl, "${other_categories}", r"<ul\b[^>]*>"):
        return "\n".join(f'<li><a href="/{k}">{html.escape(n)}</a></li>' for k, n in items)
    return "\n".join(f'<a href="/{k}">{html.escape(n)}</a>' for k, n in items)


def build_toc_links(toc):
    if len(toc) < 2:
        return ""
    def group(label, entries):
        if not entries:
            return ""
        items = "".join(f'<li><a href="#{hid}">{html.escape(txt)}</a></li>' for hid, txt, _ in entries)
        return f'<h4 class="side-sub">{label}</h4><ul>{items}</ul>'
    steps = [t for t in toc if t[2]]
    other = [t for t in toc if not t[2]]
    return ('<div class="side-block toc"><h3 class="side-label">On this page</h3>'
            + group("Steps", steps) + group("Good to know", other) + "</div>")


def build_sibling_links(cat_slug, sibs, current_art):
    items = []
    for s in sibs:
        attr = ' aria-current="page"' if s is current_art else ""
        items.append(
            f'<li><a href="/{cat_slug}/{s["slug"]}"{attr}>'
            f'{html.escape(s["title"])}</a></li>'
        )
    return f'<div class="side-block sibs"><h3 class="side-label">More in {html.escape(CAT[cat_slug][0])}</h3><ul>{"".join(items)}</ul></div>'


def build_prev_next(cat_slug, sibs, idx):
    parts = []
    if idx > 0:
        prev_art = sibs[idx - 1]
        parts.append(
            f'<a class="prev" href="/{cat_slug}/{prev_art["slug"]}">'
            f'<small>Previous</small><b>{html.escape(prev_art["title"])}</b></a>'
        )
    else:
        parts.append(
            f'<a class="prev" href="/{cat_slug}">'
            f'<small>Topic</small><b>All in {html.escape(CAT[cat_slug][0])}</b></a>'
        )
    if idx + 1 < len(sibs):
        next_art = sibs[idx + 1]
        parts.append(
            f'<a class="next" href="/{cat_slug}/{next_art["slug"]}">'
            f'<small>Next</small><b>{html.escape(next_art["title"])}</b></a>'
        )
    return '<div class="prev-next">' + "".join(parts) + "</div>"


def sync_preview_mirror():
    """Mirror built support/public/ into local preview folder while preserving root inode."""
    if not PREVIEW_MIRROR.is_dir():
        return
    for child in list(PREVIEW_MIRROR.iterdir()):
        if child.is_dir() and not child.is_symlink():
            shutil.rmtree(child)
        else:
            child.unlink()
    shutil.copytree(OUT, PREVIEW_MIRROR, dirs_exist_ok=True)


def main():
    parser = argparse.ArgumentParser(description="Build the OneClick OS support site.")
    parser.add_argument(
        "--draft", action="store_true",
        help="Report broken links instead of stopping (for previews while articles are being written).",
    )
    parser.add_argument(
        "--strict-counts",
        action="store_true",
        help=f"Print per-article word counts and fail if any article is outside {MIN_WORDS}..{MAX_WORDS} words.",
    )
    args = parser.parse_args()
    global DRAFT
    DRAFT = args.draft

    base_tpl = load_template("base.html")
    home_tpl = load_template("home.html")
    category_tpl = load_template("category.html")
    article_tpl = load_template("article.html")
    search_tpl = load_template("search.html")
    reports_tpl = load_template("reports.html")
    account_tpl = load_template("account.html")
    beta_tpl = load_template("beta.html")
    notfound_tpl = load_template("404.html")

    if OUT.exists():
        shutil.rmtree(OUT)
    copy_assets()

    arts = {k: [] for k in CAT}
    for md_path in sorted(CONTENT.glob("*/*.md")):
        cat = md_path.parent.name
        if cat not in CAT:
            raise SystemExit(f"unknown category '{cat}' ({md_path})")
        meta, body = parse_article(md_path)
        for req in ("title", "summary"):
            if not meta.get(req):
                raise SystemExit(f"{md_path}: missing {req}")
        body_html, toc = render_markdown(body)
        plain = plain_text_from_html(body_html)
        words = len(re.findall(r"\S+", plain))
        arts[cat].append({
            **meta,
            "slug": md_path.stem,
            "cat": cat,
            "order": int(meta.get("order", 50)),
            "body_html": body_html,
            "toc": toc,
            "plain_text": plain,
            "words": words,
        })

    for k in arts:
        arts[k].sort(key=lambda a: (a["order"], a["title"].lower()))

    all_arts = [a for k, _, _ in CATEGORIES for a in arts[k]]
    byslug = {a["slug"]: a for a in all_arts}
    if len(byslug) != len(all_arts):
        raise SystemExit("two articles share the same slug")

    heading_ids_by_url = {}
    for a in all_arts:
        ids = set(re.findall(r'id="([^"]+)"', a["body_html"]))
        heading_ids_by_url[f"/{a['cat']}/{a['slug']}"] = ids

    check_internal_links(byslug, heading_ids_by_url)

    out_of_range = [a for a in all_arts if a["words"] < MIN_WORDS or a["words"] > MAX_WORDS]
    if args.strict_counts:
        for a in all_arts:
            mark = "OK" if MIN_WORDS <= a["words"] <= MAX_WORDS else "OUT_OF_RANGE"
            print(f"{a['cat']}/{a['slug']}: {a['words']} words [{mark}]")
        if out_of_range:
            raise SystemExit(
                f"{len(out_of_range)} article(s) outside {MIN_WORDS}..{MAX_WORDS} words"
            )

    total_articles = str(len(all_arts))
    helpful_report_href = "https://oneclickos.org/report"

    index_entries = []
    for a in all_arts:
        cname = CAT[a["cat"]][0]
        sibs = arts[a["cat"]]
        pos = sibs.index(a)
        toc_data = [{"id": hid, "title": txt} for hid, txt, _ in a["toc"]]
        page_script = (
            f'<script id="article-toc-data" type="application/json">{json.dumps(toc_data)}</script>'
            if toc_data
            else ""
        )
        ctx = {
            "title": f"{html.escape(a['title'])} - OneClick OS Support",
            "description": html.escape(a["summary"], quote=True),
            "canonical_path": f"/{a['cat']}/{a['slug']}",
            "nav_active": "article",
            "page_script": page_script,
            "total_articles": total_articles,
            "cat_title": html.escape(cname),
            "cat_slug": a["cat"],
            "art_title": html.escape(a["title"]),
            "art_summary": html.escape(a["summary"]),
            "toc_links": build_toc_links(a["toc"]),
            "sibling_links": build_sibling_links(a["cat"], sibs, a),
            "art_body": a["body_html"],
            "prev_next": build_prev_next(a["cat"], sibs, pos),
            "helpful_report_href": helpful_report_href,
        }
        dest_dir = OUT / a["cat"] / a["slug"]
        dest_dir.mkdir(parents=True, exist_ok=True)
        (dest_dir / "index.html").write_text(
            render_page(base_tpl, article_tpl, ctx, f"{a['cat']}/{a['slug']}"),
            encoding="utf-8",
        )
        index_entries.append({
            "title": a["title"],
            "summary": a["summary"],
            "url": f"/{a['cat']}/{a['slug']}",
            "category": cname,
            "category_slug": a["cat"],
            "body_text": a["plain_text"][:4000],
        })

    for cat_slug, cat_name, cat_desc in CATEGORIES:
        ctx = {
            "title": f"{html.escape(cat_name)} - OneClick OS Support",
            "description": html.escape(cat_desc, quote=True),
            "canonical_path": f"/{cat_slug}",
            "nav_active": "category",
            "page_script": "",
            "total_articles": total_articles,
            "cat_title": html.escape(cat_name),
            "cat_slug": cat_slug,
            "cat_desc": html.escape(cat_desc),
            "cat_chapter": f"part {CAT_NUM[cat_slug]}",
            "articles_ledger": build_articles_ledger(cat_slug, arts[cat_slug], category_tpl),
            "other_categories": build_other_categories(cat_slug, category_tpl),
            "helpful_report_href": helpful_report_href,
        }
        cat_dir = OUT / cat_slug
        cat_dir.mkdir(parents=True, exist_ok=True)
        (cat_dir / "index.html").write_text(
            render_page(base_tpl, category_tpl, ctx, f"category:{cat_slug}"),
            encoding="utf-8",
        )

    home_ctx = {
        "title": "OneClick OS Support",
        "description": "Plain answers for OneClick OS, written for people coming from Windows.",
        "canonical_path": "/",
        "nav_active": "home",
        "page_script": "",
        "categories_ledger": build_categories_ledger(arts, home_tpl),
        "total_articles": total_articles,
        "helpful_report_href": helpful_report_href,
    }
    (OUT / "index.html").write_text(
        render_page(base_tpl, home_tpl, home_ctx, "home"),
        encoding="utf-8",
    )

    static_pages = [
        ("search", search_tpl, "/search", "search", "Search - OneClick OS Support", "Search OneClick OS help articles.", {"initial_query": ""}),
        ("reports", reports_tpl, "/reports", "reports", "Report a problem - OneClick OS Support", "Tell the OneClick OS team what went wrong.", {}),
        ("account", account_tpl, "/account", "account", "Account - OneClick OS Support", "Manage your OneClick OS support account.", {}),
        ("beta", beta_tpl, "/beta", "beta", "Beta testers - OneClick OS Support", "Notes and discussion for OneClick OS beta testers.", {}),
    ]
    for route, tpl, cpath, nav_key, ptitle, pdesc, extra in static_pages:
        ctx = {
            "title": ptitle,
            "description": pdesc,
            "canonical_path": cpath,
            "nav_active": nav_key,
            "page_script": "",
            "total_articles": total_articles,
            "helpful_report_href": helpful_report_href,
            **extra,
        }
        page_dir = OUT / route
        page_dir.mkdir(parents=True, exist_ok=True)
        (page_dir / "index.html").write_text(
            render_page(base_tpl, tpl, ctx, route),
            encoding="utf-8",
        )

    notfound_ctx = {
        "title": "Page not found - OneClick OS Support",
        "description": "That help page is not here.",
        "canonical_path": "/404.html",
        "nav_active": "404",
        "page_script": "",
        "total_articles": total_articles,
        "helpful_report_href": helpful_report_href,
    }
    (OUT / "404.html").write_text(
        render_page(base_tpl, notfound_tpl, notfound_ctx, "404"),
        encoding="utf-8",
    )

    (OUT / "static" / "index.json").write_text(
        json.dumps(index_entries, separators=(",", ":")),
        encoding="utf-8",
    )

    sync_preview_mirror()

    print(f"built {len(all_arts)} articles in {len(CATEGORIES)} categories")
    if out_of_range:
        print(
            f"warning: {len(out_of_range)} article(s) outside {MIN_WORDS}..{MAX_WORDS} words "
            "(run with --strict-counts for details)"
        )


if __name__ == "__main__":
    main()
