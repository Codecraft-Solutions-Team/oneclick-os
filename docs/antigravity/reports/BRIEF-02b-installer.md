# Brief 02b Report: PC Installer (`anaconda-iso`) Fix and Builds

Summary of work completed for `docs/antigravity/mailbox/to-antigravity/0002-pc-installer-build.md` in `.github/workflows/build-disk.yml`, `.github/workflows/build.yml`, and `disk_config/raw.toml`.

---

## Needs the owner

1. **Download or publish the `.iso` artifacts before 3-day expiry**:
   - `.github/workflows/build-disk.yml` sets `retention-days: 3`.
   - `oneclick-os-anaconda-iso` (Run `43698848350`) and `oneclick-os-nvidia-anaconda-iso` (Run `43700123729`) are available now as GitHub Actions artifacts for 3 days. Extract the downloaded artifact archive to get `install.iso`.
2. **Test-boot on physical x86_64 hardware**:
   - Both installer ISOs compiled, generated `install.iso`, and uploaded cleanly on CI; booting on a real PC (such as the ThinkPad) has not yet been tested physically.
   - Note that `disk_config/iso.toml` runs `bootc switch --mutate-in-place --transport registry ghcr.io/codecraft-solutions-team/<image>:latest` during installation, so the `oneclick-os` and `oneclick-os-nvidia` GHCR packages must remain Public for automatic registry switching and subsequent updates.

---

## Root Cause Analysis

Running diagnostics and inspecting the prior failed `build-disk.yml` runs (such as `43664578349` and `43664880089`) and intermediate run `43683532666` uncovered two separate root causes:

1. **Fedora 45 repository relocation & Bazzite overrides broke `bootc-image-builder` depsolving (`Manifest generation step`)**:
   - The `oneclick-os` and `oneclick-os-nvidia` base images (`bazzite:stable` / `bazzite-nvidia-open:stable`) reported `ID=bazzite`, `VERSION_ID=45`, `VARIANT_ID=bazzite` in `/usr/lib/os-release`.
   - Under Fedora 45's `Changes/RelocateRpmRepoConfigsToUsr`, standard Fedora `.repo` files (`fedora.repo`, `fedora-updates.repo`, etc.) and GPG keys no longer live in `/etc/yum.repos.d/` or `/etc/pki/rpm-gpg/` — they live under `/usr/share/dnf5/repos.d/` and `/usr/share/pki/rpm-gpg/`, while `/etc/yum.repos.d/` contained only 9 third-party COPR / `negativo17` `.repo` files and `/etc/dnf/repos.override.d/99-config_manager.repo` overrode repo enablement.
   - Because earlier workflow runs ran `sed` only on `/etc/yum.repos.d/fedora*.repo` (which did not exist) and left `$releasever` expanding to `45`, `dnf5` inside the container resolved `Fedora 45 - x86_64`, while `bootc-image-builder` failed at `Manifest generation step` with `DNF error occurred` / `missing packages: grub2-tools, shim-x64, anaconda, ...`.
2. **`--use-librepo=False` triggered single-mirror `org.osbuild.curl` timeouts (`run 43683532666`)**:
   - Once repository files, GPG keys, overrides, and `VERSION_ID=44` were fixed in `Make the installer source image`, run `43683532666` passed `Manifest generation step` (`Done generating manifest` in `16s`) with zero missing-package errors.
   - However, passing `--use-librepo=False` for `anaconda-iso` forced `osbuild` to download RPMs via `source/org.osbuild.curl` from a single pinned mirror (`cofractal-ewr.mm.fcix.net` for `updates/44`), which lacks mirrorlist failover and timed out (`Operation timed out after 30001/30002 milliseconds`) across 4,037 log entries over 44 minutes before failing.

---

## Solution Implemented

- **`.github/workflows/build-disk.yml`** (commits `6db76f3` and `c889a46`):
  - **`Make the installer source image` (`if: inputs.type == 'anaconda-iso'`)**: Uses an isolated build context (`/tmp/installer-ctx`) with `prep_installer.py` to:
    1. Print diagnostics for `/usr/lib/os-release`, repo directories, override directories, GPG key directories, and `/usr/lib/bootc/install`.
    2. Copy `fedora*.repo` from `/usr/share/dnf5/repos.d/` (and `/usr/lib/yum.repos.d/` fallback) into `/etc/yum.repos.d/` and copy `/usr/share/pki/rpm-gpg/*` into `/etc/pki/rpm-gpg/` (preserving symlinks).
    3. Remove override files in `/etc/dnf/repos.override.d/` and `/usr/share/dnf5/repos.override.d/`.
    4. Set `/etc/dnf/vars/releasever` to `44` and update `/usr/lib/os-release` to `ID=fedora`, `VERSION_ID=44`, `VARIANT_ID=silverblue`.
    5. Use a section-aware Python `.repo` rewriter across `/etc/yum.repos.d` and `/usr/share/dnf5/repos.d` to pin `$releasever` to `44`, enable only `[fedora]` and `[updates]`, and explicitly set `enabled=0` across all non-Fedora third-party `.repo` files (inserting `enabled=0` when omitted).
    6. Verify live Fedora 44 metadata and installer packages via `dnf5 makecache`, `dnf5 repolist --enabled`, and `dnf5 repoquery --repo=fedora --repo=updates grub2-tools shim-x64 anaconda`.
  - **`Build disk image`**:
    - Switched `LIBREPO_FLAG` to `--use-librepo=True` for `anaconda-iso` as well as `qcow2`/`raw`, restoring `librepo` mirrorlist failover during `osbuild` RPM downloads.
    - Added `raw` to `inputs.type.options` (`qcow2`, `raw`, `anaconda-iso`) and selected config cleanly with a shell `case` (`anaconda-iso` -> `disk_config/iso.toml`; `oneclick-os-preview` -> `disk_config/disk.toml`; otherwise -> `disk_config/raw.toml`).
