# Brief 03 Report: Support Site, Articles, Accounts, and Beta Dashboard

Summary of Tasks 1–4 from [BRIEF-03-support-site.md](../BRIEF-03-support-site.md) for **OneClick OS** (`support/` and `dash/` in this repository, hosted under Firebase project `codecraft-sol`). Every item below distinguishes **what was verified directly on screen**, **what passed in CLI / emulator / live HTTP & REST checks**, and **what still depends on owner console actions**.

---

## Needs the owner

### 1. Firebase Authentication (`codecraft-sol` -> Build -> Authentication)

Read-only inspection of `https://identitytoolkit.googleapis.com/admin/v2/projects/codecraft-sol/config` and `defaultSupportedIdpConfigs` (HTTP `200`) shows **Google Sign-In (`google.com`)** is already enabled with a Client ID, **`signIn.email.enabled`** is `true`, and `localhost` is already authorized — **but none of the OneClick Hosting domains are in `authorizedDomains` yet**.

1. **Authorized domains (`Settings -> Authorized domains`)** — Add all of the following domains before testing live Email-Link or Google Sign-In (currently missing from `authorizedDomains`, so live popup/email-link requests on these hosts fail with `auth/unauthorized-domain`):
   - `oneclick-support.web.app`
   - `oneclick-support.firebaseapp.com`
   - `oneclick-dash.web.app`
   - `oneclick-dash.firebaseapp.com`
   - `support.oneclickos.org`
   - `dash.betatesters.oneclickos.org` (or add `betatestersdash.oneclickos.org` instead if you use the fallback domain below)
2. **Sign-in method (`Sign-in method -> Email/Password`)**:
   - Confirm **Email/Password** is enabled and verify that the **Email link (passwordless sign-in)** toggle inside Email/Password is switched **on** (`passwordRequired` was omitted in the read-only API JSON).
   - Keep **Google** enabled.
   - Keep Phone sign-in, other social providers, and Firebase Analytics disabled.

### 2. Firebase Hosting Custom Domains + Cloudflare DNS

Both Firebase Hosting sites exist and are deployed (`oneclick-support`, `oneclick-dash`), but custom domains were not connected per brief:

1. **Support site (`support.oneclickos.org`)**:
   - In Firebase Console -> **Hosting** -> site **`oneclick-support`** -> **Add custom domain** -> enter `support.oneclickos.org`.
   - Copy the verification `TXT` record and `A`/`CNAME` records shown by Firebase into Cloudflare DNS for `oneclickos.org`, set to **DNS only (grey cloud)** (proxy off).
2. **Beta Tester Dashboard (`dash.betatesters.oneclickos.org`)**:
   - In Firebase Console -> **Hosting** -> site **`oneclick-dash`** -> **Add custom domain** -> enter `dash.betatesters.oneclickos.org` (fallback if DNS/certificate issuance rejects the multi-level subdomain: `betatestersdash.oneclickos.org`).
   - Copy its separate verification `TXT` and `A`/`CNAME` records into Cloudflare DNS as **DNS only (grey cloud)**.

### 3. Add Support & Beta Account wording to `website/privacy.html`

Per the brief, `website/` was left untouched (`website/privacy.html` currently has Sections 1–8). Before flipping `OPEN_SIGNUPS` to `true`, add the following plain-English section (or append into Section 4 / add as Section 5 and renumber Sections 5–8) in `website/privacy.html`:

