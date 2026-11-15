title: The clock is wrong after using Windows
summary: The two systems store the time differently. Automatic time in both keeps the clock right.
order: 180
---
On a PC that starts both Windows and OneClick OS, the clock can be wrong by several hours after you switch from one to the other. The amount is the same as the gap between your time zone and world time. In eastern Australia that is ten or eleven hours.

Nothing is broken. The two systems disagree about how to read the same clock.

## Why it happens

Every PC has a small clock inside that keeps running when the PC is off. Both systems read it when they start and write to it when they set the time.

- Windows stores your local time in that clock.
- OneClick OS stores world time in it, and works out your local time from your time zone.

So each system leaves the clock in a form the other one reads wrongly.

## The fix: automatic time in both

When each system sets its clock from the internet, it corrects itself shortly after starting, whatever the other one left behind.

In OneClick OS:

1. Open **Settings** and find the date and time page.
2. Turn on automatic time.
3. Check the time zone is right.

See [Date, time and time zone](/settings/date-and-time).

In Windows:

1. Open Windows Settings and go to the time and language section.
2. Turn on setting the time automatically.
3. Turn on setting the time zone automatically, or check the zone is right.

## What to expect afterwards

- With internet, each system corrects its clock soon after you sign in. It may show the wrong time for a few moments first.
- Without internet, the clock stays wrong until the PC is next online.
- If the time zone is wrong in either system, the clock will be wrong by a whole number of hours even with automatic time on. Check the zone first.

> Note: There are ways to make both systems store the clock the same way, but they involve changing system settings by hand. We do not recommend that here. Automatic time is enough for nearly everyone.

## If the clock is wrong on a PC without Windows

That is a different problem. Check the time zone and that automatic time is on. If the clock resets to an old date every time the PC is unplugged, the small battery inside the PC that keeps the clock running is flat. A repair shop can replace it.

If the clock is still wrong with automatic time on in both, please [report the problem](/troubleshooting/report-a-problem).
