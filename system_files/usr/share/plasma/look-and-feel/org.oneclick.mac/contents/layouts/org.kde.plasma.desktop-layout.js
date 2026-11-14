// OneClick Mac Style: thin top global menu bar + centered floating magnifying bottom dock.

// Top global menu bar
var topBar = new Panel
topBar.location = "top"
topBar.height = Math.round(gridUnit * 1.7)
topBar.floating = false
topBar.opacity = "translucent"

var start = topBar.addWidget("org.oneclick.startmenu")
start.currentConfigGroup = ["Shortcuts"]
start.writeConfig("global", "Alt+F1")

topBar.addWidget("org.kde.plasma.appmenu")
topBar.addWidget("org.kde.plasma.panelspacer")
topBar.addWidget("org.kde.plasma.systemtray")
topBar.addWidget("org.kde.plasma.digitalclock")

// Bottom centered floating magnifying dock
var dockPanel = new Panel
dockPanel.location = "bottom"
dockPanel.height = Math.round(gridUnit * 4.2)
dockPanel.floating = true
dockPanel.lengthMode = "fit"
dockPanel.alignment = "center"
dockPanel.hiding = "none"
dockPanel.opacity = "translucent"

var dock = dockPanel.addWidget("org.oneclick.dock")
dock.currentConfigGroup = ["General"]
dock.writeConfig("launchers", [
    "preferred://browser",
    "preferred://filemanager",
    "applications:org.kde.discover.desktop",
    "applications:systemsettings.desktop",
    "applications:oneclick-update.desktop"
])

// Desktop wallpaper
var allDesktops = desktops()
for (var i = 0; i < allDesktops.length; i++) {
    var d = allDesktops[i]
    d.wallpaperPlugin = "org.kde.image"
    d.currentConfigGroup = ["Wallpaper", "org.kde.image", "General"]
    d.writeConfig("Image", "file:///usr/share/wallpapers/OneClick/")
}
