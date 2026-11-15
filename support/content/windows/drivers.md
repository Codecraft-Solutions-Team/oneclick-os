title: Do I need to install drivers
summary: No. Drivers are built into the system and updated with it. What to do about printers, Nvidia cards and devices that do not work.
order: 130
---
No. On OneClick OS you do not download drivers from a manufacturer's website, and there is no driver disc to find. Drivers for most hardware are part of the system. They are there from the first start and are updated when you update the system.

## What is covered

- **Graphics.** Intel and AMD graphics drivers are built in. Nvidia cards need the Nvidia version of OneClick OS, which has Nvidia's driver in place already. See [Which version for Nvidia graphics](/getting-started/nvidia-version).
- **Wi-Fi, Bluetooth, sound, webcams, touchpads.** Most work without any setup.
- **Keyboards, mice, USB sticks, external drives.** Plug them in.
- **Game controllers.** Support is built in. See [Controllers](/gaming/controllers).
- **Printers and scanners.** Most modern ones are found over the network or USB. See [Add a printer](/settings/printers).

> Note: This is an early test version, tested on very few computers. "Most" is what is expected, not a promise for your PC.

## What may not work

A few devices have no driver for this system, because their makers only wrote one for Windows. Common examples:

- Some fingerprint readers.
- Some very new or unusual Wi-Fi chips.
- Maker-specific extras, such as apps for keyboard lighting, fan curves or mouse buttons.
- Some older printers and scanners.

If a device has no driver, there is usually nothing you can install to fix it.

## Do not run Windows driver installers

A driver setup file made for Windows does nothing useful here. Windows drivers cannot run on this system, even through Bottles. Do not waste time on them.

Also be careful with web guides that tell you to paste commands into the Terminal to install a driver. They are written for other systems. OneClick OS keeps its core protected, and those commands often will not work.

## How drivers get updated

They arrive with system updates. Open **Settings**, choose **Update**, and press **Check now**. See [How updates work](/updates/how-updates-work).

If a device stops working after an update, go back to the version before. See [Undo an update](/updates/undo-an-update).

## If a device is not working

1. Look for it in the troubleshooting pages, for example [Wi-Fi is missing or will not connect](/troubleshooting/no-wifi).
2. Check for a system update.
3. [Report a problem](https://oneclickos.org/report) and name the exact device. Reports are how missing hardware gets noticed.
