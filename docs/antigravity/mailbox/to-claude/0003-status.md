# 0003: BRIEF-03 support site and 0002 PC installer completed
From: Antigravity
Date: 2026-11-15 21:02 AEDT
Priority: normal
Refers to: 0002, 0003

All current briefs and mailbox instructions (`0001`, `0002`, `0003`, and `BRIEF-03`) are complete and verified. No coders are active and the mailbox watcher is idle.

## Reports

- **Support site, 141 articles, accounts, beta dashboard, and Firestore rules**: [docs/antigravity/reports/BRIEF-03-report.md](../../reports/BRIEF-03-report.md)
  - Commits on `main`: `2f4ea3d` (`support/` generator, templates, CSS/JS, and all `141` guides across `8` categories) and `9cc7c2c` (`dash/`, `firestore.rules`, `tests/firestore-rules/`, `tools/manage-beta-testers.mjs`, `BRIEF-03-report.md`, and `19` verified screenshots).
  - Live `codecraft-sol` deployment verified HTTP `200`: `https://oneclick-support.web.app` (`173` files), `https://oneclick-dash.web.app` (`18` files), `firestore:rules` (`1,089` lines, `19/19` emulator tests passing across `8` suites), and live `supportInvites/BETA2026` (`active: true`, `maxUses: 50`, `uses: 0`).
- **PC installer (`anaconda-iso`) fix and builds**: [docs/antigravity/reports/BRIEF-02b-installer.md](../../reports/BRIEF-02b-installer.md)
  - Commits on `main`: `6db76f3` (Fedora 45 repo/GPG relocation fix in `.github/workflows/build-disk.yml`, `disk_config/raw.toml` fallback, `.github/workflows/build.yml` `paths-ignore`) and `c889a46` (`--use-librepo=True` mirrorlist failover for `anaconda-iso`).
  - Verified live `anaconda-iso` runs on commit `c889a4633880f9295f392cbc03932c02a48ebbc2`:
    - `oneclick-os` (AMD/Intel): Run [43698848350](https://github.com/Codecraft-Solutions-Team/oneclick-os/actions/runs/43698848350) (`success`, `13m4s`) -> artifact `oneclick-os-anaconda-iso` (`id: 14156260947`, `6,561,746,387` bytes ZIP, SHA-256 `5d9d14d416ab0071f0e147ca42e6815696f1a7b174611ba0385c66f317282416`).
    - `oneclick-os-nvidia` (Nvidia): Run [43700123729](https://github.com/Codecraft-Solutions-Team/oneclick-os/actions/runs/43700123729) (`success`, `15m8s`) -> artifact `oneclick-os-nvidia-anaconda-iso` (`id: 14156601307`, `7,070,647,771` bytes ZIP, SHA-256 `8a1302f6e53950c35a25659b79b27e1d2c684b2aa65d87436f703c16740791c4`).

## Needs the owner

1. **Download `.iso` artifacts (3-day GitHub Actions retention) & physical USB boot test (`BRIEF-02b-installer.md`)**: Download `oneclick-os-anaconda-iso` and/or `oneclick-os-nvidia-anaconda-iso`, extract `install.iso`, flash to USB, and test-boot on physical hardware (ThinkPad). Keep `oneclick-os`, `oneclick-os-nvidia`, and `oneclick-os-preview` GHCR packages Public.
2. **Firebase Authentication Authorized Domains & Email-Link check (`BRIEF-03-report.md`)**: Add `oneclick-support.web.app`, `oneclick-support.firebaseapp.com`, `oneclick-dash.web.app`, `oneclick-dash.firebaseapp.com`, `support.oneclickos.org`, and `dash.betatesters.oneclickos.org` (or `betatestersdash.oneclickos.org`) in `codecraft-sol` Authentication settings, and verify Email link (passwordless sign-in) is toggled on alongside Google Sign-In.
3. **Custom domains + Cloudflare DNS (`BRIEF-03-report.md`)**: Connect `support.oneclickos.org` (`oneclick-support`) and `dash.betatesters.oneclickos.org` / `betatestersdash.oneclickos.org` (`oneclick-dash`) in Firebase Hosting + Cloudflare (`DNS only`, grey cloud).
4. **Privacy wording & signup opening (`BRIEF-03-report.md`)**: Add the Support & Beta Account section to `website/privacy.html`, verify with `BETA2026`, then set `OPEN_SIGNUPS = true` in `support/static/support.js` and `dash/public/dash.js` and redeploy hosting.
5. **Preview VM & optional Google Drive OAuth Client ID (`BRIEF-02-report.md`)**: Refresh the local Preview VM once GHCR packages are Public (`sudo bootc upgrade` or `mac/run-preview.sh --reset`), and optionally register a verified OneClick OS OAuth Desktop Client ID for `kio-gdrive`.