```html
  <h2>Support accounts and the Beta Tester Dashboard</h2>
  <p>Reading the guides on <b>support.oneclickos.org</b> and reading public problem reports does not require an account and sets no tracking cookies. Signing in is optional and is only used if you choose to post public community reports, vote ("Same problem for me"), reply, flag spam, or access the private Beta Tester workspace on <b>dash.betatesters.oneclickos.org</b>.</p>
  <p><b>This privacy section covers the website accounts only.</b> OneClick OS itself still collects zero telemetry, accounts, crash uploads, or background diagnostics from your PC, and any OneClick version or hardware note shown on the Beta Dashboard is typed or chosen manually by you.</p>
  <ul>
    <li><b>How sign-in works:</b> Accounts run on Google Firebase Authentication (project <code>codecraft-sol</code>) using your choice of email and password, a one-time email sign-in link, or Google Sign-In.</li>
    <li><b>What is stored:</b> Your account holds your email address and sign-in ID (in Firebase Authentication), your chosen public display name, optional manually entered OneClick version, and a timestamp tracking unread team replies. If you post on the support site or beta dashboard, we store your posts, replies, vote records (one per user per report), a brief 10-second rate-limit timestamp to prevent spam, and any abuse flags you file.</li>
    <li><b>Who can see what:</b>
      <ul>
        <li><b>Public (anyone on the internet):</b> Public problem reports and replies on <code>support.oneclickos.org/reports</code>, along with your chosen display name. Your email address is never displayed publicly or stored in public report documents.</li>
        <li><b>Beta testers and OneClick team only:</b> Posts and replies on the private <code>/beta</code> board, team test notes on the Beta Dashboard, and hardware checklist entries (<code>betaChecks</code>, readable by approved beta testers and the OneClick team).</li>
        <li><b>Only you and the OneClick team:</b> Your account details record (display name, manually entered OS version, notification read time).</li>
        <li><b>OneClick team only:</b> Abuse flags submitted by users, tester/staff access lists, invite codes, and private reports from the main-site report form.</li>
      </ul>
    </li>
    <li><b>How long we keep it:</b> Your account details and posts stay stored while your account remains active.</li>
    <li><b>Editing, anonymizing, and deleting:</b> When signed in on <code>support.oneclickos.org/account</code>, you can change your public display name, update your email or password (for password accounts), edit or delete your own posts, or press <b>Delete my account</b>. Deleting your account removes your sign-in, private account record, rate-limit record, and your beta checklist entries, and replaces your name and text on public reports, beta board posts, and replies with <code>"deleted user"</code> and <code>[deleted]</code>. You can also ask us to delete anything by emailing <a href="mailto:oneclick@codecraftsol.org">oneclick@codecraftsol.org</a>.</li>
  </ul>
  <p>Firebase Authentication and Cloud Firestore are run by Google and may process or store data outside Australia (including the United States) as noted in the overseas storage section of this policy.</p>
```

### 4. Testers, staff, invite codes & opening public sign-ups

- **Owner access**: `admin@codecraftsol.org` (`isOwner()` in `firestore.rules` and `OWNER_EMAIL` in `support.js` / `dash.js`) automatically has full **OneClick team** and **Beta tester** access without needing separate allowlist entries.
- **Temporary live invite code (`BETA2026`)**: Document `supportInvites/BETA2026` is seeded live in `codecraft-sol` Firestore right now (`active: true`, `label: "Temporary owner test code"`, `maxUses: 50`, `uses: 0`) so you can test account sign-up immediately once the Authorized Domains above are added. Disable (`active: false`) or delete it before public launch if you want tighter control.
- **Managing testers, staff, and invite codes**:
  - **CLI script (`tools/manage-beta-testers.mjs`)**: Supports `tester add/remove/list`, `staff add/remove/list`, and `invite create/list/set-active/remove`. Running it against live `codecraft-sol` requires Application Default Credentials / `GOOGLE_APPLICATION_CREDENTIALS` pointing to a service-account JSON for `codecraft-sol` (or `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` for local emulator testing).
  - **Firebase Console UI**: You can also create/edit documents directly in Firestore under `oneclickStaff/{uid}`, `betaTesters/{lowercase-email-or-uid}`, and `supportInvites/{code}`.
- **Opening sign-ups to the public (when ready)**:
  1. Confirm `website/privacy.html` has been updated and Firebase Auth settings/domains above are active.
  2. Set `const OPEN_SIGNUPS = true;` at the top of both [support/static/support.js](../../../support/static/support.js) and [dash/public/dash.js](../../../dash/public/dash.js).
  3. Rebuild and deploy only the support and dashboard hosting sites:
     ```bash
     python3 support/build.py --strict-counts
     firebase deploy --only hosting:oneclick-support,hosting:oneclick-dash --project codecraft-sol
     ```

---

## Live Deployment & Preview

