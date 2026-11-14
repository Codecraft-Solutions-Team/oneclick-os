// The Taskbar page in Settings: live preview drawing + immediate controls.
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

KCM.SimpleKCM {
    id: page

    function syncControls() {
        alwaysShownRadio.checked = (kcm.hiding === "none")
        dodgeRadio.checked = (kcm.hiding === "dodgewindows")
        autohideRadio.checked = (kcm.hiding === "autohide")
        floatingSwitch.checked = kcm.floating
        bottomBtn.checked = (kcm.location === "bottom")
        topBtn.checked = (kcm.location === "top")
        smallBtn.checked = (kcm.size === "small")
        mediumBtn.checked = (kcm.size === "medium")
        largeBtn.checked = (kcm.size === "large")
    }

    function applyCurrent(nextHiding, nextFloating, nextLocation, nextSize) {
        kcm.applySettings(nextHiding, nextFloating, nextLocation, nextSize)
    }

    Component.onCompleted: syncControls()

    Connections {
        target: kcm
        function onStateChanged() {
            page.syncControls()
        }
    }

    ColumnLayout {
        spacing: Kirigami.Units.largeSpacing

        // ---- Live flat desktop preview ------------------------------------
        Kirigami.AbstractCard {
            Layout.fillWidth: true
            contentItem: ColumnLayout {
                spacing: Kirigami.Units.smallSpacing

                Rectangle {
                    id: desktopPreview
                    Layout.fillWidth: true
                    Layout.preferredHeight: 196
                    radius: 6
                    color: "#0a1020"
                    border.color: "#22304d"
                    border.width: 1
                    clip: true

                    readonly property int barHeight: kcm.size === "small" ? 22
                                                   : (kcm.size === "large" ? 36 : 28)
                    readonly property int edgeGap: kcm.floating ? 8 : 0
                    readonly property int sideMargin: kcm.floating ? 10 : 0
                    readonly property bool isTop: kcm.location === "top"
                    readonly property int visibleBarY: isTop ? edgeGap : (height - barHeight - edgeGap)
                    readonly property int hideShift: kcm.hiding === "autohide"
                        ? (barHeight + edgeGap - 4)
                        : (kcm.hiding === "dodgewindows" ? Math.round(barHeight * 0.55) : 0)
                    readonly property int targetBarY: isTop ? (visibleBarY - hideShift) : (visibleBarY + hideShift)

                    // Stylized flat app window inside the desktop
                    Rectangle {
                        id: appWindow
                        x: 24
                        width: parent.width - 48
                        radius: 5
                        color: "#141e34"
                        border.color: "#22304d"
                        border.width: 1
                        y: desktopPreview.isTop
                           ? (kcm.hiding === "none" ? (desktopPreview.barHeight + desktopPreview.edgeGap + 14) : 10)
                           : 14
                        height: kcm.hiding === "none"
                                ? (parent.height - desktopPreview.barHeight - desktopPreview.edgeGap - 28)
                                : (parent.height - 24)

                        Behavior on y { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
                        Behavior on height { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }

                        // Flat title bar
                        Rectangle {
                            id: titleBar
                            anchors.top: parent.top
                            anchors.left: parent.left
                            anchors.right: parent.right
                            height: 22
                            radius: 5
                            color: "#0b1224"

                            // Square off bottom corners of titlebar cleanly without extra overlays
                            Rectangle {
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.bottom: parent.bottom
                                height: 5
                                color: "#0b1224"
                            }

                            Rectangle {
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.bottom: parent.bottom
                                height: 1
                                color: "#22304d"
                            }

                            Row {
                                anchors.left: parent.left
                                anchors.leftMargin: 10
                                anchors.verticalCenter: parent.verticalCenter
                                spacing: 6
                                Rectangle { width: 10; height: 10; radius: 2; color: "#2dd4bf" }
                                Rectangle { width: 64; height: 6; radius: 2; anchors.verticalCenter: parent.verticalCenter; color: "#22304d" }
                            }

                            Row {
                                anchors.right: parent.right
                                anchors.rightMargin: 10
                                anchors.verticalCenter: parent.verticalCenter
                                spacing: 6
                                Rectangle { width: 8; height: 8; radius: 2; color: "#22304d" }
                                Rectangle { width: 8; height: 8; radius: 2; color: "#22304d" }
                                Rectangle { width: 8; height: 8; radius: 4; color: "#ffffff"; opacity: 0.7 }
                            }
                        }

                        // Flat placeholder content blocks
                        Column {
                            anchors.top: titleBar.bottom
                            anchors.left: parent.left
                            anchors.right: parent.right
                            anchors.margins: 12
                            spacing: 8

                            Rectangle { width: parent.width * 0.48; height: 8; radius: 2; color: "#22304d" }
                            Rectangle { width: parent.width * 0.72; height: 6; radius: 2; color: "#1c2842" }
                            Rectangle { width: parent.width * 0.58; height: 6; radius: 2; color: "#1c2842" }
                        }
                    }

                    // Stylized flat taskbar
                    Rectangle {
                        id: taskbarBar
                        x: desktopPreview.sideMargin
                        width: parent.width - (desktopPreview.sideMargin * 2)
                        height: desktopPreview.barHeight
                        y: desktopPreview.targetBarY
                        radius: kcm.floating ? 8 : 0
                        color: "#0b1224"
                        border.color: kcm.hiding === "autohide" ? "#2dd4bf" : "#22304d"
                        border.width: 1
                        opacity: kcm.hiding === "none" ? 1.0 : (kcm.hiding === "dodgewindows" ? 0.55 : 0.45)

                        Behavior on x { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }
                        Behavior on width { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }
                        Behavior on height { NumberAnimation { duration: 150; easing.type: Easing.OutCubic } }
                        Behavior on y { NumberAnimation { duration: 180; easing.type: Easing.OutCubic } }
                        Behavior on radius { NumberAnimation { duration: 150 } }
                        Behavior on opacity { NumberAnimation { duration: 150 } }

                        Row {
                            anchors.left: parent.left
                            anchors.leftMargin: 10
                            anchors.verticalCenter: parent.verticalCenter
                            spacing: 8

                            // Start button mark (flat 2x2 teal icon)
                            Grid {
                                columns: 2
                                spacing: 2
                                anchors.verticalCenter: parent.verticalCenter
                                readonly property int cell: kcm.size === "small" ? 5 : (kcm.size === "large" ? 8 : 6)
                                Rectangle { width: parent.cell; height: parent.cell; radius: 1; color: "#2dd4bf" }
                                Rectangle { width: parent.cell; height: parent.cell; radius: 1; color: "#2dd4bf" }
                                Rectangle { width: parent.cell; height: parent.cell; radius: 1; color: "#2dd4bf" }
                                Rectangle { width: parent.cell; height: parent.cell; radius: 1; color: "#ffffff" }
                            }

                            // Active app pill with flat teal indicator
                            Item {
                                width: Math.max(18, Math.round(desktopPreview.barHeight * 0.72))
                                height: desktopPreview.barHeight - 8
                                anchors.verticalCenter: parent.verticalCenter
                                Rectangle {
                                    anchors.centerIn: parent
                                    width: parent.width
                                    height: parent.height - 4
                                    radius: 4
                                    color: "#141e34"
                                    border.color: "#22304d"
                                    border.width: 1
                                }
                                Rectangle {
                                    anchors.horizontalCenter: parent.horizontalCenter
                                    anchors.bottom: desktopPreview.isTop ? undefined : parent.bottom
                                    anchors.top: desktopPreview.isTop ? parent.top : undefined
                                    width: 10
                                    height: 2
                                    radius: 1
                                    color: "#2dd4bf"
                                }
                            }

                            // Inactive pinned app pills
                            Rectangle {
                                width: Math.max(18, Math.round(desktopPreview.barHeight * 0.72))
                                height: desktopPreview.barHeight - 12
                                radius: 4
                                anchors.verticalCenter: parent.verticalCenter
                                color: "#141e34"
                            }
                            Rectangle {
                                width: Math.max(18, Math.round(desktopPreview.barHeight * 0.72))
                                height: desktopPreview.barHeight - 12
                                radius: 4
                                anchors.verticalCenter: parent.verticalCenter
                                color: "#141e34"
                            }
                        }

                        // Right side tray & clock pill
                        Row {
                            anchors.right: parent.right
                            anchors.rightMargin: 10
                            anchors.verticalCenter: parent.verticalCenter
                            spacing: 6
                            Rectangle { width: 6; height: 6; radius: 3; color: "#22304d"; anchors.verticalCenter: parent.verticalCenter }
                            Rectangle { width: 6; height: 6; radius: 3; color: "#22304d"; anchors.verticalCenter: parent.verticalCenter }
                            Rectangle { width: 26; height: 8; radius: 2; color: "#ffffff"; opacity: 0.75; anchors.verticalCenter: parent.verticalCenter }
                        }
                    }
                }

                QQC2.Label {
                    Layout.fillWidth: true
                    opacity: 0.7
                    wrapMode: Text.WordWrap
                    text: "Changes apply immediately to your desktop taskbar."
                }
            }
        }

        // ---- Controls -----------------------------------------------------
        Kirigami.FormLayout {
            Layout.fillWidth: true

            QQC2.ButtonGroup { id: hidingGroup }

            QQC2.RadioButton {
                id: alwaysShownRadio
                Kirigami.FormData.label: "Behaviour:"
                text: "Always shown"
                QQC2.ButtonGroup.group: hidingGroup
                onToggled: if (checked) page.applyCurrent("none", kcm.floating, kcm.location, kcm.size)
            }
            QQC2.RadioButton {
                id: dodgeRadio
                text: "Hide automatically while an app covers it"
                QQC2.ButtonGroup.group: hidingGroup
                onToggled: if (checked) page.applyCurrent("dodgewindows", kcm.floating, kcm.location, kcm.size)
            }
            QQC2.RadioButton {
                id: autohideRadio
                text: "Always hidden until the pointer reaches the edge"
                QQC2.ButtonGroup.group: hidingGroup
                onToggled: if (checked) page.applyCurrent("autohide", kcm.floating, kcm.location, kcm.size)
            }

            Item { Kirigami.FormData.isSection: true }

            QQC2.Switch {
                id: floatingSwitch
                Kirigami.FormData.label: "Appearance:"
                text: "Floating (rounded bar with a gap around it)"
                onToggled: page.applyCurrent(kcm.hiding, checked, kcm.location, kcm.size)
            }

            Item { Kirigami.FormData.isSection: true }

            QQC2.ButtonGroup { id: locationGroup }
            RowLayout {
                Kirigami.FormData.label: "Position:"
                spacing: 0

                QQC2.Button {
                    id: bottomBtn
                    text: "Bottom"
                    checkable: true
                    QQC2.ButtonGroup.group: locationGroup
                    onClicked: page.applyCurrent(kcm.hiding, kcm.floating, "bottom", kcm.size)
                }
                QQC2.Button {
                    id: topBtn
                    text: "Top"
                    checkable: true
                    QQC2.ButtonGroup.group: locationGroup
                    onClicked: page.applyCurrent(kcm.hiding, kcm.floating, "top", kcm.size)
                }
            }

            QQC2.ButtonGroup { id: sizeGroup }
            RowLayout {
                Kirigami.FormData.label: "Size:"
                spacing: 0

                QQC2.Button {
                    id: smallBtn
                    text: "Small"
                    checkable: true
                    QQC2.ButtonGroup.group: sizeGroup
                    onClicked: page.applyCurrent(kcm.hiding, kcm.floating, kcm.location, "small")
                }
                QQC2.Button {
                    id: mediumBtn
                    text: "Medium"
                    checkable: true
                    QQC2.ButtonGroup.group: sizeGroup
                    onClicked: page.applyCurrent(kcm.hiding, kcm.floating, kcm.location, "medium")
                }
                QQC2.Button {
                    id: largeBtn
                    text: "Large"
                    checkable: true
                    QQC2.ButtonGroup.group: sizeGroup
                    onClicked: page.applyCurrent(kcm.hiding, kcm.floating, kcm.location, "large")
                }
            }
        }
    }
}
