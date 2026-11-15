# Brief 03: the support site (support.oneclickos.org)

Project: **OneClick OS**. Folder: this repo. The public site is `website/`; the support site is a second site beside it in `support/`.

The owner wants full help articles covering everything in OneClick OS. Work without supervision, commit often, and write a short report at the end. Where this brief leaves a choice open, choose the simplest thing and list it in the report.

## What exists

- `support/build.py`: a small generator. Articles are Markdown files in `support/content/<category>/<slug>.md` (format in the file's header comment). It writes `support/public/`, with category pages, search (`static/index.json`) and a link checker.
- `support/static/support.css`, `support.js`: a first-draft layout.
- Three sample articles under `support/content/updates/` and `apps/`. Use them as the pattern for tone and structure.
- Hosting: Firebase site `oneclick-support` in project `codecraft-sol`, in `firebase.json` as a second hosting target. Live now at `https://oneclick-support.web.app`.

## Task 1: make it look like the main site (do this first)

**The owner looked at the first draft and said it "looks like AI and nothing like our main one".** Treat that as a failed design.

- Open `website/` (`index.html`, `features.html`, `about.html`, `assets/site.css`, `assets/story.css`) and rebuild the support site's look from it: same header and wordmark, same fonts (Inter Tight, Newsreader, Caveat, all already in `website/assets/fonts`), same colours, same hand-made feel, same footer, same light and dark behaviour, same storybook layer (`html[data-style=story]`, `?style=classic|story`) so both styles work.
- Reuse the main site's CSS files rather than copying their ideas. Serve them from the support site (copy at build time in `build.py`) so the two stay in step.
- Remove what makes it look generated: the identical rounded cards in a grid with an icon on each, pill chips, big centred hero with a search bar, "Popular" pill row. Look at how the main site lays out pages and do that. Real help sites (Apple Support, Mozilla Support, Zorin's help) are lists and plain pages, not tile walls.
- Rules from the main project: flat design, no glow, no gradients, no neon, **no emoji**, icons only as hand-written SVG, no "AI" wording, no telemetry or analytics. Phone layout must work (check at 375 px).
- Check it in the browser at both widths, in light and dark, in both styles. Screenshots into `docs/antigravity/reports/shots/`.

## Task 2: write the articles

Write them with parallel agents, one per category. Target: **at least 120 articles in total**, each worth reading, 150 to 600 words, plain English for someone coming from Windows who has never used Linux.

Categories (already defined in `build.py`): `getting-started`, `desktop`, `apps`, `gaming`, `settings`, `updates`, `windows`, `troubleshooting`. Add one called `account-and-privacy` only if needed.

Cover at least:

- **Getting started**: try it without installing (the in-browser demo on the main site), what you need, make the installer USB, install on a PC, **dual-boot with Windows** (shrinking the Windows drive, what to back up first, how to choose at start-up, how to remove OneClick later), first-run setup page by page, the welcome tour, choosing starter apps.
- **Desktop**: start menu, search (including Settings pages), taskbar and its options, window buttons, snapping, virtual desktops, notifications, Files, Task Manager, screenshots, keyboard shortcuts table, the Look switch between Windows style and Mac style, wallpapers and dark mode, animation speed.
- **Apps**: App Store, installing and removing, where apps come from, LibreOffice and Office files, Office on the web, OneDrive and Google Drive, Windows programs and Bottles, browsers, Claude and ChatGPT shortcuts, email and calendar, printing, PDF.
- **Gaming**: Steam and Proton, controllers, GeForce NOW and Xbox Cloud Gaming, which games will not run and why (kernel anti-cheat), checking a game on ProtonDB, performance, Nvidia drivers.
- **Settings and hardware**: Wi-Fi, Bluetooth, displays and scaling, sound, printers and scanners, keyboard and language, accounts and passwords, users, power and battery, backup, storage, privacy, About This PC.
- **Updates and safety**: how updates work, Full versus Security only, undo, previous versions, update failed, back up your files, what OneClick never does (no telemetry, no pushed updates).
- **Coming from Windows**: a Windows-to-OneClick table of "where did X go", moving your files, browser bookmarks, what does not work (Adobe, desktop Office, some anti-cheat games) and what to use instead.
- **Troubleshooting**: will not start, black screen, no sound, no Wi-Fi, screen too small, app crashed (the Reopen window), frozen update, out of space, forgot password, reporting a problem.

### Truth rules (not negotiable)

1. **Describe only what the system really does.** Read `docs/WHAT-IS-IN-THE-IMAGE.md`, `docs/antigravity/reports/BRIEF-02-report.md`, `settings_pages/`, `build_files/build.sh` and `system_files/` before writing about a feature. If something is written but not yet seen working, say so in plain words in the article ("coming in a later version") or leave it out.
2. **Never invent menu names, buttons or steps.** The preview VM (`mac/run-preview.sh`, `tools/preview/`) is there to check wording against the real screens. Where an article names a screen, you saw it or you read the QML.
3. **Do not promise** that a game, program or device works. Say what we know and where to check.
4. No legal or medical claims. Do not publish phone numbers, addresses or a company registration. Contact is `oneclick@codecraftsol.org` and the Report a problem page only.
5. Keep the test-version honesty: the system is an early test.
6. `python3 support/build.py` must pass (it fails on broken links, unknown categories and missing titles). Fix every error it names.
7. The owner dislikes anything that reads like marketing or like a chatbot wrote it. Short sentences, concrete steps, no filler, no "Let's dive in".

## Task 3: deploy

- `python3 support/build.py && firebase deploy --only hosting:oneclick-support --project codecraft-sol`. You may deploy this one site. Do not deploy the main site, functions, or touch DNS.
- **Cloudflare is DNS only for this project; everything else is Firebase.**
- Do **not** connect the custom domain. Tell the owner (see below).

## Do not touch

`website/` (read it, never edit it), `functions/`, the main site's hosting target, GitHub settings, anything outside this repo. Stage per file (`git add <file>`), plain-English commit messages.

## Done means

1. The support site looks like it belongs to the main site, in both styles, light and dark, phone and desktop.
2. 120+ articles, all building, all checked against the real system, links valid, search works.
3. Deployed to `https://oneclick-support.web.app`.
4. `docs/antigravity/reports/BRIEF-03-report.md`: list of articles, the choices you made, what you checked on screen and what you only read from code, and **Needs the owner**: add the custom domain `support.oneclickos.org` (Firebase console, Hosting, site `oneclick-support`, Add custom domain; then a DNS-only CNAME at Cloudflare, shown by Firebase).
5. Mailbox checked (`docs/antigravity/mailbox/check.sh`) right before saying done.