- **Support site**: `https://oneclick-support.web.app` — deployed via `firebase deploy --only hosting:oneclick-support,hosting:oneclick-dash --project codecraft-sol` (`173` files uploaded & released); live HTTPS `GET /account` verified HTTP `200` serving `#acc-tab-login`, `#acc-tab-signup`, `#acc-google-login-btn`, and `#acc-google-signup-btn`.
- **Beta Tester Dashboard**: `https://oneclick-dash.web.app` — deployed in the same Hosting release (`18` files uploaded & released); live HTTPS `GET /` verified HTTP `200` serving `#dash-google-btn` and `#dash-signin-form`.
- **Firestore Security Rules**: Deployed via `firebase deploy --only firestore:rules --project codecraft-sol` (`1,089` lines compiled & released to `cloud.firestore`).
- **Untouched targets**: `website/`, `hosting:oneclick-os`, and `functions/index.js` (`oneclickReport`) were not modified or deployed.
- **Local preview mirror**: `support/build.py` automatically syncs `support/public/` to `/Users/sasenb/OneClickVM/support-site/` (`http://localhost:5621/`); verified `http://localhost:5621/account` returns HTTP `200` with the current tab & Google Sign-In markup.

---

## Tasks 1–4 Status & Choices Made

### Task 1 — Look & feel rebuilt from `website/`

- **Shared CSS, fonts & wordmarks**: `support/build.py` copies `site.css`, `story.css`, `story-fonts.css`, `fonts/`, `wordmark-dark.svg`, `wordmark-light.svg`, `logo.svg`, and `logo-light.svg` directly from `website/assets/` into both `support/public/assets/` and `dash/public/assets/` at build time so styling stays in lockstep with the main site.
- **Templates & styles**: Built `9` HTML templates in `support/templates/` (`base.html`, `home.html`, `category.html`, `article.html`, `search.html`, `reports.html`, `account.html`, `beta.html`, `404.html`) plus `support/static/support.css` and `dash/public/index.html` + `dash/public/dash.css`. Replaced the generated rounded tile wall with a numbered topic ledger (`01`–`08`), flat bordered containers, inline SVG icons only, zero emoji, zero glow/gradients/neon, working across both Storybook (`story`) and Classic (`classic`), light and dark themes (`#theme`, `?style=classic|story`), and both `375px` mobile and `1440px` desktop widths.

### Task 2 — 141 articles across 8 categories

- **Coverage & counts**: Wrote/expanded `141` Markdown guides across all `8` categories defined in `support/build.py` (`46,495` rendered words total, ranging from `219` words on `settings/wifi` to `519` words on `windows/word-list`). `python3 support/build.py --strict-counts` generates `155` logical HTML pages (`141` articles + `8` categories + `/`, `/search`, `/reports`, `/account`, `/beta`, `/404.html`) plus `support/public/static/index.json`, with **`0` articles outside `150..600` words** and **`0` broken internal links**.
- **Truth rules enforcement**: Audited UI labels and system capabilities against `docs/WHAT-IS-IN-THE-IMAGE.md`, `BRIEF-02-report.md`, `settings_pages/`, and `system_files/` (for example, matching exact Update controls `Check now`, `Updates to receive`, and `Security only`; removing Linux/KDE/Fedora/Flatpak/Flathub leaks in customer prose; stating early-test honesty and avoiding compatibility promises for Windows/anti-cheat software; using plain Grade 6–7 steps with zero chatbot filler or emoji).

### Task 3 — Hosting & rules deployment

- Updated `firebase.json` with `"firestore": {"rules": "firestore.rules"}`, Auth (`9099`) & Firestore (`8080`) emulator config, and `oneclick-dash` alongside `oneclick-support` and `oneclick-os`.
- Deployed `firestore:rules` and `hosting:oneclick-support,hosting:oneclick-dash` only.

### Task 4 — Accounts, community reports, beta board, dashboard & security rules

