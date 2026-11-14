# Brief 02 Report: System Features, Visual Checks, and Image Inventory

Summary of Tasks 1–8 from [BRIEF-02-system-features.md](../BRIEF-02-system-features.md) for **OneClick OS**. This report strictly separates items **seen on screen** in the QEMU preview VM from items **written, not seen** (built into the container images on CI or verified in isolation, awaiting the updated VM disk image).

---

## Needs the owner

1. **Make the 3 GHCR container packages Public**:
   - `ghcr.io/codecraft-solutions-team/oneclick-os`, `ghcr.io/codecraft-solutions-team/oneclick-os-nvidia`, and `ghcr.io/codecraft-solutions-team/oneclick-os-preview` currently return `unauthorized: authentication required` (`401`) on anonymous `skopeo inspect` and pulls (whereas the legacy `ghcr.io/bandarasasen183-creator/oneclick-os-preview` package is public).
   - Switch those 3 packages to **Public** under GitHub Organization/Package settings so `bootc upgrade`, `bootc switch`, and `./tools/preview/setup-vm.sh` can pull images without credentials.
2. **Google Drive OAuth Client ID for KDE Online Accounts (`kio-gdrive`)**:
   - Upstream Fedora's `/usr/share/accounts/providers/kde/google.provider` uses KDE's shared OAuth Client ID (`317066460457-...`), which Google frequently blocks with `"This app is blocked"`.
   - `kcm_oneclick_cloud` already ships a working **Direct Folder Sync** (`rclone` + `fuse3` mount) workaround so users are not blocked. If native KDE Online Accounts Google sign-in is also desired, register a verified OneClick OS OAuth Desktop Client ID in Google Cloud Console.
3. **Rebuild the local Preview VM disk (`./tools/preview/setup-vm.sh`)**:
   - Once `ghcr.io/codecraft-solutions-team/oneclick-os-preview` is public, re-run `./tools/preview/setup-vm.sh` so the preview VM base disk (currently running `44.20261113.0`) boots with the newly compiled C++ `.so` KCM plugins (`kcm_oneclick_taskbar.so`, `kcm_oneclick_windows.so`, `kcm_oneclick_cloud.so`, `kcm_oneclick_look.so`), updated `kcm_oneclick_update.so`, `/usr/libexec/oneclick-crash-dialog`, `/usr/libexec/oneclick-plasma-welcome`, and `/usr/share/plymouth/themes/oneclick/oneclick.script` natively inside immutable `/usr` rather than staged QML/user-directory overrides.

---

## Overview of Builds & Commits

- **CI image builds**: Prior green GitHub Actions run `43648170468` built all three variants (`oneclick-os`, `oneclick-os-nvidia`, and `oneclick-os-preview`) with `bootc container lint` passing.
- **Commit sequence on `main`**: `7408ac7`, `ff8e267`, `f3ee834`, `b24064a`, `bf8c384`, `3cfa958`, `96abb3c`, `ed6143c`, `d2c83a3`, `665f6b3`. (Commit `0197b98` on `website/` / `functions/` by the owner/Claude was left untouched.)
- **Image documentation**: [docs/WHAT-IS-IN-THE-IMAGE.md](../../WHAT-IS-IN-THE-IMAGE.md) documents every customization applied on top of Bazzite and Fedora Kinoite.

---

## Per-Task Breakdown

### Task 1 — Start menu on the taskbar

