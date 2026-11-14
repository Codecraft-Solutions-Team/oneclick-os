// OneClick start menu: search at the top, pinned apps in a grid, an "All apps" list
// one click away, and the user account and power buttons at the bottom.
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import org.kde.plasma.components as PC3
import org.kde.plasma.plasma5support as P5Support
import org.kde.plasma.private.kicker as Kicker
import org.kde.kirigami as Kirigami
import org.kde.ksvg as KSvg

PlasmoidItem {
    id: root

    property bool showAll: false
    property string query: ""
    property int openCounter: 0
    property int appsRevision: 0
    property int runnerRevision: 0

    readonly property color bgNavy: "#0a1020"
    readonly property color bgPanel: "#0b1224"
    readonly property color lineColor: "#22304d"
    readonly property color accent: "#2dd4bf"
    readonly property color textPrimary: "#ffffff"
    readonly property color textMuted: "#94a3b8"
    readonly property bool animationsEnabled: Kirigami.Units.longDuration > 0
    readonly property int animFast: animationsEnabled ? Math.max(40, Math.round(Kirigami.Units.shortDuration * 0.6)) : 0
    readonly property int animShort: animationsEnabled ? Kirigami.Units.shortDuration : 0
    readonly property int animLong: animationsEnabled ? Kirigami.Units.longDuration : 0
    readonly property bool glassMode: KSvg.ImageSet.imageSetName === "OneClickGlass"

    preferredRepresentation: compactRepresentation
    Plasmoid.backgroundHints: glassMode ? PlasmaCore.Types.DefaultBackground : PlasmaCore.Types.StandardBackground
    switchWidth: 0
    switchHeight: 0

    onExpandedChanged: {
        if (expanded) {
            query = ""
            showAll = false
            openCounter += 1
        }
    }

    // ---- data -------------------------------------------------------------
    Kicker.RootModel {
        id: appsRoot
        appletInterface: root
        autoPopulate: true
        appNameFormat: 0
        flat: true
        sorted: true
        showSeparators: false
        showAllApps: true
        showAllAppsCategorized: false
        showRecentApps: false
        showRecentDocs: false
        showPowerSession: false
        showFavoritesPlaceholder: false

        property bool favoritesInitDone: false

        function initFavorites() {
            if (!favoritesModel) {
                return
            }
            if (!favoritesInitDone || favoritesModel.favorites.length === 0) {
                favoritesModel.initForClient("org.oneclick.startmenu.pinned.instance-" + Plasmoid.id)
                favoritesInitDone = true
                if (favoritesModel.favorites.length === 0) {
                    favoritesModel.favorites = Plasmoid.configuration.pinned
                }
            }
        }

        Component.onCompleted: initFavorites()
        onRefreshed: {
            initFavorites()
            root.appsRevision += 1
        }
    }

    Kicker.RunnerModel {
        id: runner
        appletInterface: root
        mergeResults: true
        favoritesModel: appsRoot.favoritesModel
        runners: [
            "krunner_services",
            "krunner_systemsettings",
            "krunner_filenamesearch",
            "baloosearch",
            "calculator",
            "krunner_sessions",
            "krunner_powerdevil"
        ]
        query: root.query

        onQueryFinished: root.runnerRevision += 1
        onAnyRunnerFinished: root.runnerRevision += 1
    }

    P5Support.DataSource {
        id: shell
        engine: "executable"
        connectedSources: []
        onNewData: (source) => disconnectSource(source)
        function run(cmd) { connectSource(cmd) }
    }

    function findAllAppsModel() {
        if (appsRoot.count <= 0) {
            return null
        }
        var bestModel = null
        var bestCount = -1
        for (var i = 0; i < appsRoot.count; i++) {
            var label = appsRoot.labelForRow(i)
            var rowModel = appsRoot.modelForRow(i)
            if (label === "All Applications" && rowModel) {
                return rowModel
            }
            if (rowModel && rowModel.count > bestCount) {
                bestCount = rowModel.count
                bestModel = rowModel
            }
        }
        if (bestModel) {
            return bestModel
        }
        var first = appsRoot.modelForRow(0)
        return first ? first : appsRoot
    }

    function findRunnerResultsModel() {
        if (runner.count <= 0) {
            return null
        }
        var first = runner.modelForRow(0)
        if (first && first.count > 0) {
            return first
        }
        for (var i = 0; i < runner.count; i++) {
            var rowModel = runner.modelForRow(i)
            if (rowModel && rowModel.count > 0) {
                return rowModel
            }
        }
        return first
    }

    function launch(model, row) {
        if (!model || row < 0 || row >= model.count) {
            return
        }
        model.trigger(row, "", null)
        root.expanded = false
    }

    function resolveIds(favIdProp, urlProp) {
        var rawFav = (favIdProp !== undefined && favIdProp !== null) ? String(favIdProp) : ""
        var rawUrl = (urlProp !== undefined && urlProp !== null) ? String(urlProp) : ""
        var favId = rawFav.length > 0 ? rawFav : rawUrl

        if (favId.indexOf("applications:") === 0) {
            favId = favId.slice("applications:".length)
        } else if (favId.indexOf("file://") === 0 && favId.endsWith(".desktop")) {
            var slash = favId.lastIndexOf("/")
            if (slash >= 0) {
                favId = favId.slice(slash + 1)
            }
        }

        var launcherId = ""
        if (favId.indexOf("preferred://") === 0) {
            launcherId = favId
        } else if (favId.endsWith(".desktop")) {
            launcherId = "applications:" + favId
        } else if (rawUrl.indexOf("preferred://") === 0) {
            launcherId = rawUrl
        } else if (rawUrl.indexOf("applications:") === 0) {
            launcherId = rawUrl
        } else if (rawUrl.indexOf("file://") === 0 && rawUrl.endsWith(".desktop")) {
            var uSlash = rawUrl.lastIndexOf("/")
            if (uSlash >= 0) {
                launcherId = "applications:" + rawUrl.slice(uSlash + 1)
            }
        }

        return { favId: favId, launcherId: launcherId }
    }

    function shellQuote(str) {
        return "'" + String(str).replace(/'/g, "'\\''") + "'"
    }

    function addToTaskbar(launcherId) {
        if (!launcherId || launcherId.length === 0) {
            return
        }
        var target = JSON.stringify(String(launcherId))
        var script =
            "var target = " + target + ";\n" +
            "var allPanels = panels();\n" +
            "for (var i = 0; i < allPanels.length; i++) {\n" +
            "    var widgets = allPanels[i].widgets();\n" +
            "    for (var j = 0; j < widgets.length; j++) {\n" +
            "        var w = widgets[j];\n" +
            "        if (w.type === \"org.kde.plasma.icontasks\" || w.type === \"org.kde.plasma.taskmanager\" || w.type === \"org.oneclick.dock\") {\n" +
            "            w.currentConfigGroup = [\"General\"];\n" +
            "            var raw = w.readConfig(\"launchers\", []);\n" +
            "            var list = [];\n" +
            "            if (typeof raw === \"string\") {\n" +
            "                if (raw.length > 0) list = raw.split(\",\");\n" +
            "            } else if (raw && typeof raw.length === \"number\") {\n" +
            "                for (var k = 0; k < raw.length; k++) {\n" +
            "                    var item = String(raw[k]);\n" +
            "                    if (item.length > 0) list.push(item);\n" +
            "                }\n" +
            "            }\n" +
            "            if (list.indexOf(target) === -1) {\n" +
            "                list.push(target);\n" +
            "                w.writeConfig(\"launchers\", list);\n" +
            "            }\n" +
            "        }\n" +
            "    }\n" +
            "}"
        shell.run("qdbus-qt6 org.kde.plasmashell /PlasmaShell org.kde.PlasmaShell.evaluateScript " + shellQuote(script))
    }

    // ---- taskbar button ---------------------------------------------------
    compactRepresentation: MouseArea {
        id: button
        hoverEnabled: true
        onClicked: root.expanded = !root.expanded
        Layout.minimumWidth: Math.max(height * 1.25, 32)
        Rectangle {
            anchors.fill: parent
            anchors.margins: 3
            radius: 6
            color: root.textPrimary
            opacity: root.expanded ? 0.14 : (button.containsMouse ? 0.08 : 0)
            Behavior on opacity {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animShort }
            }
        }
        Kirigami.Icon {
            anchors.centerIn: parent
            width: Math.min(parent.width, parent.height) * 0.62
            height: width
            source: "start-here"
            scale: !root.animationsEnabled ? 1 : (button.pressed ? 0.92 : (button.containsMouse ? 1.04 : 1))
            Behavior on scale {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
            }
        }
    }

    // ---- the menu ---------------------------------------------------------
    fullRepresentation: Item {
        id: fullRoot
        Layout.preferredWidth: Kirigami.Units.gridUnit * 34
        Layout.preferredHeight: Kirigami.Units.gridUnit * 38
        Layout.minimumWidth: Layout.preferredWidth
        Layout.minimumHeight: Layout.preferredHeight

        function playOpenAnimation() {
            if (root.animationsEnabled) {
                var slideStart = Plasmoid.location === PlasmaCore.Types.TopEdge ? -12 : 16
                openAnimY.from = slideStart
                menuContainer.y = slideStart
                menuContainer.opacity = 0
                openAnim.restart()
            } else {
                openAnim.stop()
                menuContainer.y = 0
                menuContainer.opacity = 1
            }
        }

        function openContextMenu(sourceItem, mx, my, favIdProp, urlProp) {
            var ids = root.resolveIds(favIdProp, urlProp)
            if (!ids.favId && !ids.launcherId) {
                return
            }
            contextMenu.favId = ids.favId
            contextMenu.launcherId = ids.launcherId
            contextMenu.isPinned = ids.favId.length > 0 && appsRoot.favoritesModel !== null
                                   && appsRoot.favoritesModel.isFavorite(ids.favId)
            var pt = sourceItem.mapToItem(fullRoot, mx, my)
            var menuW = Math.max(196, contextMenu.implicitWidth)
            var menuH = Math.max(84, contextMenu.implicitHeight)
            contextMenu.x = Math.max(8, Math.min(pt.x, fullRoot.width - menuW - 8))
            contextMenu.y = Math.max(8, Math.min(pt.y, fullRoot.height - menuH - 8))
            contextMenu.open()
        }

        Component.onCompleted: {
            if (root.expanded) {
                search.text = ""
                search.forceActiveFocus()
                playOpenAnimation()
            }
        }

        Connections {
            target: root
            function onExpandedChanged() {
                if (root.expanded) {
                    contextMenu.close()
                    search.text = ""
                    search.forceActiveFocus()
                    fullRoot.playOpenAnimation()
                } else {
                    contextMenu.close()
                }
            }
        }

        Keys.onEscapePressed: {
            if (contextMenu.opened) {
                contextMenu.close()
            } else {
                root.expanded = false
            }
        }

        ParallelAnimation {
            id: openAnim
            NumberAnimation {
                id: openAnimY
                target: menuContainer
                property: "y"
                from: 16
                to: 0
                duration: root.animLong
                easing.type: Easing.OutCubic
            }
            NumberAnimation {
                target: menuContainer
                property: "opacity"
                from: 0
                to: 1
                duration: root.animLong
                easing.type: Easing.OutCubic
            }
        }

        Rectangle {
            id: menuContainer
            width: fullRoot.width
            height: fullRoot.height
            y: 0
            opacity: 1
            radius: root.glassMode ? 8 : 10
            color: root.glassMode ? Qt.rgba(11/255, 18/255, 36/255, 0.20) : root.bgPanel
            border.color: root.lineColor
            border.width: root.glassMode ? 0 : 1
            clip: true

            ColumnLayout {
                anchors.fill: parent
                spacing: 0

                ColumnLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    Layout.margins: Kirigami.Units.gridUnit
                    spacing: Kirigami.Units.gridUnit

                    // Search
                    QQC2.TextField {
                        id: search
                        Layout.fillWidth: true
                        implicitHeight: Math.round(Kirigami.Units.gridUnit * 2.3)
                        placeholderText: "Search apps, settings and files"
                        placeholderTextColor: root.textMuted
                        color: root.textPrimary
                        selectionColor: root.accent
                        selectedTextColor: root.bgNavy
                        leftPadding: Kirigami.Units.iconSizes.small + Kirigami.Units.gridUnit * 1.2
                        rightPadding: Kirigami.Units.gridUnit * 0.8
                        font.pixelSize: Kirigami.Units.gridUnit * 0.85
                        onTextChanged: root.query = text.trim()

                        background: Rectangle {
                            radius: height / 2
                            color: root.glassMode ? Qt.rgba(10/255, 16/255, 32/255, 0.65) : root.bgNavy
                            border.width: search.activeFocus ? 2 : 1
                            border.color: search.activeFocus ? root.accent : root.lineColor
                            Behavior on border.color {
                                enabled: root.animationsEnabled
                                ColorAnimation { duration: root.animFast }
                            }
                        }

                        Kirigami.Icon {
                            source: "search"
                            width: Kirigami.Units.iconSizes.small
                            height: width
                            color: search.activeFocus ? root.accent : root.textMuted
                            Behavior on color {
                                enabled: root.animationsEnabled
                                ColorAnimation { duration: root.animFast }
                            }
                            anchors.left: parent.left
                            anchors.leftMargin: Kirigami.Units.gridUnit * 0.7
                            anchors.verticalCenter: parent.verticalCenter
                        }

                        Keys.onReturnPressed: {
                            if (root.query.length > 0 && results.model && results.model.count > 0) {
                                root.launch(results.model, 0)
                            }
                        }
                        Keys.onEnterPressed: {
                            if (root.query.length > 0 && results.model && results.model.count > 0) {
                                root.launch(results.model, 0)
                            }
                        }
                        Keys.onDownPressed: {
                            if (root.query.length > 0 && results.count > 0) {
                                results.currentIndex = 0
                                results.forceActiveFocus()
                            }
                        }
                    }

                    // Section heading and button to switch between pinned and all apps
                    RowLayout {
                        Layout.fillWidth: true
                        visible: root.query.length === 0

                        PC3.Label {
                            text: root.showAll ? "All apps" : "Pinned"
                            color: root.textPrimary
                            font.bold: true
                            font.pixelSize: Kirigami.Units.gridUnit * 0.85
                            Layout.fillWidth: true
                        }

                        QQC2.Button {
                            id: toggleAllBtn
                            text: root.showAll ? "Back" : "All apps"
                            icon.name: root.showAll ? "go-previous" : "go-next"
                            scale: !root.animationsEnabled ? 1 : (down ? 0.98 : (hovered ? 1.02 : 1))
                            Behavior on scale {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
                            }
                            onClicked: root.showAll = !root.showAll
                            contentItem: RowLayout {
                                spacing: 6
                                Kirigami.Icon {
                                    visible: root.showAll
                                    source: "go-previous"
                                    Layout.preferredWidth: Kirigami.Units.iconSizes.small
                                    Layout.preferredHeight: Layout.preferredWidth
                                    color: root.textPrimary
                                }
                                QQC2.Label {
                                    text: toggleAllBtn.text
                                    color: root.textPrimary
                                    font.pixelSize: Kirigami.Units.gridUnit * 0.75
                                }
                                Kirigami.Icon {
                                    visible: !root.showAll
                                    source: "go-next"
                                    Layout.preferredWidth: Kirigami.Units.iconSizes.small
                                    Layout.preferredHeight: Layout.preferredWidth
                                    color: root.textPrimary
                                }
                            }
                            background: Rectangle {
                                radius: 6
                                color: toggleAllBtn.down ? Qt.rgba(1, 1, 1, 0.14)
                                     : (toggleAllBtn.hovered ? Qt.rgba(1, 1, 1, 0.08)
                                     : (root.glassMode ? Qt.rgba(10/255, 16/255, 32/255, 0.55) : root.bgNavy))
                                border.color: toggleAllBtn.hovered ? root.accent : root.lineColor
                                border.width: 1
                                Behavior on color {
                                    enabled: root.animationsEnabled
                                    ColorAnimation { duration: root.animFast }
                                }
                                Behavior on border.color {
                                    enabled: root.animationsEnabled
                                    ColorAnimation { duration: root.animFast }
                                }
                            }
                        }
                    }

                    Item {
                        id: viewStack
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        readonly property int activeView: root.query.length > 0 ? 2 : (root.showAll ? 1 : 0)

                        // Pinned grid
                        GridView {
                            id: pinned
                            anchors.fill: parent
                            readonly property bool active: viewStack.activeView === 0
                            opacity: active ? 1.0 : 0.0
                            y: active ? 0 : (root.animationsEnabled ? -8 : 0)
                            enabled: active
                            visible: opacity > 0.01
                            Behavior on opacity {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                            }
                            Behavior on y {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                            }
                            clip: true
                            cellWidth: width / 6
                            cellHeight: Kirigami.Units.gridUnit * 5.4
                            model: appsRoot.favoritesModel
                            delegate: Tile {
                                id: pinnedTile
                                width: pinned.cellWidth
                                height: pinned.cellHeight
                                onActivated: root.launch(appsRoot.favoritesModel, index)
                                onContextRequested: (mx, my) => fullRoot.openContextMenu(pinnedTile, mx, my, model.favoriteId, model.url)
                            }
                        }

                        // All apps, A to Z
                        ListView {
                            id: allApps
                            anchors.fill: parent
                            readonly property bool active: viewStack.activeView === 1
                            opacity: active ? 1.0 : 0.0
                            y: active ? 0 : (root.animationsEnabled ? 8 : 0)
                            enabled: active
                            visible: opacity > 0.01
                            Behavior on opacity {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                            }
                            Behavior on y {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                            }
                            clip: true
                            model: (appsRoot.count > 0 && root.appsRevision >= 0) ? root.findAllAppsModel() : null
                            delegate: Row_ {
                                id: allAppRow
                                width: allApps.width
                                onActivated: root.launch(allApps.model, index)
                                onContextRequested: (mx, my) => fullRoot.openContextMenu(allAppRow, mx, my, model.favoriteId, model.url)
                            }
                            QQC2.ScrollBar.vertical: QQC2.ScrollBar {}
                        }

                        // Search results
                        ListView {
                            id: results
                            anchors.fill: parent
                            readonly property bool active: viewStack.activeView === 2
                            opacity: active ? 1.0 : 0.0
                            y: active ? 0 : (root.animationsEnabled ? 8 : 0)
                            enabled: active
                            visible: opacity > 0.01
                            Behavior on opacity {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                            }
                            Behavior on y {
                                enabled: root.animationsEnabled
                                NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                            }
                            clip: true
                            model: (runner.count > 0 && root.runnerRevision >= 0) ? root.findRunnerResultsModel() : null
                            onModelChanged: currentIndex = count > 0 ? 0 : -1
                            onCountChanged: {
                                if (count > 0 && (currentIndex < 0 || currentIndex >= count)) {
                                    currentIndex = 0
                                }
                            }
                            delegate: Row_ {
                                id: resultRow
                                width: results.width
                                highlighted: ListView.isCurrentItem || (results.currentIndex < 0 && index === 0)
                                onActivated: root.launch(results.model, index)
                                onContextRequested: (mx, my) => fullRoot.openContextMenu(resultRow, mx, my, model.favoriteId, model.url)
                            }
                            Keys.onReturnPressed: root.launch(results.model, currentIndex >= 0 ? currentIndex : 0)
                            Keys.onEnterPressed: root.launch(results.model, currentIndex >= 0 ? currentIndex : 0)
                            Keys.onUpPressed: {
                                if (currentIndex <= 0) {
                                    search.forceActiveFocus()
                                } else {
                                    decrementCurrentIndex()
                                }
                            }
                            QQC2.ScrollBar.vertical: QQC2.ScrollBar {}
                            PC3.Label {
                                anchors.centerIn: parent
                                visible: root.query.length > 0 && !runner.querying && results.count === 0
                                text: "Nothing found for \u201C" + root.query + "\u201D"
                                color: root.textMuted
                            }
                        }
                    }
                }

                // Divider above footer
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: 1
                    color: root.lineColor
                }

                // Account and power
                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: Kirigami.Units.gridUnit * 3.2
                    color: root.glassMode ? Qt.rgba(10/255, 16/255, 32/255, 0.45) : root.bgNavy
                    RowLayout {
                        anchors.fill: parent
                        anchors.leftMargin: Kirigami.Units.gridUnit * 1.25
                        anchors.rightMargin: Kirigami.Units.gridUnit
                        spacing: Kirigami.Units.smallSpacing
                        Kirigami.Icon {
                            source: "user-identity"
                            Layout.preferredWidth: Kirigami.Units.iconSizes.medium
                            Layout.preferredHeight: Layout.preferredWidth
                            color: root.textPrimary
                        }
                        PC3.Label {
                            text: shellUser.name
                            color: root.textPrimary
                            elide: Text.ElideRight
                            Layout.fillWidth: true
                        }
                        PowerButton { iconName: "system-lock-screen"; tip: "Lock"; command: "loginctl lock-session" }
                        PowerButton { iconName: "system-log-out"; tip: "Sign out"; command: "qdbus-qt6 org.kde.LogoutPrompt /LogoutPrompt promptLogout" }
                        PowerButton { iconName: "system-reboot"; tip: "Restart"; command: "qdbus-qt6 org.kde.LogoutPrompt /LogoutPrompt promptReboot" }
                        PowerButton { iconName: "system-shutdown"; tip: "Shut down"; command: "qdbus-qt6 org.kde.LogoutPrompt /LogoutPrompt promptShutDown" }
                    }
                }
            }
        }

        // Right-click context menu (rendered in-scene so Start menu popup stays open)
        QQC2.Menu {
            id: contextMenu
            parent: fullRoot
            popupType: QQC2.Popup.Item
            padding: 4

            property string favId: ""
            property string launcherId: ""
            property bool isPinned: false

            background: Rectangle {
                implicitWidth: 196
                color: root.bgPanel
                border.color: root.lineColor
                border.width: 1
                radius: 8
            }

            StartMenuActionItem {
                text: contextMenu.isPinned ? "Unpin from Start" : "Pin to Start"
                enabled: contextMenu.favId.length > 0 && appsRoot.favoritesModel !== null
                onTriggered: {
                    if (!appsRoot.favoritesModel || contextMenu.favId.length === 0) {
                        return
                    }
                    if (contextMenu.isPinned) {
                        appsRoot.favoritesModel.removeFavorite(contextMenu.favId)
                    } else {
                        appsRoot.favoritesModel.addFavorite(contextMenu.favId)
                    }
                }
            }

            StartMenuActionItem {
                text: "Add to taskbar"
                enabled: contextMenu.launcherId.length > 0
                onTriggered: root.addToTaskbar(contextMenu.launcherId)
            }
        }
    }

    QtObject {
        id: shellUser
        property string name: ""
    }
    P5Support.DataSource {
        engine: "executable"
        connectedSources: ["getent passwd $USER | cut -d: -f5 | cut -d, -f1; echo; whoami"]
        onNewData: (source, data) => {
            var raw = (data && data["stdout"]) ? String(data["stdout"]) : ""
            var lines = raw.split("\n").map(function(s) { return s.trim() }).filter(function(s) { return s.length > 0 })
            shellUser.name = lines.length ? lines[0] : ""
            disconnectSource(source)
        }
    }

    // ---- small parts ------------------------------------------------------
    component StartMenuActionItem: QQC2.MenuItem {
        id: menuAction
        implicitHeight: 34
        contentItem: QQC2.Label {
            leftPadding: 10
            rightPadding: 10
            text: menuAction.text
            color: menuAction.enabled ? root.textPrimary : root.textMuted
            verticalAlignment: Text.AlignVCenter
            font.pixelSize: Kirigami.Units.gridUnit * 0.78
        }
        background: Rectangle {
            radius: 6
            color: !menuAction.enabled ? "transparent"
                 : (menuAction.down ? Qt.rgba(1, 1, 1, 0.14)
                 : (menuAction.highlighted ? Qt.rgba(45/255, 212/255, 191/255, 0.16) : "transparent"))
            Behavior on color {
                enabled: root.animationsEnabled
                ColorAnimation { duration: root.animFast }
            }
        }
    }

    component Tile: MouseArea {
        id: tile
        signal activated()
        signal contextRequested(real mx, real my)

        property real enterOffset: 0

        acceptedButtons: Qt.LeftButton | Qt.RightButton
        hoverEnabled: true

        onClicked: (mouse) => {
            if (mouse.button === Qt.RightButton) {
                contextRequested(mouse.x, mouse.y)
            } else if (mouse.button === Qt.LeftButton) {
                activated()
            }
        }

        function playEnter() {
            if (root.animationsEnabled) {
                tile.enterOffset = 10
                tileContent.opacity = 0
                tileEnterAnim.restart()
            } else {
                tileEnterAnim.stop()
                tile.enterOffset = 0
                tileContent.opacity = 1
            }
        }

        Component.onCompleted: {
            if (root.expanded) {
                playEnter()
            }
        }

        Connections {
            target: root
            function onOpenCounterChanged() {
                if (root.expanded) {
                    tile.playEnter()
                }
            }
        }

        SequentialAnimation {
            id: tileEnterAnim
            PauseAnimation {
                duration: root.animationsEnabled
                    ? Math.max(0, Math.min(index, 15)) * Math.max(4, Math.round(root.animFast * 0.16))
                    : 0
            }
            ParallelAnimation {
                NumberAnimation {
                    target: tile
                    property: "enterOffset"
                    from: 10
                    to: 0
                    duration: root.animLong
                    easing.type: Easing.OutCubic
                }
                NumberAnimation {
                    target: tileContent
                    property: "opacity"
                    from: 0
                    to: 1
                    duration: root.animLong
                    easing.type: Easing.OutCubic
                }
            }
        }

        Item {
            id: tileContent
            anchors.fill: parent
            transform: Translate { y: tile.enterOffset }
            scale: !root.animationsEnabled ? 1 : (tile.pressed ? 0.98 : (tile.containsMouse ? 1.02 : 1))
            Behavior on scale {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
            }

            Rectangle {
                anchors.fill: parent
                anchors.margins: 4
                radius: 8
                color: root.textPrimary
                opacity: tile.pressed ? 0.12 : (tile.containsMouse ? 0.07 : 0)
                Behavior on opacity {
                    enabled: root.animationsEnabled
                    NumberAnimation { duration: root.animFast }
                }
            }

            ColumnLayout {
                anchors.centerIn: parent
                width: parent.width - 8
                spacing: 6
                Kirigami.Icon {
                    source: model.decoration
                    Layout.alignment: Qt.AlignHCenter
                    Layout.preferredWidth: Kirigami.Units.iconSizes.large
                    Layout.preferredHeight: Layout.preferredWidth
                    scale: !root.animationsEnabled ? 1 : (tile.pressed ? 0.92 : 1)
                    Behavior on scale {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
                    }
                }
                PC3.Label {
                    text: model.display
                    color: root.textPrimary
                    Layout.fillWidth: true
                    horizontalAlignment: Text.AlignHCenter
                    elide: Text.ElideRight
                    font.pixelSize: Kirigami.Units.gridUnit * 0.62
                }
            }
        }
    }

    component Row_: MouseArea {
        id: row
        signal activated()
        signal contextRequested(real mx, real my)
        property bool highlighted: false
        height: Kirigami.Units.gridUnit * 2.4
        acceptedButtons: Qt.LeftButton | Qt.RightButton
        hoverEnabled: true
        opacity: root.animationsEnabled ? 0 : 1
        Component.onCompleted: opacity = 1
        Behavior on opacity {
            enabled: root.animationsEnabled
            NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
        }

        onClicked: (mouse) => {
            if (mouse.button === Qt.RightButton) {
                contextRequested(mouse.x, mouse.y)
            } else if (mouse.button === Qt.LeftButton) {
                activated()
            }
        }

        Rectangle {
            anchors.fill: parent
            radius: 6
            color: row.highlighted && !row.containsMouse ? root.accent : root.textPrimary
            opacity: row.pressed ? 0.14 : (row.containsMouse ? 0.08 : (row.highlighted ? 0.14 : 0))
            Behavior on opacity {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animFast }
            }
            Behavior on color {
                enabled: root.animationsEnabled
                ColorAnimation { duration: root.animFast }
            }
        }
        RowLayout {
            anchors.fill: parent
            anchors.leftMargin: Kirigami.Units.gridUnit * 0.6
            anchors.rightMargin: Kirigami.Units.gridUnit * 0.6
            spacing: Kirigami.Units.gridUnit * 0.6
            scale: !root.animationsEnabled ? 1 : (row.pressed ? 0.98 : 1)
            Behavior on scale {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
            }
            Kirigami.Icon {
                source: model.decoration
                Layout.preferredWidth: Kirigami.Units.iconSizes.smallMedium
                Layout.preferredHeight: Layout.preferredWidth
            }
            PC3.Label {
                text: model.display
                color: root.textPrimary
                Layout.fillWidth: true
                elide: Text.ElideRight
            }
        }
    }

    component PowerButton: PC3.ToolButton {
        id: pbtn
        property string iconName: ""
        property string tip: ""
        property string command: ""
        icon.name: iconName
        icon.color: root.textPrimary
        display: QQC2.AbstractButton.IconOnly
        PC3.ToolTip.text: tip
        PC3.ToolTip.visible: hovered
        scale: !root.animationsEnabled ? 1 : (down ? 0.94 : (hovered ? 1.04 : 1))
        Behavior on scale {
            enabled: root.animationsEnabled
            NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
        }
        background: Rectangle {
            radius: 6
            color: root.textPrimary
            opacity: pbtn.down ? 0.14 : (pbtn.hovered ? 0.08 : 0)
            Behavior on opacity {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animFast }
            }
        }
        onClicked: {
            root.expanded = false
            shell.run(command)
        }
    }
}