- **Closed-signup gating (`OPEN_SIGNUPS = false`)**: Both `support/static/support.js` and `dash/public/dash.js` keep `const OPEN_SIGNUPS = false;` and display the closed-signup notice + invite-code input on Create an account. New account creation validates `supportInvites/{code}` and atomically increments `uses` by `1` on password signup, verified email-link completion (`oneclick_pending_invite` stored in `localStorage`), and Google Sign-Up; unauthorized `isNewUser` completions via Email-Link or Google Login are immediately deleted (`F.deleteUser`) and signed out before `onAuthStateChanged` unlocks UI. Pre-approved `OWNER_EMAIL`, `oneclickStaff/{uid}`, and verified `betaTesters/{email-or-uid}` entries are also honored.
- **Account UX & auth providers**: Added synchronous `/account` tabs (`#acc-tab-login`, `#acc-tab-signup`, supporting `#signup` and `?tab=signup`), added Google Sign-In (`GoogleAuthProvider`, `signInWithPopup`, `reauthenticateWithPopup`) alongside Email/Password and Email Link on `/account` and `dash/`, hid password/email-change forms and `#acc-delete-password-wrap` for non-password accounts via `hasPasswordProvider()`, and required recent login or `reauthenticateWithPopup` before deleting a Google account. Clearly states on `/account`, `/reports`, and `dash/` that browser sign-in is per web address (Sign in once on each site) and emails are never public.
- **Community reports (`/reports`)**: Public reading without sign-in; signed-in reporting, replies, edit/delete-to-`deleted user`, 1-vote-per-user `"Same problem for me"` (`votes/{uid}` atomic batch), `OneClick team` staff badges (`isTeam`), staff status (`new`, `looking`, `fixed`, `not a bug`, `duplicate`) & hide controls, abuse reporting (`supportFlags`), honeypot (`website`/`hp`), mandatory public-post warning (`"This is public. Do not put passwords, addresses or phone numbers here."`), client-side `redact()` / `redactLight()` scrubbing home paths (`/home/[user]`, `/Users/[user]`, `C:\Users\[user]`), emails, IPs, phone numbers, API keys/tokens, and `"password is ..."`, plus `sanitizeDisplayName()` rejection on PII-like display names and atomic `supportRateLimits/{uid}` 10-second cooldown batches.
- **Beta board (`/beta`) & Dashboard (`oneclick-dash`)**: Private `/beta` discussion board gated to `isBeta || isStaff`; `dash` provides team reply notifications (`lastTeamReplyAt > lastSeenRepliesAt` + mark seen), manual OS version (`supportAccountMeta/{uid}.osVersion`, explicitly never auto-collected), pinned team test notes (`betaNotes`), honest installer build status linking to GitHub CI status, shared-read hardware checklist (`betaChecks`, readable by approved beta testers & staff, editable only by the author UID, read via `elements.namedItem('item')`), and a staff management panel (`#dash-staff-panel`).
- **Firestore rules (`firestore.rules`, `1,089` lines)**: Preserved existing Codecraft Portal & Nonprofit rules verbatim on lines `106–341`, merged non-colliding OneClick OS collections (`oneclick_reports`, `oneclickStaff`, `betaTesters`, `supportInvites`, `supportAccountMeta`, `supportRateLimits`, `supportReports` + `votes`/`replies`, `supportFlags`, `betaPosts` + `replies`, `betaNotes`, `betaChecks`), enforced immutable author/timestamp/team flags, email-rejection regexes, 10-second rate limits, and staff-only moderation/beta management. Verified with `19/19` passing tests across `8` suites against Firebase Auth & Firestore emulators (`tests/firestore-rules/rules.test.mjs`).
- **Simplest choices made where open**:
  - Reused vanilla JS + CDN Firebase JS SDK v11.6.0 (`firebase-app.js`, `firebase-auth.js`, `firebase-firestore.js`) in `support.js` and `dash.js` instead of introducing a JS bundler or new Cloud Functions (keeping `functions/index.js` untouched).
  - Used client-side `redact()` + Firestore rule field/length/email checks + `supportFlags` + 10-second `supportRateLimits` + staff `hidden` moderation rather than pre-approval queues for new accounts.
  - Seeded live `supportInvites/BETA2026` cleanly via Firestore REST API using the active Firebase CLI OAuth session after `tools/manage-beta-testers.mjs` hit missing local ADC (`Error: Could not load the default credentials.`).

---

## Verification Matrix (Observed vs Code-Only)

### 1. Verified on screen (visual inspection of all `19` screenshots in `docs/antigravity/reports/shots/` on the final `141`-article / Task-4 build)