- **Verification status**:
  - **Seen on screen**:
    - [task1-startmenu-pinned.png](shots/task1-startmenu-pinned.png): All 13 default pins rendered in a 6x3 grid alongside the search field, All apps switch, and bottom footer (user name + Lock, Sign out, Restart, Shut down).
    - [task1-startmenu-allapps.png](shots/task1-startmenu-allapps.png): Alphabetical All apps list toggle.
    - [task1-startmenu-context.png](shots/task1-startmenu-context.png): Unclipped `"Unpin from Start"` / `"Add to taskbar"` right-click menu over Files. *Known Wayland defect:* `QQC2.Popup.Window` places `contextMenu` at the bottom-left `(9, 1489)` of `fullRoot` instead of next to the clicked tile because Wayland ignores manual `x`/`y` coordinates on unanchored sub-windows.
    - [task1-startmenu-search.png](shots/task1-startmenu-search.png): Typing `"display"` shows `"Display & Monitor"` (`Settings`) highlighted at top alongside `"Display Configuration"`, `"Touchscreen"`, `"Login Screen"`, `"X-Server"`, `"Wayland"`, `"OpenGL (GLX)"`, and `"EDID"`. *Minor runtime note:* async KRunner queries take ~5–7 s to finish rendering under software `llvmpipe`.
    - `journalctl` after fixes showed `0` `KAStatsFavoritesModel` errors and `0` `Parameter "expanded"` warnings.
  - **Written, not seen**: Immutable `/usr/share/plasma/` packaging on a freshly booted image without staged `~/.local/share` overrides (Meta shortcut + panel default depend on first-boot desktop layout initialization).
- **Simplest choices & files**:
  - Replaced broken `KAStatsFavoritesModel` with `Plasmoid.configuration.pinned` in `system_files/usr/share/plasma/plasmoids/org.oneclick.startmenu/contents/ui/main.qml`, backed by `settingsCatalog` (15 plain-named Settings entries) merged ahead of `allAppsProbe` and `Kicker.RunnerModel`, with default pins in `contents/config/main.xml` and `system_files/usr/share/plasma/look-and-feel/org.oneclick.desktop/contents/layouts/org.kde.plasma.desktop-layout.js`.
- **How others do it**:
  - Windows 11 uses a centered bottom popup with a top search field, a Pinned icon grid, a one-click A–Z "All apps" switch, right-click pinning, and a bottom user/power bar; Zorin Menu and Linux Mint's Cinnamon menu follow that same launcher-plus-power pattern with fast search filtering. macOS separates its app grid (Dock/Launchpad) from Spotlight (`Cmd+Space`), which searches apps, files, and System Settings panes from one box. **OneClick OS copies:** Windows 11's Start menu layout, right-click pinning, and ~180 ms rise-and-fade entrance combined with Spotlight/Zorin-style universal search that jumps directly to individual Settings pages.

---

### Task 2 — Our apps as Settings pages (and fixing About & Update)

- **Verification status**:
  - **Seen on screen**:
    - **About This PC**: [task2-about-real.png](shots/task2-about-real.png) (before fix, leaking `44` / `Kinoite`) -> [task2-about-fixed.png](shots/task2-about-fixed.png) (live `systemsettings kcm_about-distro` after fix displaying `OneClick OS 0.1`, `Desktop`, GitHub URL, circular teal logo, zero `44` and zero `Kinoite`).
    - **Update**: [task2-update-real.png](shots/task2-update-real.png) and [task2-update-real-done.png](shots/task2-update-real-done.png) (live `systemsettings kcm_oneclick_update` checking for updates cleanly), plus [task2-update-qml-fixed.png](shots/task2-update-qml-fixed.png) (updated QML with `"rollingback"` rollback state).
    - **Taskbar & Windows Apps**: [task2-taskbar-qml-shown2.png](shots/task2-taskbar-qml-shown2.png) (`qmlscene` check of `settings_pages/taskbar/ui/main.qml`) and [task2-windows-qml.png](shots/task2-windows-qml.png) (`qmlscene` check of `settings_pages/windows/ui/main.qml`).
  - **Written, not seen**:
    - Compiled C++ `.so` KCM plugins (`kcm_oneclick_taskbar.so`, `kcm_oneclick_windows.so`) and the updated `kcm_oneclick_update.so` rollback C++ backend (`"rollingback"` state + pkexec fallback) loaded natively inside `systemsettings` on the VM (built in CI image workflow; VM disk `44.20261113.0` awaits rebuild).
