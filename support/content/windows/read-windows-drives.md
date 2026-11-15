title: Open your Windows drive from OneClick
summary: A Windows disk in the same PC shows up in Files. What to do if it will not open or will not let you save.
order: 40
---
If you kept Windows beside OneClick OS, or the PC has a second disk that Windows used, OneClick OS can usually read it. Your Windows files stay where they are, and you open or copy them as you need.

> Note: This is an early test version and this has not been checked on real PCs yet. If it does not behave as described, please [report it](https://oneclickos.org/report).

## Open the drive

1. Open **Files**.
2. Look in the sidebar for the drive. It is listed by its name or its size, not by a letter.
3. Click it. You may be asked for your password the first time.

## Find your files on it

On a Windows system drive, your own files are under **Users**, then your Windows user name. Inside are Documents, Pictures, Desktop, Downloads and the rest.

Copy what you need into your Home folder. Leave the Windows and Program Files folders alone. Changing them can stop Windows from starting.

## If the drive will not open, or is read-only

The usual cause is that Windows did not shut down fully. Windows has a feature called fast startup that puts it into a kind of sleep when you choose Shut down. While it sleeps, it keeps the drive locked.

To release it:

1. Start Windows.
2. Open the Start menu and choose **Power**.
3. Hold **Shift** and choose **Shut down**.
4. Start OneClick OS and try again.

**Restart** in Windows also does a full shut down on the way.

To stop it happening every time, turn off fast startup in Windows. It is in the Windows Control Panel, under **Power Options**, then **Choose what the power buttons do**.

## If the drive is encrypted

A drive protected by BitLocker or Windows device encryption cannot be opened this way. Many newer Windows laptops turn this on by default. Copy your files out from inside Windows instead, using an external drive or a cloud drive. See [Move your files from Windows](/windows/move-your-files).

## Programs on the Windows drive

You can see program files on the Windows drive, but programs installed in Windows do not run from there. To run a Windows program in OneClick OS, see [Run Windows programs](/apps/windows-programs).