**Directly inspected screenshots (`10` PNGs):**
- [support-home-desktop-story-light.png](shots/support-home-desktop-story-light.png) & [support-home-desktop-classic-dark.png](shots/support-home-desktop-classic-dark.png): Final `141`-article home page (`Plain answers for people coming from Windows. 141 guides, no jargon.`) rendering all `8` category cards with exact guide counts (`17`, `22`, `20`, `13`, `21`, `13`, `15`, `20`) in Storybook light and Classic dark.
- [support-home-phone-375-menu.png](shots/support-home-phone-375-menu.png): `375px` mobile navigation drawer (`Guides`, `Search`, `Reports`, `Beta`, `Account`, `Main site`) on the final `141`-article build without horizontal overflow.
- [support-category-desktop-story.png](shots/support-category-desktop-story.png): `/getting-started` showing `part 01 Getting started`, all `17` numbered guides (`01`–`17`), and `OTHER TOPICS` navigation.
- [support-article-desktop-story.png](shots/support-article-desktop-story.png): `How updates work` showing left sticky TOC (`ON THIS PAGE` + `MORE IN UPDATES AND SAFETY`), numbered `Press Check now` checklist (`Tick each step as you go`), `Updates to receive` (`Full`, `Security only`), and `TOPIC` / `NEXT` navigation cards.
- [support-account-desktop-story.png](shots/support-account-desktop-story.png) & [support-account-signup-desktop-story.png](shots/support-account-signup-desktop-story.png): `/account` Log in and Create an account tabs, Google buttons (`Log in with Google`, `Create account with Google`), `OPEN_SIGNUPS = false` banner, Invite code field, and separate-sign-in note.
- [dash-home-desktop-story-light.png](shots/dash-home-desktop-story-light.png) & [dash-signedin-desktop-story.png](shots/dash-signedin-desktop-story.png): Signed-out auth gate (`Log in with Google`, email/password, email link) and signed-in workspace (`Alice Tester` / `BETA TESTER`, manual `0.1.0-test` OS version, honest installer build status card, `New team replies`, saved `WI-FI (0.1.0-test)` checklist entry).
- [support-reports-desktop-story-light.png](shots/support-reports-desktop-story-light.png): `/reports` signed-in thread view showing `ONECLICK TEAM` staff badge, `TEAM REPLIED` & `LOOKING` badges, client redaction (`/Users/[user]`, `[email removed]`, `[address removed]`), `Same problem for me (2)`, staff status/hide controls, and public warning callout.

**Additional Brief-03 browser captures (`9` PNGs in `docs/antigravity/reports/shots/`, captured and verified by `tester` on the final `141`-article / Task-4 build):**
- `support-home-desktop-story-dark.png`, `support-home-desktop-classic-light.png`, `support-home-phone-375-story.png`, `support-article-phone-375.png`, `support-reports-phone-375.png`, `support-account-phone-375.png`, `support-beta-desktop-story.png`, `dash-home-desktop-story-dark.png`, `dash-home-phone-375.png`.

### 2. Verified via CLI, Emulator, Live Hosting & REST API

| Check | Command / Target | Result |
| --- | --- | --- |
| Build & strict word/link validation | `python3 support/build.py --strict-counts` | Exit `0` — `141` articles in `8` categories (`219–519` words, `46,495` words total), `0` out-of-range, `0` broken links |
| Client JS syntax | `node --check support/static/support.js && node --check dash/public/dash.js` | Exit `0` |
| Firestore security rules suite | `firebase emulators:exec --project codecraft-sol --only auth,firestore "cd tests/firestore-rules && npm test"` | Exit `0` — `19/19` tests passed across `8` suites (`0` failed, `0` skipped) |
| Local VM preview mirror | `GET http://localhost:5621/account` | HTTP `200`, verified `#acc-tab-login`, `#acc-tab-signup`, `#acc-google-login-btn`, `#acc-google-signup-btn` |
| Live rules & hosting deploys | `firebase deploy --only firestore:rules` & `--only hosting:oneclick-support,hosting:oneclick-dash` | Exit `0` — `codecraft-sol` rules released; `oneclick-support` (`173` files) & `oneclick-dash` (`18` files) released |
| Live Hosting HTTPS checks | `GET https://oneclick-support.web.app/account` & `GET https://oneclick-dash.web.app/` | HTTP `200` on both, verified new tabs and Google Sign-In buttons served live |
| Live `supportInvites/BETA2026` seed | Firestore REST v1 `POST` + read-back `GET` on `codecraft-sol` | HTTP `200` on `POST` and `GET`; verified `active: true`, `maxUses: 50`, `uses: 0` |
| Live Auth config inspection (read-only) | Identity Toolkit v2 `GET .../config` & `.../defaultSupportedIdpConfigs` | HTTP `200`; verified `google.com` enabled and identified missing OneClick `authorizedDomains` |