- **Simplest choices & files**:
  - Replaced standalone `oneclick-taskbar` kdialog script with `settings_pages/taskbar/` (`kcm_oneclick_taskbar`, `org.kde.plasmashell` D-Bus `evaluateScript`) and `settings_pages/windows/` (`kcm_oneclick_windows`), kept `/usr/bin/oneclick-open-windows-app` solely as the desktop `.exe`/`.msi` MIME handler, removed dead `/usr/bin/oneclick-update-helper`, updated `system_files/etc/xdg/kcm-about-distrorc` + `build_files/build.sh` (`Name`, `Version`, `Variant`, `UseOSReleaseVersion=false`, `ShowBuild=false`, `LogoPath`, `Website`, `LOGO="oneclick-logo"`), and added the dedicated `"rollingback"` state + clean `pkexec` handling in `settings_pages/update/`.
- **How others do it**:
  - Windows 11 and macOS gather personalization, About info, and OS updates inside one Settings app with deep-linkable pages (`ms-settings:` / System Settings panes), while Zorin OS (Zorin Appearance) and Linux Mint (Panel settings, `mintupdate`, `mintreport`) split those controls into separate tools. Linux Mint's Update Manager pairs clear update tiers and progress with Timeshift snapshot rollbacks, while Zorin OS handles `.exe` files via a built-in "Windows App Support" (Wine/Bottles) integration. **OneClick OS copies:** Windows 11/macOS's single-hub Settings model (`systemsettings <kcm>` deep links), a visual live taskbar preview, Zorin's simple `.exe` compatibility toggle, and Mint's explicit update-and-rollback clarity.

---

### Task 3 — Login screen and lock screen

- **Verification status**:
  - **Seen on screen**:
    - [task3-lockscreen.png](shots/task3-lockscreen.png): `kscreenlocker_greet --testing` displaying the crisp, unblurred wallpaper (`/usr/share/wallpapers/OneClick/contents/images/3840x2160.jpg`), clock, password prompt, and bottom-centered `/usr/share/oneclick/wordmark.svg` (verified by pixel crop `y=1630..1762`).
    - [desktop-44.20261113.png](shots/desktop-44.20261113.png): Default OneClick desktop wallpaper.
  - **Written, not seen**:
    - First-boot `plasmalogin` login greeter rendered before auto-login (`system_files/etc/plasmalogin.conf`, `system_files/etc/plasmalogin.conf.d/10-oneclick.conf`, `/usr/lib/plasmalogin/defaults.conf`, `/usr/share/oneclick/plasmalogin/`, and `/usr/lib/tmpfiles.d/oneclick-plasmalogin.conf`, with `build.sh` guarding `/var/lib/plasmalogin` writes via `systemd-tmpfiles` and removing `oneclick-plasmalogin.conf` when `! id plasmalogin`).
- **Simplest choices & files**:
  - Created original geometric wallpaper `org.oneclick.wallpaper` (`#0a1020` navy, `#22304d` rings, `#2dd4bf` teal accent), shared it across `kscreenlockerrc` and `plasmalogin` with `Blur=false`, and moved `/var/lib/plasmalogin/.config` creation out of `RUN` into `tmpfiles.d` so `bootc container lint` stays clean.
- **How others do it**:
  - Windows 11 and modern macOS (Sonoma/Sequoia) pair a crisp, unblurred wallpaper with a clean clock and a minimal user-name/password card, while Linux Mint's LightDM Slick Greeter similarly keeps a sharp background and quiet branding (unlike Zorin/GNOME GDM's heavily blurred dark backdrop). Both Windows 11 and macOS keep the lock screen and login screen visually unified with the same background so locking and signing in feel like one surface. **OneClick OS copies:** A crisp, unblurred wallpaper shared across login and lock screens, a clear clock, a minimal flat user/password card, and a small quiet OneClick wordmark at the bottom.

---

### Task 4 — First-run setup and welcome tour

