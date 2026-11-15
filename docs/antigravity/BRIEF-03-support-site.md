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
- Do **not** connect custom domains (`support.oneclickos.org`, `dash.betatesters.oneclickos.org`). Tell the owner (see below). You may create the Firebase hosting sites.

## Task 4: accounts, community reports and replies

People can sign in on the support site, post their own problem reports, and reply to reports (their own and others'). Beta testers get a richer account on a dashboard.

**Accounts**
- Firebase Authentication in project `codecraft-sol`, email and password plus email-link sign-in. No Google or social sign-in, no phone numbers, no third-party trackers or analytics.
- One account for the support site and the dashboard (same Firebase project). Browser sign-in does not carry across different addresses, so people sign in once on each; say so plainly on the pages. A short display name is the only public detail. **Email addresses are never shown to other users.**
- Account page: change display name, change email, change password, **delete my account** (removes the account and its posts or turns them into "deleted user").

**Reports and replies**
- Everyone can read public reports without signing in. Signing in is needed to post a report or reply.
- A report has: title, what happened, what they expected, their computer (optional), OneClick version (optional), category, status (`new`, `looking`, `fixed`, `not a bug`, `duplicate`), and replies in a thread. Add a "Same problem for me" button (one per person).
- Staff (Codecraft) replies are marked **OneClick team**. Staff status comes from a Firestore `staff` collection or custom claims set by us in the Firebase console, never from anything the user can write.
- The existing report form on the main site (`/api/report`, function `oneclickReport`, private issue copy in `codecraft-workspace`) stays as it is. Do not edit `functions/index.js`'s existing function. If community reports need a function (for example to strip emails, phone numbers and keys from public text with the same `redact()` rules, or to notify staff), add a **new** function in the same codebase and keep it small.
- **Privacy:** run the same cleaning on anything posted publicly (emails, phone-like numbers, IP addresses, key-like strings, "password is ..."). Show a clear warning above the post form: "This is public. Do not put passwords, addresses or phone numbers here."
- **Abuse:** rate limits per user, honeypot, report/flag button on posts, staff can hide a post. Posts by brand-new accounts wait for approval only if spam becomes a problem; start simple and list the choice in the report.
- **Firestore security rules are mandatory and must be tested** with the Firebase emulator or rules unit tests: users can only create posts as themselves, edit or delete only their own, cannot set status or staff flags, cannot read anyone's email or private fields. Put the rules in the repo and deploy them with `firebase deploy --only firestore:rules` **only if** the existing rules for other apps in this project keep working: read `firestore.rules` first, **merge** (never replace) and keep every existing rule for the other apps (this is a shared project). If you cannot be sure, stop and put it under "Needs the owner" instead of deploying.

**Beta testers and the dashboard**
- Site: `dash.betatesters.oneclickos.org` (option 1; `betatestersdash.oneclickos.org` is the fallback if the owner cannot add the first). Its own Firebase Hosting site `oneclick-dash` in project `codecraft-sol`, a third target in `firebase.json`. Same look as the main site.
- A beta tester is a normal account with `betaTester: true` set by us (custom claim or `testers` collection, written only by staff). Owner decides who: add a simple staff-only page, or a short script in `tools/`, to add and remove testers by email.
- The dashboard shows, only to that tester: their account details, their own reports and replies with status, notifications of new team replies, which version they are on (typed in or chosen, **never collected automatically**), test notes from the team (pinned messages), and a link to the installer when one exists. Testers see a "Beta testers" area on the support site too (a private board where only testers and staff can read and post).
- No automatic data collection from the OS in this task. If a tester wants to share logs, they attach text themselves.
- Update `website/privacy.html` text is **not yours to edit** (do not touch `website/`). Instead put the exact new privacy wording needed (what accounts store, how long, how to delete, who can see what) into the report under "Needs the owner", so it can be added before accounts open.

**Do not turn accounts on for the public yet**: build and test everything, but keep sign-up closed behind a flag (`OPEN_SIGNUPS = false` in a config file, and an invite or "beta" code) until the owner has added the privacy wording and enabled the sign-in methods in the Firebase console (which you cannot do). List the console steps exactly under "Needs the owner".

## Do not touch

`website/` (read it, never edit it), `functions/`, the main site's hosting target, GitHub settings, anything outside this repo. Stage per file (`git add <file>`), plain-English commit messages.

## Done means

1. The support site looks like it belongs to the main site, in both styles, light and dark, phone and desktop.
2. 120+ articles, all building, all checked against the real system, links valid, search works.
3. Deployed to `https://oneclick-support.web.app`.
4. Accounts, community reports with replies, and the beta tester dashboard work against the Firebase emulator (and live once the owner finishes the console steps), with security rules tested.
5. `docs/antigravity/reports/BRIEF-03-report.md`: list of articles, the choices you made, what you checked on screen and what you only read from code, and **Needs the owner**: add the custom domain `support.oneclickos.org` (Firebase console, Hosting, site `oneclick-support`, Add custom domain; then a DNS-only record at Cloudflare, shown by Firebase), the same for `dash.betatesters.oneclickos.org`, which needs its own record, plus the Firebase console steps for Authentication.
6. Mailbox checked (`docs/antigravity/mailbox/check.sh`) right before saying done.