### 3. Code-verified / pending owner console & DNS setup

- Live Google Sign-In popups (`signInWithPopup`, `reauthenticateWithPopup`), live Email-Link email delivery, and live custom-domain routing (`support.oneclickos.org`, `dash.betatesters.oneclickos.org`) are implemented and syntax/emulator-verified, and await the owner's Firebase Authentication Authorized Domains + custom domain DNS steps above before live browser execution.
- `tools/manage-beta-testers.mjs` CLI logic was checked by inspection; running it locally against live `codecraft-sol` exited `1` (`Error: Could not load the default credentials.`) because no service-account JSON / ADC is set up on this machine.

---

## Full Article Index (All 141 Articles)

### 1. Getting started (`getting-started`, 17 articles)

- `/getting-started/what-is-oneclick-os` — **What OneClick OS is** (387 words)
- `/getting-started/try-it-first` — **Try it in your browser before installing** (246 words)
- `/getting-started/what-you-need` — **What you need before you start** (324 words)
- `/getting-started/is-my-pc-supported` — **Will it run on my PC** (285 words)
- `/getting-started/back-up-first` — **Back up your files before installing** (293 words)
- `/getting-started/get-the-installer` — **Get the installer** (283 words)
- `/getting-started/make-the-installer-usb` — **Put the installer on a USB stick** (312 words)
- `/getting-started/start-from-usb` — **Start your PC from the USB stick** (350 words)
- `/getting-started/install-on-a-pc` — **Install OneClick OS on a PC** (340 words)
- `/getting-started/dual-boot-with-windows` — **Keep Windows and install OneClick beside it** (356 words)
- `/getting-started/choose-at-startup` — **Choose Windows or OneClick at start-up** (315 words)
- `/getting-started/first-run-setup` — **First-time setup, page by page** (323 words)
- `/getting-started/welcome-tour` — **The welcome tour** (314 words)
- `/getting-started/choose-starter-apps` — **Choose your starter apps** (347 words)
- `/getting-started/nvidia-version` — **Which version for Nvidia graphics** (307 words)
- `/getting-started/remove-oneclick` — **Remove OneClick OS and go back to Windows** (379 words)
- `/getting-started/test-version` — **What "early test version" means** (376 words)

### 2. Using the desktop (`desktop`, 22 articles)

- `/desktop/desktop-tour` — **A tour of the desktop** (280 words)
- `/desktop/start-menu` — **The Start menu** (291 words)
- `/desktop/search` — **Search for apps, files and settings** (252 words)
- `/desktop/pin-apps` — **Pin apps to Start and the taskbar** (278 words)
- `/desktop/taskbar` — **The taskbar** (299 words)
- `/desktop/taskbar-settings` — **Change how the taskbar behaves** (302 words)
- `/desktop/system-tray` — **The clock and icons in the corner** (291 words)
- `/desktop/windows-and-buttons` — **Move, resize and close windows** (248 words)
- `/desktop/snap-windows` — **Snap windows side by side** (263 words)
- `/desktop/virtual-desktops` — **Use more than one desktop** (280 words)
- `/desktop/show-desktop` — **Get back to the desktop quickly** (237 words)
- `/desktop/files` — **Find and manage your files** (337 words)
- `/desktop/external-drives` — **USB sticks and external drives** (322 words)
- `/desktop/notifications` — **Notifications** (302 words)
- `/desktop/screenshots` — **Take a screenshot** (268 words)
- `/desktop/task-manager` — **Task Manager** (321 words)
- `/desktop/keyboard-shortcuts` — **Keyboard shortcuts** (278 words)
- `/desktop/look-windows-or-mac` — **Switch between Windows style and Mac style** (318 words)
- `/desktop/mac-style` — **Using Mac style** (356 words)
- `/desktop/wallpaper` — **Change the wallpaper** (274 words)
- `/desktop/animations` — **Turn animations down or off** (273 words)
- `/desktop/lock-sign-out-shut-down` — **Lock, sign out, restart and shut down** (285 words)

