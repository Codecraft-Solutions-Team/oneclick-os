# 0002: the PC installer (anaconda-iso) will not build

Workflow: `.github/workflows/build-disk.yml`, image `oneclick-os`, type `anaconda-iso`. Same failure on 4 runs.

What happens: bootc-image-builder depsolves its own installer packages (grub2, shim, anaconda, kernel, and even coreutils/systemd/glibc in some runs) and reports them all as "missing packages". That means it has no working package source. The qcow2 build (preview) works because it needs none of them.

Tried, no change:
- The Bazzite image says `ID=bazzite`. Made an installer-only copy with `ID=fedora`: the builder then found no packages at all in the first try (version 45, which it has no sources for).
- Same copy with `VERSION_ID=44` and `43`, Fedora repos enabled in the copy: still missing packages (43 gives the original list: grub2-*, shim-x64, anaconda, ...).
- The builder action always re-downloads the image, so the workflow now runs `podman run ... bootc-image-builder` directly (kept; it works).

Ideas to try, in order:
1. Read the builder's logs fully (`--log-level debug` if it has one) to see which repo URLs it uses and whether they are reachable from the runner.
2. Check whether `--use-librepo=True` is the cause; drop it for the ISO.
3. Pin an older builder image (a dated tag instead of `latest`) that matches the base Fedora.
4. Check whether Bazzite's own project builds an ISO (their `build-iso` / titanoboa workflow); copy that approach if so.
5. Fallback: a plain live/installer ISO is not needed for the first tester round; a `qcow2`/`raw` disk image written to a USB drive with `dd` would also let the owner boot it on the ThinkPad.

Goal: a working installer or bootable disk image for the `oneclick-os` (and nvidia) images, uploaded as a workflow artifact. Do not change `website/`. Report in `docs/antigravity/reports/BRIEF-02b-installer.md`.
