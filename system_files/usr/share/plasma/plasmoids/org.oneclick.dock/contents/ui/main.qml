// OneClick Dock: centered floating magnifying dock for pinned and running apps.
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.plasma.plasmoid
import org.kde.plasma.core as PlasmaCore
import org.kde.taskmanager as TaskManager
import org.kde.kirigami as Kirigami

PlasmoidItem {
    id: root

    readonly property color bgNavy: "#0a1020"
    readonly property color bgPanel: "#0b1224"
    readonly property color lineColor: "#22304d"
    readonly property color accent: "#2dd4bf"
    readonly property color textPrimary: "#ffffff"
    readonly property color textMuted: "#94a3b8"

    readonly property bool animationsEnabled: Kirigami.Units.longDuration > 0
    readonly property int animShort: animationsEnabled ? Math.max(40, Math.round(Kirigami.Units.shortDuration * 0.7)) : 0
    readonly property int animMed: animationsEnabled ? Math.max(60, Math.round(Kirigami.Units.shortDuration * 1.1)) : 0
    readonly property int animLong: animationsEnabled ? Kirigami.Units.longDuration : 0

    readonly property int dockHeight: root.height > 0 ? root.height : root.implicitHeight
    readonly property int restBottomMargin: 9
    readonly property int bounceMax: animationsEnabled ? 7 : 0
    readonly property int hoverLiftMax: animationsEnabled ? 3 : 0
    readonly property int verticalHeadroom: restBottomMargin + hoverLiftMax + bounceMax + 6
    readonly property int maxAllowedIconSide: Math.max(24, Math.floor(dockHeight - verticalHeadroom))
    readonly property real maxHoverScale: animationsEnabled ? 1.32 : 1.0
    readonly property int baseIconSize: Math.max(24, Math.min(Math.round(Kirigami.Units.gridUnit * 2.1), Math.floor(maxAllowedIconSide / maxHoverScale)))
    readonly property int slotWidth: baseIconSize + 12
    readonly property real hoverRadius: baseIconSize * 2.6

    preferredRepresentation: fullRepresentation
    Plasmoid.backgroundHints: PlasmaCore.Types.NoBackground

    Layout.fillWidth: false
    Layout.fillHeight: true
    Layout.minimumWidth: dockRow.implicitWidth + 20
    Layout.preferredWidth: dockRow.implicitWidth + 20
    implicitWidth: dockRow.implicitWidth + 20
    implicitHeight: Math.round(Kirigami.Units.gridUnit * 4.2)

    TaskManager.VirtualDesktopInfo {
        id: virtualDesktopInfo
    }

    TaskManager.ActivityInfo {
        id: activityInfo
    }

    TaskManager.TasksModel {
        id: tasksModel
        virtualDesktop: virtualDesktopInfo.currentDesktop
        activity: activityInfo.currentActivity
        filterByVirtualDesktop: true
        filterByActivity: true
        filterByScreen: false
        groupMode: TaskManager.TasksModel.GroupApplications
        sortMode: TaskManager.TasksModel.SortManual
        separateLaunchers: false
        launchInPlace: true
        hideActivatedLaunchers: true

        property bool initialized: false

        Component.onCompleted: {
            launcherList = Plasmoid.configuration.launchers
            initialized = true
        }

        onLauncherListChanged: {
            if (initialized && Plasmoid.configuration) {
                Plasmoid.configuration.launchers = launcherList
            }
        }
    }

    Connections {
        target: Plasmoid.configuration
        function onLaunchersChanged() {
            if (tasksModel.initialized && String(tasksModel.launcherList) !== String(Plasmoid.configuration.launchers)) {
                tasksModel.launcherList = Plasmoid.configuration.launchers
            }
        }
    }

    // Active-task context menu target
    property int menuRow: -1
    property bool menuIsWindow: false
    property bool menuIsLauncher: false
    property bool menuHasLauncher: false
    property bool menuCanNew: false
    property bool menuCanMinimize: false
    property bool menuCanClose: false
    property bool menuIsMinimized: false
    property url menuLauncherUrl: ""
    property string menuTitle: ""

    QQC2.Menu {
        id: dockMenu
        width: 210
        modal: true
        popupType: QQC2.Popup.Window

        background: Rectangle {
            color: root.bgPanel
            border.color: root.lineColor
            border.width: 1
            radius: 8
        }

        QQC2.MenuItem {
            id: openNewItem
            text: root.menuIsWindow ? "Open new window" : "Open"
            visible: root.menuIsLauncher || root.menuCanNew
            height: visible ? implicitHeight : 0
            onTriggered: {
                var idx = tasksModel.makeModelIndex(root.menuRow)
                if (root.menuIsWindow && root.menuCanNew) {
                    tasksModel.requestNewInstance(idx)
                } else {
                    tasksModel.requestActivate(idx)
                }
            }
            contentItem: QQC2.Label {
                text: parent.text
                color: root.textPrimary
                font.pixelSize: 13
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                color: parent.highlighted ? "#172642" : "transparent"
                radius: 4
                Behavior on color {
                    enabled: root.animationsEnabled
                    ColorAnimation { duration: root.animShort }
                }
            }
        }

        QQC2.MenuItem {
            text: (root.menuIsLauncher || root.menuHasLauncher) ? "Unpin from dock" : "Pin to dock"
            visible: String(root.menuLauncherUrl).length > 0
            height: visible ? implicitHeight : 0
            onTriggered: {
                if (root.menuIsLauncher || root.menuHasLauncher) {
                    tasksModel.requestRemoveLauncher(root.menuLauncherUrl)
                } else {
                    tasksModel.requestAddLauncher(root.menuLauncherUrl)
                }
            }
            contentItem: QQC2.Label {
                text: parent.text
                color: root.textPrimary
                font.pixelSize: 13
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                color: parent.highlighted ? "#172642" : "transparent"
                radius: 4
                Behavior on color {
                    enabled: root.animationsEnabled
                    ColorAnimation { duration: root.animShort }
                }
            }
        }

        QQC2.MenuItem {
            text: root.menuIsMinimized ? "Restore" : "Minimize"
            visible: root.menuIsWindow && root.menuCanMinimize
            height: visible ? implicitHeight : 0
            onTriggered: tasksModel.requestToggleMinimized(tasksModel.makeModelIndex(root.menuRow))
            contentItem: QQC2.Label {
                text: parent.text
                color: root.textPrimary
                font.pixelSize: 13
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                color: parent.highlighted ? "#172642" : "transparent"
                radius: 4
                Behavior on color {
                    enabled: root.animationsEnabled
                    ColorAnimation { duration: root.animShort }
                }
            }
        }

        QQC2.MenuItem {
            text: "Close"
            visible: root.menuIsWindow && root.menuCanClose
            height: visible ? implicitHeight : 0
            onTriggered: tasksModel.requestClose(tasksModel.makeModelIndex(root.menuRow))
            contentItem: QQC2.Label {
                text: parent.text
                color: root.textPrimary
                font.pixelSize: 13
                verticalAlignment: Text.AlignVCenter
            }
            background: Rectangle {
                color: parent.highlighted ? "#172642" : "transparent"
                radius: 4
                Behavior on color {
                    enabled: root.animationsEnabled
                    ColorAnimation { duration: root.animShort }
                }
            }
        }
    }

    Row {
        id: dockRow
        anchors.centerIn: parent
        height: root.dockHeight
        spacing: 6

        HoverHandler {
            id: rowHover
        }

        Repeater {
            id: taskRepeater
            model: tasksModel

            delegate: Item {
                id: taskItem
                required property int index
                required property var model

                readonly property bool isWindow: Boolean(model.IsWindow)
                readonly property bool isLauncher: Boolean(model.IsLauncher)
                readonly property bool hasLauncher: Boolean(model.HasLauncher)
                readonly property bool isActive: Boolean(model.IsActive)
                readonly property bool isMinimized: Boolean(model.IsMinimized)
                readonly property bool demandingAttention: Boolean(model.IsDemandingAttention)
                readonly property string labelText: String(model.AppName || model.display || "")

                // Deterministic rest center avoids self-referential x/width <-> smoothScale loops.
                readonly property real restCenterX: index * (root.slotWidth + dockRow.spacing) + root.slotWidth * 0.5
                readonly property real distFromPointer: (root.animationsEnabled && rowHover.hovered)
                    ? Math.abs(rowHover.point.position.x - restCenterX)
                    : root.hoverRadius
                readonly property real normDist: Math.min(1.0, distFromPointer / root.hoverRadius)
                readonly property real cosineWeight: (root.animationsEnabled && rowHover.hovered)
                    ? 0.5 * (1.0 + Math.cos(Math.PI * normDist))
                    : 0.0
                readonly property real targetScale: 1.0 + (root.maxHoverScale - 1.0) * cosineWeight
                property real smoothScale: targetScale
                Behavior on smoothScale {
                    enabled: root.animationsEnabled
                    NumberAnimation {
                        duration: root.animShort
                        easing.type: Easing.OutCubic
                    }
                }

                property real bounceOffset: 0
                SequentialAnimation {
                    id: bounceAnim
                    NumberAnimation {
                        target: taskItem
                        property: "bounceOffset"
                        from: 0
                        to: -root.bounceMax
                        duration: Math.max(90, Math.round(root.animMed * 1.1))
                        easing.type: Easing.OutQuad
                    }
                    NumberAnimation {
                        target: taskItem
                        property: "bounceOffset"
                        from: -root.bounceMax
                        to: 0
                        duration: Math.max(100, Math.round(root.animMed * 1.3))
                        easing.type: Easing.InQuad
                    }
                    NumberAnimation {
                        target: taskItem
                        property: "bounceOffset"
                        from: 0
                        to: -Math.round(root.bounceMax * 0.5)
                        duration: Math.max(70, Math.round(root.animShort * 1.1))
                        easing.type: Easing.OutQuad
                    }
                    NumberAnimation {
                        target: taskItem
                        property: "bounceOffset"
                        from: -Math.round(root.bounceMax * 0.5)
                        to: 0
                        duration: Math.max(80, Math.round(root.animShort * 1.2))
                        easing.type: Easing.InQuad
                    }
                }

                onDemandingAttentionChanged: {
                    if (demandingAttention && root.animationsEnabled) {
                        bounceAnim.restart()
                    }
                }

                readonly property int iconSide: Math.min(root.maxAllowedIconSide, Math.round(root.baseIconSize * smoothScale))
                readonly property int hoverLift: Math.min(root.hoverLiftMax, Math.round((smoothScale - 1.0) * 6))
                width: root.slotWidth
                height: dockRow.height
                z: smoothScale > 1.02 ? 2 : 0

                // Hover pill behind icon (accessible, also visible when animations off)
                Rectangle {
                    anchors.centerIn: iconItem
                    width: iconItem.width + 8
                    height: iconItem.height + 8
                    radius: 10
                    color: taskItem.isActive ? Qt.rgba(45/255, 212/255, 191/255, 0.14) : Qt.rgba(1, 1, 1, 0.08)
                    border.color: taskItem.isActive ? Qt.rgba(45/255, 212/255, 191/255, 0.45) : "transparent"
                    border.width: 1
                    opacity: (taskMouse.containsMouse || taskItem.isActive) ? 1.0 : 0.0
                    Behavior on opacity {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animShort }
                    }
                }

                Kirigami.Icon {
                    id: iconItem
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: root.restBottomMargin + taskItem.hoverLift - taskItem.bounceOffset
                    width: taskItem.iconSide
                    height: taskItem.iconSide
                    source: model.decoration || "application-x-executable"
                    scale: taskMouse.pressed && root.animationsEnabled ? 0.94 : 1.0
                    Behavior on scale {
                        enabled: root.animationsEnabled
                        NumberAnimation {
                            duration: root.animShort
                            easing.type: Easing.OutCubic
                        }
                    }
                }

                // Active / running indicator dot
                Rectangle {
                    id: indicator
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 3
                    height: 3
                    width: taskItem.isActive ? 14 : (taskItem.isWindow ? 5 : 0)
                    radius: 1.5
                    color: taskItem.isActive ? root.accent : Qt.rgba(1, 1, 1, 0.72)
                    opacity: taskItem.isWindow ? 1.0 : 0.0
                    Behavior on width {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animShort; easing.type: Easing.OutCubic }
                    }
                    Behavior on opacity {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animShort }
                    }
                }

                PlasmaCore.ToolTipArea {
                    id: taskToolTip
                    anchors.fill: parent
                    mainText: taskItem.labelText
                    subText: taskItem.isWindow ? (taskItem.isMinimized ? "Minimized" : "Running") : "Click to open"
                    location: Plasmoid.location
                    active: taskItem.labelText.length > 0 && !dockMenu.opened
                    interactive: false
                    hideOnClick: true

                    MouseArea {
                        id: taskMouse
                        anchors.fill: parent
                        hoverEnabled: true
                        acceptedButtons: Qt.LeftButton | Qt.MiddleButton | Qt.RightButton
                        cursorShape: Qt.PointingHandCursor
                        onClicked: function(mouse) {
                            var idx = tasksModel.makeModelIndex(taskItem.index)
                            if (mouse.button === Qt.LeftButton) {
                                if (taskItem.isWindow) {
                                    if (taskItem.isActive && !taskItem.isMinimized) {
                                        tasksModel.requestToggleMinimized(idx)
                                    } else {
                                        tasksModel.requestActivate(idx)
                                    }
                                } else {
                                    if (root.animationsEnabled) {
                                        bounceAnim.restart()
                                    }
                                    tasksModel.requestActivate(idx)
                                }
                            } else if (mouse.button === Qt.MiddleButton) {
                                if (root.animationsEnabled) {
                                    bounceAnim.restart()
                                }
                                tasksModel.requestNewInstance(idx)
                            } else if (mouse.button === Qt.RightButton) {
                                root.menuRow = taskItem.index
                                root.menuIsWindow = taskItem.isWindow
                                root.menuIsLauncher = taskItem.isLauncher
                                root.menuHasLauncher = taskItem.hasLauncher
                                root.menuCanNew = Boolean(model.CanLaunchNewInstance)
                                root.menuCanMinimize = Boolean(model.IsMinimizable)
                                root.menuCanClose = Boolean(model.IsClosable)
                                root.menuIsMinimized = taskItem.isMinimized
                                root.menuLauncherUrl = model.LauncherUrlWithoutIcon || model.LauncherUrl || ""
                                root.menuTitle = taskItem.labelText
                                dockMenu.popup()
                            }
                        }
                    }
                }
            }
        }
    }
}