### 3. Apps (`apps`, 20 articles)

- `/apps/install-apps` — **Install apps from the App Store** (262 words)
- `/apps/remove-apps` — **Remove an app** (230 words)
- `/apps/update-apps` — **Update your apps** (258 words)
- `/apps/where-apps-come-from` — **Where apps come from and whether they are safe** (337 words)
- `/apps/app-not-in-store` — **An app I need is not in the App Store** (326 words)
- `/apps/libreoffice` — **Open and edit Word, Excel and PowerPoint files** (344 words)
- `/apps/office-on-the-web` — **Use Microsoft Office on the web** (267 words)
- `/apps/onedrive` — **Connect OneDrive** (341 words)
- `/apps/google-drive` — **Connect Google Drive** (358 words)
- `/apps/windows-programs` — **Run Windows programs** (373 words)
- `/apps/bottles` — **Set up Bottles for Windows programs** (335 words)
- `/apps/web-browser` — **Your web browser** (312 words)
- `/apps/email-and-calendar` — **Email and calendar** (318 words)
- `/apps/claude-and-chatgpt` — **The Claude and ChatGPT shortcuts** (261 words)
- `/apps/music-and-video` — **Play music and video** (302 words)
- `/apps/photos` — **View and edit photos** (295 words)
- `/apps/pdf` — **Open, sign and print PDFs** (392 words)
- `/apps/zip-files` — **Zip and unzip files** (346 words)
- `/apps/default-apps` — **Choose which app opens a file** (339 words)
- `/apps/terminal` — **The Terminal, and why you do not need it** (368 words)

### 4. Gaming (`gaming`, 13 articles)

- `/gaming/gaming-overview` — **Gaming on OneClick OS** (344 words)
- `/gaming/steam` — **Set up Steam** (340 words)
- `/gaming/windows-games-on-steam` — **Play Windows games through Steam** (345 words)
- `/gaming/which-games-work` — **Which games work and which do not** (361 words)
- `/gaming/anti-cheat` — **Why some online games will not run** (342 words)
- `/gaming/check-a-game` — **Check a game before you buy it** (354 words)
- `/gaming/geforce-now` — **GeForce NOW** (348 words)
- `/gaming/xbox-cloud-gaming` — **Xbox Cloud Gaming** (341 words)
- `/gaming/controllers` — **Controllers** (405 words)
- `/gaming/epic-gog-and-others` — **Epic, GOG and other game stores** (383 words)
- `/gaming/game-performance` — **Get better performance in games** (453 words)
- `/gaming/nvidia-graphics` — **Nvidia graphics** (401 words)
- `/gaming/game-wont-start` — **A game will not start** (455 words)

### 5. Settings and hardware (`settings`, 21 articles)

- `/settings/open-settings` — **Open Settings and find a setting** (314 words)
- `/settings/wifi` — **Connect to Wi-Fi** (219 words)
- `/settings/wired-and-vpn` — **Wired internet and VPN** (276 words)
- `/settings/bluetooth` — **Bluetooth devices** (237 words)
- `/settings/displays` — **Screens, resolution and second monitors** (281 words)
- `/settings/text-size` — **Make text and everything bigger** (265 words)
- `/settings/night-light-and-dark-mode` — **Dark mode and night light** (240 words)
- `/settings/sound` — **Sound, speakers and microphones** (263 words)
- `/settings/printers` — **Add a printer** (269 words)
- `/settings/scanners` — **Scan a document** (304 words)
- `/settings/keyboard-and-language` — **Keyboard layout and language** (254 words)
- `/settings/mouse-and-touchpad` — **Mouse and touchpad** (288 words)
- `/settings/date-and-time` — **Date, time and time zone** (265 words)
- `/settings/users` — **Add another person to this PC** (274 words)
- `/settings/password` — **Change your password** (279 words)
- `/settings/power-and-battery` — **Power, sleep and battery** (284 words)
- `/settings/storage` — **See what is using your disk space** (285 words)
- `/settings/privacy` — **Privacy settings** (330 words)
- `/settings/about-this-pc` — **About This PC** (275 words)
- `/settings/cloud-drives-page` — **The Cloud Drives page** (320 words)
- `/settings/windows-apps-page` — **The Windows Apps page** (310 words)

