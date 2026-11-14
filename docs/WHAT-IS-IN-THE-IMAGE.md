# What Is in the OneClick OS Image

OneClick OS builds three bootable image variants from a single `Containerfile` and `build_files/build.sh` recipe:

| Variant | Base image | Target hardware |
|---|---|---|
| `oneclick-os` | `ghcr.io/ublue-os/bazzite:stable` | Standard PCs (AMD and Intel graphics) |
| `oneclick-os-nvidia` | Bazzite (Nvidia) | PCs with Nvidia graphics |
| `oneclick-os-preview` | Fedora Kinoite (`arm64`) | Virtual machine preview on Apple Silicon Macs |

All custom Settings pages (`settings_pages/`) and the crash dialog are compiled against the base image libraries in a throwaway build stage so no compilers ship in the final image. Every image finishes with `bootc container lint`.

---

## 1. Branding, Visual Design, and Plain Naming

- **System identity (`build_files/brand.env`, `/usr/lib/os-release`, `/etc/motd`)**: Sets display strings (`NAME="OneClick OS"`, `PRETTY_NAME="OneClick OS"`, `LOGO="oneclick-logo"`, default hostname `oneclick`, and project URLs `https://github.com/Codecraft-Solutions-Team/oneclick-os`) while keeping `ID` and `ID_LIKE` untouched for upstream driver and app compatibility. Stores the active variant, version, and image reference under `/usr/share/oneclick-variant` and `/usr/share/oneclick/`.
- **About This PC (`system_files/etc/xdg/kcm-about-distrorc`)**: Displays the OneClick logo (`/usr/share/pixmaps/oneclick-logo.svg`), OneClick OS name, version (`/usr/share/oneclick/version`), edition (`Desktop` on PCs, `Preview` on Mac VM), and project link instead of upstream distribution names and version numbers.
- **Flat dark colour scheme (`OneClickDark.colors`, `/usr/share/konsole/OneClick.colorscheme`, `OneClick.profile`)**: Navy background (`#0a1020`), panels (`#0b1224`), 1 px hairline borders (`#22304d`), teal accents (`#2dd4bf`), and white text. Terminal (`Konsole`) defaults to the matching `OneClick` profile.
- **Custom SVG icon theme (`system_files/usr/share/icons/OneClick`)**: Custom flat icons layered over `papirus-icon-theme` (gaps filled during image build via `build_files/fill_icon_gaps.py`), with `start-here` brand aliases and `kdeglobals` icon theme pinned to `OneClick`.
- **Plain, Windows-familiar naming (`build_files/build.sh`)**: Renames desktop launchers and Settings modules so everyday tools have clear names (for example: *Files*, *Terminal*, *App Store*, *Task Manager*, *Settings*, *About This PC*, *Archives*, *Disk Usage*, *Disks*, *Passwords*, *Text Editor*, *Screenshot*, *Phone Link*, and *Welcome*).

---

## 2. Custom Settings Pages (`settings_pages/`)

| Module | Page name | What it does |
|---|---|---|
| `kcm_oneclick_look` | **Look** | Switches between **Windows style** (bottom taskbar, right-side window buttons, solid panels) and **Mac style** (top menu bar, centered floating dock, left-side window buttons, blurred glass surfaces) via `/usr/bin/oneclick-apply-look`. |
| `kcm_oneclick_taskbar` | **Taskbar** | Live preview and instant toggles for taskbar auto-hide (`Always shown`, `Hide automatically while an app covers it`, `Always hidden`), floating bar mode, bottom/top edge, and size (`Small`, `Medium`, `Large`). |
| `kcm_oneclick_windows` | **Windows Apps** | Enables or disables double-clicking `.exe`/`.msi` files to launch with Bottles (`/usr/bin/oneclick-open-windows-app`) and checks/installs/opens Bottles. Clearly notes Arm limitations on the Mac preview VM. |
| `kcm_oneclick_cloud` | **Cloud Drives** | Connects OneDrive and Google Drive folder mounts using `rclone`, `fuse3`, and user systemd units so cloud drives appear directly in *Files*. |
| `kcm_oneclick_update` | **Update** | Checks for OS image updates, switches between `Full` and `Security fixes only` channels, downloads and applies updates via `pkexec` + `/usr/libexec/oneclick-update-helper` (`org.oneclick.update` polkit policy), browses earlier versions, and provides **Undo the last update** rollback. |

### Single System Updater
- Removes `plasma-discover-rpm-ostree` and stock `kcm_updates` so the *App Store* only handles Flatpak apps and never clashes with system updates in *Settings > Update*.

---

## 3. Desktop Layout, Look Switcher, and Animations

- **Default Windows style (`org.oneclick.desktop`, `/usr/bin/oneclick-apply-look windows`)**:
  - Bottom taskbar with the custom Start Menu (`org.oneclick.startmenu`), double-click to open files/folders (`SingleClick false`), solid `#0b1224` surfaces, right-side Aurorae window buttons (`__aurorae__svg__OneClick`), squash-to-taskbar minimise (`squashEnabled=true`), and bottom-right notifications.
  - Bottom-right hot corner (`ElectricBorders BottomRight ShowDesktop`) reveals the desktop as a safety net when the taskbar is hidden.