- **Verification status**:
  - **Seen on screen**: All 4 custom Welcome Tour pages rendered in live `plasma-welcome`:
    - [task4-welcome-where.png](shots/task4-welcome-where.png) (`01-WhereThingsAre.qml`)
    - [task4-welcome-apps.png](shots/task4-welcome-apps.png) (`02-YourApps.qml` — clicked `"Gamer"` preset and verified 6 starter-app checkboxes selected)
    - [task4-welcome-updates.png](shots/task4-welcome-updates.png) (`03-Updates.qml`)
    - [task4-welcome-windows.png](shots/task4-welcome-windows.png) (`04-ComingFromWindows.qml`)
  - **Written, not seen**:
    - Pre-user `plasma-setup` OOBE pages (`system_files/usr/share/plasma/packages/org.kde.plasmasetup.{language,keyboard,account,time,wifi}` rebranded in OneClick colours; redundant `hostname` and `prepare` removed in `build.sh`, with `finished` "Completed!" preserved untouched), `/usr/bin/plasma-welcome` wrapper (`build.sh` removing `plasma-welcome-fedora` and `01-EnableExtraRepos.qml` while wrapping `/usr/libexec/oneclick-plasma-welcome`), and autostart `/usr/bin/oneclick-install-chosen-apps` installing user-chosen Flathub apps on login.
- **Simplest choices & files**:
  - Overrode `plasma-setup` pages directly under `system_files/usr/share/plasma/packages/`, wrapped `/usr/bin/plasma-welcome` to load only OneClick pages, and reused XDG autostart (`system_files/etc/xdg/autostart/oneclick-install-chosen-apps.desktop`) + `/usr/bin/oneclick-install-chosen-apps` (exiting non-zero on failure so selections are not prematurely discarded).
- **How others do it**:
  - Windows 11 and macOS run full-screen pre-desktop wizards (OOBE / Setup Assistant) for locale, account creation, and privacy—often cluttered with cloud upsells—without offering a post-login starter-app bundle picker. Zorin OS's Welcome Tour and Linux Mint's `mintwelcome` greet users on the desktop with short, friendly cards explaining layout, updates, system snapshots, and where familiar Windows workflows live. **OneClick OS copies:** A minimal, telemetry-free OOBE (`plasma-setup` pared to essentials, keeping its clean final page) followed by a Zorin/Mint-style Welcome Tour plus a curated starter-app checkbox installer.

---

### Task 5 — Office, cloud drives, and everyday gaps

- **Verification status**:
  - **Seen on screen**:
    - [task5-cloud-qml.png](shots/task5-cloud-qml.png): `qmlscene` visual verification of `settings_pages/cloud/ui/main.qml` showing OneDrive, Google Drive, and Direct Folder Sync via `rclone` / `fuse3`.
  - **Written, not seen**:
    - Compiled `kcm_oneclick_cloud.so` plugin inside `systemsettings`; preinstalled LibreOffice queue (`system_files/etc/oneclick/apps.list` with `org.libreoffice.LibreOffice`), default Office MIME associations (`system_files/etc/xdg/mimeapps.list`), Office web app launchers (`system_files/usr/share/applications/oneclick-web-{word,excel,powerpoint}.desktop`) with SVG icons (`design/make_app_icons.py`), and `oneclick-cloud-drives.desktop`. Live Google Drive Online Accounts (`kio-gdrive`) requires a OneClick OAuth Client ID (see *Needs the owner*), whereas `rclone` Direct Folder Sync requires no upstream KDE OAuth credentials.
- **Simplest choices & files**:
  - Bundled `rclone` + `fuse3` in `build.sh` paired with user systemd mount units inside `settings_pages/cloud/cloudmodule.cpp` (giving zero-terminal folder mounts in Files for both OneDrive and Google Drive alongside Online Accounts detection), queued `org.libreoffice.LibreOffice` via `apps.list`, and mapped Office document types in `mimeapps.list`.
- **How others do it**:
  - Zorin OS and Linux Mint preinstall LibreOffice with `.docx`/`.xlsx`/`.pptx` defaults and wrap sites like Microsoft 365 into standalone desktop shortcuts (Zorin Web Apps / Mint `webapp-manager`), whereas Windows 11 and macOS nudge users toward proprietary suites. For cloud storage, Windows 11 (OneDrive) and macOS (iCloud Drive) mount cloud drives directly inside the file manager on demand without a terminal, and Zorin OS 18 integrates both Google Drive and OneDrive into Files via Online Accounts. **OneClick OS copies:** Preinstalled LibreOffice document defaults and zero-terminal Office web-app shortcuts, paired with zero-terminal cloud folders in Files (Online Accounts for Google Drive and a GUI-configured on-demand mount for OneDrive).

---