### 6. Updates and safety (`updates`, 13 articles)

- `/updates/how-updates-work` — **How updates work** (253 words)
- `/updates/undo-an-update` — **Undo an update** (273 words)
- `/updates/full-or-security` — **Full updates or security fixes only** (334 words)
- `/updates/previous-versions` — **Go back to an earlier version** (354 words)
- `/updates/update-and-restart` — **Download now, restart later** (346 words)
- `/updates/update-failed` — **An update will not download or finish** (381 words)
- `/updates/why-no-forced-updates` — **Why OneClick never forces an update** (315 words)
- `/updates/how-often` — **How often updates come out** (312 words)
- `/updates/what-oneclick-never-does` — **What OneClick never does** (365 words)
- `/updates/back-up-your-files` — **Back up your files** (349 words)
- `/updates/viruses-and-security` — **Viruses and staying safe** (375 words)
- `/updates/firewall` — **The firewall** (366 words)
- `/updates/disk-encryption` — **Protect your files if the PC is lost** (411 words)

### 7. Coming from Windows (`windows`, 15 articles)

- `/windows/windows-to-oneclick` — **Where things went: a Windows to OneClick list** (297 words)
- `/windows/what-is-different` — **What is different from Windows** (389 words)
- `/windows/move-your-files` — **Move your files from Windows** (368 words)
- `/windows/read-windows-drives` — **Open your Windows drive from OneClick** (371 words)
- `/windows/move-browser` — **Move bookmarks and passwords** (396 words)
- `/windows/what-does-not-work` — **What does not work, and what to use instead** (377 words)
- `/windows/adobe` — **Photoshop and other Adobe apps** (307 words)
- `/windows/microsoft-office` — **Microsoft Office** (364 words)
- `/windows/itunes-and-iphone` — **iPhone, iTunes and iCloud** (393 words)
- `/windows/drive-letters` — **Where is the C drive** (317 words)
- `/windows/installing-is-different` — **Why you do not download installers from websites** (394 words)
- `/windows/control-panel` — **Where Control Panel and Device Manager went** (328 words)
- `/windows/drivers` — **Do I need to install drivers** (377 words)
- `/windows/antivirus` — **Do I need antivirus** (389 words)
- `/windows/word-list` — **Words you will see, in plain English** (519 words)

### 8. Fixing problems (`troubleshooting`, 20 articles)

- `/troubleshooting/wont-start` — **The PC will not start OneClick OS** (359 words)
- `/troubleshooting/black-screen` — **Black screen after starting** (345 words)
- `/troubleshooting/stuck-on-logo` — **Stuck on the OneClick logo** (332 words)
- `/troubleshooting/no-wifi` — **Wi-Fi is missing or will not connect** (370 words)
- `/troubleshooting/no-sound` — **No sound** (346 words)
- `/troubleshooting/screen-wrong-size` — **The screen is the wrong size or blurry** (357 words)
- `/troubleshooting/app-crashed` — **An app closed unexpectedly** (364 words)
- `/troubleshooting/app-wont-open` — **An app will not open** (326 words)
- `/troubleshooting/frozen` — **The screen is frozen** (396 words)
- `/troubleshooting/slow` — **The PC feels slow** (348 words)
- `/troubleshooting/out-of-space` — **The disk is full** (358 words)
- `/troubleshooting/forgot-password` — **I forgot my password** (420 words)
- `/troubleshooting/taskbar-missing` — **The taskbar has disappeared** (357 words)
- `/troubleshooting/printer-not-working` — **The printer is not working** (394 words)
- `/troubleshooting/bluetooth-not-working` — **Bluetooth will not connect** (366 words)
- `/troubleshooting/usb-not-showing` — **A USB drive does not show up** (447 words)
- `/troubleshooting/windows-missing-from-startup` — **Windows is missing from the start-up list** (418 words)
- `/troubleshooting/clock-wrong-after-windows` — **The clock is wrong after using Windows** (409 words)
- `/troubleshooting/report-a-problem` — **Report a problem** (393 words)
- `/troubleshooting/get-details-for-a-report` — **Find the details we ask for in a report** (410 words)
