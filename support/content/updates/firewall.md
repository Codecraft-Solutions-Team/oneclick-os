title: The firewall
summary: What a firewall does, what OneClick OS changes about it, and where to look.
order: 120
---
A firewall decides which connections from the network are allowed to reach your PC. It mostly matters on networks you do not control, such as public Wi-Fi.

## What OneClick OS does

OneClick OS does not add its own firewall page and does not change firewall settings. Whatever the underlying system provides is left as it is.

That means this article cannot tell you for certain what is switched on on your PC. Here is how to look.

## Check on your PC

1. Open **Settings**.
2. Type `firewall` in the search box.
3. If a firewall page appears, open it. It shows whether the firewall is running and lets you change it.

If no page appears, your PC has no firewall page in Settings at the moment.

> Note: We have not finished checking the firewall on every version of OneClick OS. If you need to be certain about it, for example for work, please ask through [Report a problem](https://oneclickos.org/report) before relying on it.

## What protects you either way

- **Your home router.** On a home network, the router normally stops connections from the internet reaching your PC unless you set it up to allow them.
- **Nothing is listening unless you turn it on.** A firewall matters most when the PC offers something to the network, such as file sharing or screen sharing. If you have not turned on anything like that, there is little for an outside connection to reach.
- **Apps from the App Store.** See [Where apps come from and whether they are safe](/apps/where-apps-come-from).

## On public Wi-Fi

Whatever the firewall is doing, these habits help:

- Do not turn on file sharing or screen sharing while on a network you do not trust.
- Check that websites where you sign in show a padlock in the browser's address bar.
- Consider a VPN if you use public networks often. See [Wired internet and VPN](/settings/wired-and-vpn).

## If an app or game cannot connect

If a firewall is running, it can block a game or an app that needs other devices to reach your PC. Use the firewall page in Settings to allow it. Change only what the app's own instructions ask for.

## Related

- [Viruses and staying safe](/updates/viruses-and-security)
- [Privacy settings](/settings/privacy)