- **Mac style (`org.oneclick.mac`, `/usr/bin/oneclick-apply-look mac`)**:
  - Switches to a top application menu bar (backed by `kded6` `appmenu` auto-loaded in `kded6rc`), centered floating bottom dock, `OneClickGlass` translucent theme, `__aurorae__svg__OneClickMac` with left-side window buttons (`ButtonsOnLeft=XIA`), magic-lamp minimise (`magiclampEnabled=true`), blur and menu translucency effects (`blurEnabled=true`, `translucencyEnabled=true`), and top-right notifications.
- **Tasteful animations (`build_files/build.sh` & QML pages)**:
  - Enables subtle window open/close scaling (`scaleEnabled=true`), maximise transitions (`maximizeEnabled=true`), sliding notifications (`slidingpopupsEnabled=true`, `slidingnotificationsEnabled=true`), and launch feedback (`klaunchrc`), while disabling distracting effects (`wobblywindowsEnabled=false`, `glideEnabled=false`).
  - All QML and KWin animations respect `AnimationDurationFactor`: setting Animation speed to Instant turns animations off completely.

---

## 4. Boot, Login, Lock, and Shutdown Screens

- **Graphical boot and shutdown (`build_files/boot/plymouth/`, `10-oneclick.toml`)**:
  - Installs `plymouth-plugin-script`, sets `oneclick` as the default Plymouth theme, and rebuilds the initramfs (`dracut`) so the animated OneClick mark plays on boot and holds statically on shutdown/reboot/suspend/resume.
  - Kernel boot parameters (`quiet`, `rhgb`, `plymouth.ignore-serial-consoles`) suppress boot text even when a serial console is attached.
  - `oneclick-hide-boot-menu.service` (`/usr/libexec/oneclick-boot-menu`) hides the GRUB boot menu when OneClick OS is the only OS installed, while keeping it visible on dual-boot PCs.
- **Login and lock screens**:
  - Configures `plasma-login-manager` (`/etc/plasmalogin.conf`, `10-oneclick.conf`, `/usr/lib/plasmalogin/defaults.conf`) and lock screen (`kscreenlockerrc`) to use `org.oneclick.wallpaper` (`/usr/share/wallpapers/OneClick`) and the `OneClickDark` look.
  - Seeds `/var/lib/plasmalogin/.config/` at boot via `systemd-tmpfiles` (`/usr/lib/tmpfiles.d/oneclick-plasmalogin.conf`), automatically skipped during image build if a base variant does not ship a `plasmalogin` system user.
- **Preview VM stability**: When building `oneclick-os-preview`, masks systemd sleep/suspend/hibernate targets so macOS VMs never freeze.

---

## 5. First-Time Setup, Welcome Tour, and Default Apps

- **Streamlined first-time setup**: Trims redundant `plasma-setup` pages (`hostname`, `prepare`) while keeping **Language**, **Keyboard**, **Wi-Fi**, **Account**, **Time**, and **Completed!**.
- **Custom Welcome tour (`system_files/usr/share/plasma/plasma-welcome/`, `/usr/bin/plasma-welcome`)**: Removes `plasma-welcome-fedora` and uses a wrapper around `/usr/libexec/oneclick-plasma-welcome` so the Welcome window shows OneClick's own pages (`01-WhereThingsAre.qml`, `02-YourApps.qml`, `03-Updates.qml`, `04-ComingFromWindows.qml`).
- **User-chosen app installation (`/usr/bin/oneclick-install-chosen-apps`)**: Runs from XDG autostart at sign-in to install only the apps chosen in the Welcome tour (or queued in `/etc/oneclick/apps.list`, defaulting to `org.libreoffice.LibreOffice`) with desktop notification progress and clean exit reporting.
- **Default file associations (`system_files/etc/xdg/mimeapps.list`)**: Maps `.exe`/`.msi` files to `/usr/bin/oneclick-open-windows-app` and Office extensions (`.docx`, `.doc`, `.xlsx`, `.xls`, `.pptx`, `.ppt`, `.odt`, `.ods`, `.odp`, `.rtf`, `.csv`) to LibreOffice.
- **Optional web & cloud gaming shortcuts (`system_files/usr/share/applications/`)**: Provides desktop launchers for web apps (*Word*, *Excel*, *PowerPoint*, *ChatGPT*, *Claude*) and cloud gaming (*GeForce NOW*, *Xbox Cloud Gaming*) without installing proprietary clients automatically.

---

## 6. Crash Dialog and Zero Telemetry

- **Plain crash dialog (`settings_pages/crash/`, `/usr/libexec/oneclick-crash-dialog`)**: Symlinked over `/usr/libexec/drkonqi` and `/usr/bin/drkonqi-coredump-gui`. When an app closes unexpectedly, offers clear **Reopen**, **Copy Details**, and **Close** actions without upstream bug-tracker accounts or automatic crash uploads.
- **No telemetry (`build_files/build.sh`)**: Removes `kcm_feedback` from Settings and sets `PlasmaUserFeedback` `FeedbackLevel=0` / `Enabled=false`. No cloud accounts, tracking, or OS-level AI services are bundled.