### Task 6 — Crash window and shutdown

- **Verification status**:
  - **Seen on screen**:
    - [task6-crash-dialog.png](shots/task6-crash-dialog.png): `CrashDialog.qml` rendered live on KWin Wayland in the VM showing `"Text Editor closed unexpectedly."`, expanded `h=460` details area with `"Details for developers"`, `"Copy Details"`, `"Close"`, and `"Reopen"`, verified across 3 expand/collapse cycles (`WAYLAND_CRASH_DIALOG_ALL_CYCLES_PASSED` with `grab=1100x1012`, `details=436x232`, zero clipping, and zero QML warnings).
  - **Written, not seen**:
    - Compiled `/usr/libexec/oneclick-crash-dialog` binary + `drkonqi`/`drkonqi-coredump-gui` symlinks in `build.sh`, and `build_files/boot/plymouth/oneclick.script` (`Plymouth.GetMode()` holding static `frame-093.png` with `#000000` background on `shutdown`/`reboot`/`suspend`/`resume` inside the rebuilt dracut initramfs, which requires booting the rebuilt CI image).
- **Simplest choices & files**:
  - Built standalone QtQuick executable `settings_pages/crash/` (`oneclick-crash-dialog`) instead of patching DrKonqi, kept top-level `Window` resize synchronous (`minimumHeight = maximumHeight = height = targetHeight`) to avoid Wayland `xdg_toplevel` configure races, and added static mode branching in `build_files/boot/plymouth/oneclick.script`.
- **How others do it**:
  - When an app crashes, macOS shows a plain "`<App>` quit unexpectedly" alert with Reopen/Ignore and hides technical logs behind a secondary Report button, while Linux Mint routes crash traces quietly into System Reports (`mintreport`) and Windows closes/restarts quietly via WER. On shutdown, Windows 11 (solid screen + spinner) and macOS (clean fade) hide all internals, while Zorin OS and Linux Mint use Plymouth to cover systemd shutdown text with a centered distro graphic. **OneClick OS copies:** macOS's calm plain-English crash dialog ("`<App>` closed unexpectedly" with Reopen/Close and dev details hidden behind a link) and a clean static Plymouth wordmark on shutdown with zero scrolling text.

---

### Task 7 — Animations

- **Verification status**:
  - **Seen on screen**:
    - Exercised indirectly while testing `org.oneclick.startmenu`, Welcome Tour pages, and Mode switch in the VM (`journalctl` showed zero KWin/Plasma errors and zero `dockHeight`/animation warnings in `plasmashell` after `ed6143c` + `d2c83a3`). Motion curves themselves are code-verified and runtime-exercised rather than captured as video, since screenshots are still frames.
  - **Written, not seen**:
    - KWin open/close/minimize/slide defaults in `build_files/build.sh` (`kwinrc`, `klaunchrc`, `plasmanotifyrc`, `AnimationDurationFactor=1`), plus QML hover/press/stagger transitions across `org.oneclick.startmenu`, `org.oneclick.dock`, `org.kde.plasmasetup.*`, `plasma-welcome/extra-pages/*.qml`, and all 5 `settings_pages/*/ui/main.qml` files scaled via `Kirigami.Units.longDuration` / `shortDuration` (disabled when `AnimationDurationFactor=0` / reduced motion). `CrashDialog.qml` intentionally omits height/opacity animations so Wayland `Qt.Dialog` resizing remains deterministic.
- **Simplest choices & files**:
  - Tuned built-in KWin C++ effects (`scale`, `squash`, `maximize`, `slidingpopups`) in `build.sh` with `wobblywindowsEnabled=false` and `glideEnabled=false`, and gated QML `Behavior`s on `Kirigami.Units.longDuration > 0`.
- **How others do it**:
  - Windows 11 and macOS apply restrained physics—snappy scale-and-fade window open/close, minimize-to-icon targeting, maximize snap easing, taskbar/dock launch feedback, and right-side toast slide-ins—while honoring system-wide "Animation effects" / "Reduce motion" toggles. Zorin OS and Linux Mint keep window and panel transitions brisk and optional (with Zorin adding an optional Jelly Mode and Cinnamon offering clean toggleable effects). **OneClick OS copies:** Tasteful Fluent/macOS-style micro-animations (scale-fade windows, subtle taskbar bounce and active-indicator slide, right-edge toast notifications, and eased list/hover states) tied directly to system animation-speed and reduced-motion settings.