- **`disk_config/raw.toml`** (commit `6db76f3`):
  - Added a bare-metal ready-to-boot raw disk configuration (`mountpoint = "/"`, `minsize = "24 GiB"`) with no pre-created `[[customizations.user]]` block so `plasma-setup` runs cleanly on first boot if a `raw` USB disk image is ever built as a fallback.
- **`.github/workflows/build.yml`** (commit `6db76f3`):
  - Appended `'support/**'`, `'dash/**'`, `'firestore.rules'`, `'firebase.json'`, `'tests/**'`, `'tools/**'`, `'.gitignore'`, and `'.github/workflows/build-disk.yml'` to `on.push.paths-ignore` so website/support/disk-workflow changes do not trigger full 3-image OS rebuilds.

---

## Verified CI Runs and Artifacts

Both `anaconda-iso` builds ran on commit `c889a4633880f9295f392cbc03932c02a48ebbc2` (`main`) and passed every step (`Make the installer source image`, `Build disk image`, and `Upload`):

| Image | Workflow Run | Conclusion / Duration | Artifact Name & ID | Artifact Size (ZIP) | Artifact SHA-256 |
| --- | --- | --- | --- | --- | --- |
| `oneclick-os` (AMD/Intel) | [43698848350](https://github.com/Codecraft-Solutions-Team/oneclick-os/actions/runs/43698848350) | `success` (`13m4s`) | `oneclick-os-anaconda-iso` (`14156260947`) | `6,561,746,387` bytes (~`6.11` GiB) | `5d9d14d416ab0071f0e147ca42e6815696f1a7b174611ba0385c66f317282416` |
| `oneclick-os-nvidia` (Nvidia) | [43700123729](https://github.com/Codecraft-Solutions-Team/oneclick-os/actions/runs/43700123729) | `success` (`15m8s`) | `oneclick-os-nvidia-anaconda-iso` (`14156601307`) | `7,070,647,771` bytes (~`6.59` GiB) | `8a1302f6e53950c35a25659b79b27e1d2c684b2aa65d87436f703c16740791c4` |

Additional verification observed:
- Pushing commit `c889a46` to `main` did **not** trigger `.github/workflows/build.yml` (`paths-ignore` verified live).
- Earlier commit `6db76f3` passed YAML validation (`pyyaml`), TOML validation (`tomllib` on `disk_config/raw.toml`), Python AST validation on `prep_installer.py`, and `bash -n` on workflow shell steps; commit `c889a46` also passed `pyyaml` + `bash -n` before pushing.
- **Not run separately**: `type=raw` workflow dispatch was not triggered because both `anaconda-iso` installer builds succeeded cleanly (`disk_config/raw.toml` is validated TOML and kept ready as a fallback); physical USB boot on hardware has not been run yet.

---

## Flashing and Boot Instructions

1. **Download and extract the artifact**:
   - Open the GitHub Actions run (`43698848350` for AMD/Intel PCs or `43700123729` for Nvidia PCs) -> **Artifacts** -> download `oneclick-os-anaconda-iso` or `oneclick-os-nvidia-anaconda-iso` (or via CLI: `gh run download 43698848350 -n oneclick-os-anaconda-iso`).
   - If you downloaded via browser, unzip the `.zip` archive to get `install.iso` (`gh run download` extracts the artifact contents directly).
   - *Pick `oneclick-os-nvidia-anaconda-iso` only if your PC has an Nvidia graphics card; otherwise use `oneclick-os-anaconda-iso`.*
2. **Write the `.iso` to a USB stick (8 GB or larger)**:
   - **Windows / macOS / Linux GUI**: Use **Balena Etcher** or **Fedora Media Writer** ("Select .iso file"), pick your USB stick, and flash.
   - **Windows (Rufus)**: Select the `.iso`, choose **DD Image mode** if Rufus asks (recommended for Fedora/bootc hybrid ISOs), and write.
   - **macOS / Linux terminal (`dd`)**:
     ```sh
     # Replace /dev/diskX (macOS) or /dev/sdX (Linux) with your USB device carefully.
     sudo dd if=install.iso of=/dev/sdX bs=4M status=progress oflag=sync
     ```
     (On macOS, unmount the USB first with `diskutil unmountDisk /dev/diskX`, write to `/dev/rdiskX` with `bs=4m`, then run `diskutil eject /dev/diskX`.)
3. **Boot and install**:
   - Plug the USB stick into the PC, press the boot-menu key on power-on (often `F12` on ThinkPad/Dell, `F11`, `F9`, or `Esc`), and pick the UEFI USB entry.
   - Follow the installer steps (`Storage`, `Network`, `Time & Date`, `User Creation`) to install OneClick OS onto your drive, then remove the USB stick when asked to restart.

---

## Scope Confirmation

- `website/` and `functions/` were left completely untouched (`git status --short website/ functions/` shows only pre-existing local `website/` edits outside Job B).
- All commits on `main` (`6db76f3`, `c889a46`) were staged per-file without `git add -A`.
