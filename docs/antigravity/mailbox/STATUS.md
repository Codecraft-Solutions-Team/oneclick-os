# Antigravity Status Board

Updated: 2026-11-15 21:02 AEDT

## Running now
- Idle (`All coders idle. Watching the mailbox.`).

## Queue
- None.

## Finished and verified
- **0001 / BRIEF-02** (`System features`): Complete and verified in `docs/antigravity/reports/BRIEF-02-report.md` (image build commit `665f6b3`, report commit `ad4ebc8`, CI run `43653809791` passed across all 4 jobs).
- **BRIEF-03** (`Support site, 141 articles, accounts, community reports, beta dashboard, Firestore rules`): Complete and verified in `docs/antigravity/reports/BRIEF-03-report.md` (commits `2f4ea3d` and `9cc7c2c`; deployed live to Firebase `codecraft-sol` Hosting `oneclick-support`, `oneclick-dash`, and `firestore:rules`).
- **0002** (`PC installer anaconda-iso build`): Complete and verified in `docs/antigravity/reports/BRIEF-02b-installer.md` (commits `6db76f3` and `c889a46`; live `anaconda-iso` builds passed in runs `43698848350` for `oneclick-os` and `43700123729` for `oneclick-os-nvidia`).
- **0003** (`Pause / resume`): Resumed by owner (`2026-11-15 15:00 AEDT`); all queued briefs and messages are now finished and reported in `docs/antigravity/mailbox/to-claude/0003-status.md`.

## Blockers
- None on Antigravity's side. Remaining rollout and hardware verification items depend on owner console/DNS/hardware steps below.

## Needs owner
1. **Installer `.iso` download & physical USB boot test (`BRIEF-02b-installer.md`)**:
   - Download GitHub Actions artifacts before the 3-day retention expiry: `oneclick-os-anaconda-iso` (Run `43698848350`, ID `14156260947`) and `oneclick-os-nvidia-anaconda-iso` (Run `43700123729`, ID `14156601307`).
   - Flash `install.iso` to USB and test-boot on physical x86_64 hardware (ThinkPad).
   - Keep `ghcr.io/codecraft-solutions-team/oneclick-os`, `oneclick-os-nvidia`, and `oneclick-os-preview` GHCR packages **Public** (`iso.toml` `bootc switch` during install and live OS updates require anonymous registry pulls).
2. **Firebase Authentication Authorized Domains & Email-Link check (`BRIEF-03-report.md`)**:
   - In Firebase Console (`codecraft-sol` -> Authentication -> Settings -> Authorized domains), add:
     - `oneclick-support.web.app`
     - `oneclick-support.firebaseapp.com`
     - `oneclick-dash.web.app`
     - `oneclick-dash.firebaseapp.com`
     - `support.oneclickos.org`
     - `dash.betatesters.oneclickos.org` (or `betatestersdash.oneclickos.org`)
   - Confirm Email/Password **Email link (passwordless sign-in)** toggle is switched on alongside Google Sign-In.
3. **Firebase Hosting Custom Domains + Cloudflare DNS (`BRIEF-03-report.md`)**:
   - Connect `support.oneclickos.org` on Hosting site `oneclick-support` and `dash.betatesters.oneclickos.org` (or fallback `betatestersdash.oneclickos.org`) on `oneclick-dash` with Cloudflare DNS set to **DNS only (grey cloud)**.
4. **Main-site privacy policy & public signup toggle (`BRIEF-03-report.md`)**:
   - Add the Support & Beta Account privacy section to `website/privacy.html`, test with live invite code `BETA2026` (`active: true`, `maxUses: 50`, `uses: 0`), and when ready flip `OPEN_SIGNUPS = true` in `support/static/support.js` and `dash/public/dash.js` + redeploy hosting.
5. **Preview VM & optional Google Drive OAuth Client ID (`BRIEF-02-report.md`)**:
   - Upgrade or regenerate the local Preview VM (`sudo bootc upgrade` or `mac/run-preview.sh --reset`) once GHCR packages are confirmed Public; optionally register a verified OneClick OS OAuth Desktop Client ID for native `kio-gdrive` sign-in.
