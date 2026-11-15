title: Which version for Nvidia graphics
summary: There are two versions of OneClick OS. Pick the Nvidia one only if your PC has an Nvidia graphics card.
order: 150
---
> Warning: The installer is not available yet. This page explains the choice you will make on the Download page.

The [Download page](https://oneclickos.org/download) offers two versions:

- **Most PCs**, for Intel or AMD graphics. Choose this if you are not sure.
- **PCs with Nvidia graphics**, for gaming PCs and laptops with an Nvidia card.

They are the same system. The Nvidia version comes with Nvidia's own graphics driver already in place, so there is nothing to download or install afterwards.

## Check which graphics you have

In Windows:

1. Press **Ctrl+Shift+Esc** to open Task Manager.
2. Choose **Performance**.
3. Look at the entries named **GPU**. The name of each graphics chip is shown at the top right when you click it.

Or right-click the Windows Start button, choose **Device Manager**, and open **Display adapters**.

## Which to pick

| What you see | Version |
|---|---|
| Only Intel | Most PCs |
| Only AMD or Radeon | Most PCs |
| Nvidia, GeForce, RTX or GTX | PCs with Nvidia graphics |
| Intel or AMD, and also Nvidia | PCs with Nvidia graphics |

Many gaming laptops have two graphics chips, one of them Nvidia. Those need the Nvidia version.

## Things to know

- Very old Nvidia cards may not be supported by the current Nvidia driver. We have not tested which ones. If yours is many years old, expect that it may not work well, and please [report](https://oneclickos.org/report) what you find.
- Nothing has been tested on real Nvidia PCs yet. This is an early test version.
- A sticker on a laptop is not proof. Check in Windows as described above.

## If you picked the wrong one

The system may still start, but graphics may be slow or games may not run properly. The dependable fix for now is to install the other version. Back up your files first.

More about Nvidia after installing is in [Nvidia graphics](/gaming/nvidia-graphics).