---

### Task 8 — macOS mode switch

- **Verification status**:
  - **Seen on screen**:
    - [task8-look-qml.png](shots/task8-look-qml.png): `qmlscene` visual verification of `settings_pages/look/ui/main.qml` rendering the two preview cards ("Windows style" and "Mac style").
    - [task8-mac-mode.png](shots/task8-mac-mode.png): Live `oneclick-apply-look mac` in the VM showing Dolphin with original `OneClickMac` left traffic-light buttons, top `OneClickGlass` translucent menu bar/panel, and centered magnifying bottom `org.oneclick.dock`. Switched cleanly back to `windows` mode afterwards with `0` `dockHeight`/binding-loop/QML errors in `journalctl`.
  - **Written, not seen**:
    - Compiled `kcm_oneclick_look.so` plugin inside `systemsettings` awaiting VM disk rebuild (`oneclick-apply-look --config-only` was also verified in isolation via `kreadconfig6`).
- **Simplest choices & files**:
  - Added asset generators `design/make_glass_theme.py` and `design/make_mac_window_frame.py`, original assets in `system_files/usr/share/aurorae/themes/OneClickMac/`, `system_files/usr/share/plasma/desktoptheme/OneClickGlass/`, `system_files/usr/share/plasma/look-and-feel/org.oneclick.mac/`, `system_files/usr/share/plasma/plasmoids/org.oneclick.dock/`, CLI switcher `system_files/usr/bin/oneclick-apply-look` (`windows` | `mac` | `--status` | `--config-only`, detecting `org.kde.kwin.aurorae.v2` dynamically and applying overrides after `plasma-apply-lookandfeel --resetLayout`), and `settings_pages/look/` (`kcm_oneclick_look`). Zero macOS trademarks or Apple artwork are used.
- **How others do it**:
  - macOS defines the pattern—a top global menu bar with right-side tray, a centered floating magnifying bottom dock, left-side colored circle window controls, translucent blurred menus/panels, and genie minimize—while Windows 11 and Linux Mint stay single-paradigm out of the box. Zorin OS (Pro) uniquely provides a true one-click whole-desktop switcher in Zorin Appearance, including a macOS preset that swaps panel position, global menu, dock, and left-side window buttons together. **OneClick OS copies:** Zorin Appearance's one-click full-layout switch presented via two large preview cards ("Windows style" and "Mac style") that swap panel/dock layout, global menu, left traffic-light buttons, blur, and genie effects with original OneClick artwork.

---

## Task 9 — Leave for a later brief (Thoughts only — not started)

- **Our own Settings app**: Wrap KDE's reliable hardware, network, power, and audio KCM backends inside a cohesive QML/Kirigami shell alongside OneClick's custom KCMs, using plain Windows-familiar headings and descriptions with zero KDE/Plasma jargon.
- **Restyled App Store**: Keep Discover / Flatpak / AppStream underneath for sandboxed installs and safe permissions, fronted by a curated UI geared toward Windows switchers (plain functional categories such as "Video Editor" or "Word Processor" without exposing RPM-vs-Flatpak plumbing).
- **Windows migration tool**: Follow macOS Migration Assistant—mount a local Windows NTFS partition (`ntfs3`) or user-chosen backup folder to copy `Desktop`, `Documents`, `Pictures`, `Downloads`, `Music`, and `Videos` plus browser bookmarks with simple folder checkboxes and free-space checks, optionally mapping common installed Windows app names to native Flathub equivalents or Bottles.
- **"Will my games work" check**: Query ProtonDB ratings and AreWeAntiCheatYet compatibility status (via a bundled offline index or opt-in lookup) to give plain traffic-light verdicts ("Runs great", "Needs tweaks", "Blocked by kernel anti-cheat") from either manual game search or scanning local Steam libraries, reinforcing the *Coming from Windows* guidance built in Task 4.
