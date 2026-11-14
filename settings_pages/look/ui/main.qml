// The Look page in Settings: switch between Windows style and Mac style.
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

KCM.SimpleKCM {
    id: page

    Component.onCompleted: kcm.refresh()

    component LookCard: Rectangle {
        id: card
        required property string lookId
        required property string title
        required property string subtitle
        required property int staggerMs
        default property alias previewContent: previewCanvas.data

        readonly property bool selected: kcm.currentLook === lookId
        property bool shown: Kirigami.Units.longDuration === 0

        Layout.fillWidth: true
        implicitHeight: cardColumn.implicitHeight + 28
        radius: 6
        color: selected ? "#0e1a35" : (cardArea.containsMouse ? "#101a34" : "#0b1224")
        border.color: selected ? "#2dd4bf" : (cardArea.containsMouse ? "#2dd4bf" : "#22304d")
        border.width: selected ? 2 : 1
        opacity: (shown ? 1.0 : 0.0) * (kcm.busy && !selected ? 0.65 : 1.0)
        scale: cardArea.pressed && Kirigami.Units.longDuration > 0 ? 0.985 : 1.0

        activeFocusOnTab: true
        Accessible.role: Accessible.RadioButton
        Accessible.name: title
        Accessible.description: subtitle
        Accessible.checked: selected

        transform: Translate {
            y: card.shown ? 0 : 8
            Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
        }
        Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
        Behavior on color { ColorAnimation { duration: Kirigami.Units.shortDuration } }
        Behavior on border.color { ColorAnimation { duration: Kirigami.Units.shortDuration } }
        Behavior on scale { NumberAnimation { duration: Kirigami.Units.shortDuration; easing.type: Easing.OutCubic } }

        Timer {
            running: !card.shown
            interval: card.staggerMs
            onTriggered: card.shown = true
        }

        Keys.onReturnPressed: if (!kcm.busy) kcm.applyLook(lookId)
        Keys.onSpacePressed: if (!kcm.busy) kcm.applyLook(lookId)

        ColumnLayout {
            id: cardColumn
            anchors.fill: parent
            anchors.margins: 14
            spacing: 12

            Rectangle {
                id: previewCanvas
                Layout.fillWidth: true
                Layout.preferredHeight: 172
                radius: 6
                color: "#0a1020"
                border.color: "#22304d"
                border.width: 1
                clip: true
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                QQC2.Label {
                    Layout.fillWidth: true
                    text: card.title
                    font.pixelSize: 15
                    font.weight: Font.DemiBold
                    color: "#ffffff"
                }

                Rectangle {
                    visible: card.selected
                    implicitWidth: activeLabel.implicitWidth + 14
                    implicitHeight: 22
                    radius: 4
                    color: "#0f2e2b"
                    border.color: "#2dd4bf"
                    border.width: 1

                    QQC2.Label {
                        id: activeLabel
                        anchors.centerIn: parent
                        text: kcm.busy ? "Applying..." : "Active"
                        font.pixelSize: 11
                        font.weight: Font.Medium
                        color: "#2dd4bf"
                    }
                }
            }

            QQC2.Label {
                Layout.fillWidth: true
                wrapMode: Text.WordWrap
                text: card.subtitle
                font.pixelSize: 12
                color: "#94a3b8"
            }
        }

        MouseArea {
            id: cardArea
            anchors.fill: parent
            enabled: !kcm.busy
            hoverEnabled: true
            cursorShape: Qt.PointingHandCursor
            onClicked: {
                card.forceActiveFocus()
                kcm.applyLook(card.lookId)
            }
        }
    }

    ColumnLayout {
        spacing: Kirigami.Units.largeSpacing

        Kirigami.InlineMessage {
            Layout.fillWidth: true
            visible: kcm.errorMessage.length > 0
            type: Kirigami.MessageType.Error
            text: kcm.errorMessage
        }

        // ---- Header -------------------------------------------------------
        Rectangle {
            id: lookHeader
            property bool shown: Kirigami.Units.longDuration === 0
            Layout.fillWidth: true
            implicitHeight: headerRow.implicitHeight + 24
            radius: 6
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            opacity: shown ? 1.0 : 0.0
            transform: Translate {
                y: lookHeader.shown ? 0 : 8
                Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            }
            Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            Component.onCompleted: shown = true

            RowLayout {
                id: headerRow
                anchors.fill: parent
                anchors.margins: 12
                spacing: 12

                Kirigami.Icon {
                    source: "oneclick-look"
                    Layout.preferredWidth: Kirigami.Units.iconSizes.medium
                    Layout.preferredHeight: Kirigami.Units.iconSizes.medium
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: "Choose how your desktop works"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        color: "#ffffff"
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        text: kcm.busy
                              ? "Switching desktop style..."
                              : "Click a style to switch straight away. Your files, apps, and settings stay right where they are."
                        font.pixelSize: 12
                        color: "#94a3b8"
                    }
                }
            }
        }

        // ---- Style cards --------------------------------------------------
        GridLayout {
            Layout.fillWidth: true
            columns: page.width < 660 ? 1 : 2
            columnSpacing: Kirigami.Units.largeSpacing
            rowSpacing: Kirigami.Units.largeSpacing

            // ---- Card 1: Windows style ------------------------------------
            LookCard {
                lookId: "windows"
                title: "Windows style"
                subtitle: "Taskbar along the bottom with a Start button and window buttons on the top right."
                staggerMs: 0

                // Stylized desktop window (right-hand buttons)
                Rectangle {
                    anchors.left: parent.left
                    anchors.top: parent.top
                    anchors.leftMargin: 18
                    anchors.topMargin: 18
                    width: parent.width * 0.68
                    height: 102
                    radius: 5
                    color: "#0b1224"
                    border.color: "#22304d"
                    border.width: 1

                    Rectangle {
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.right: parent.right
                        height: 20
                        radius: 4
                        color: "#111b33"

                        Rectangle {
                            anchors.left: parent.left
                            anchors.verticalCenter: parent.verticalCenter
                            anchors.leftMargin: 8
                            width: 48
                            height: 6
                            radius: 2
                            color: "#22304d"
                        }

                        Row {
                            anchors.right: parent.right
                            anchors.verticalCenter: parent.verticalCenter
                            anchors.rightMargin: 8
                            spacing: 6

                            Rectangle { width: 8; height: 2; anchors.verticalCenter: parent.verticalCenter; color: "#94a3b8" }
                            Rectangle { width: 8; height: 8; radius: 1; color: "transparent"; border.color: "#94a3b8"; border.width: 1 }
                            Rectangle { width: 8; height: 8; radius: 2; color: "#94a3b8" }
                        }
                    }

                    Column {
                        anchors.left: parent.left
                        anchors.top: parent.top
                        anchors.leftMargin: 12
                        anchors.topMargin: 32
                        width: parent.width - 24
                        spacing: 7

                        Rectangle { width: parent.width * 0.55; height: 7; radius: 2; color: "#22304d" }
                        Rectangle { width: parent.width * 0.78; height: 6; radius: 2; color: "#1c2842" }
                        Rectangle { width: parent.width * 0.64; height: 6; radius: 2; color: "#1c2842" }
                    }
                }

                // Bottom solid taskbar
                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.bottom: parent.bottom
                    height: 26
                    color: "#0b1224"

                    Rectangle {
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.top: parent.top
                        height: 1
                        color: "#22304d"
                    }

                    Row {
                        anchors.left: parent.left
                        anchors.verticalCenter: parent.verticalCenter
                        anchors.leftMargin: 10
                        spacing: 7

                        Rectangle { width: 12; height: 12; radius: 3; color: "#2dd4bf" }
                        Rectangle { width: 14; height: 12; radius: 2; color: "#22304d" }
                        Rectangle { width: 14; height: 12; radius: 2; color: "#22304d" }
                        Rectangle { width: 14; height: 12; radius: 2; color: "#1c2842" }
                    }

                    Row {
                        anchors.right: parent.right
                        anchors.verticalCenter: parent.verticalCenter
                        anchors.rightMargin: 10
                        spacing: 5

                        Rectangle { width: 8; height: 8; radius: 2; color: "#22304d" }
                        Rectangle { width: 22; height: 8; radius: 2; color: "#22304d" }
                    }
                }
            }

            // ---- Card 2: Mac style ----------------------------------------
            LookCard {
                lookId: "mac"
                title: "Mac style"
                subtitle: "Top menu bar, centered floating dock at the bottom, and window buttons on the top left."
                staggerMs: 50

                // Top translucent-look menu bar
                Rectangle {
                    anchors.left: parent.left
                    anchors.right: parent.right
                    anchors.top: parent.top
                    height: 18
                    color: "#111c36"

                    Rectangle {
                        anchors.left: parent.left
                        anchors.right: parent.right
                        anchors.bottom: parent.bottom
                        height: 1
                        color: "#22304d"
                    }

                    Row {
                        anchors.left: parent.left
                        anchors.verticalCenter: parent.verticalCenter
                        anchors.leftMargin: 9
                        spacing: 8

                        Rectangle { width: 8; height: 8; radius: 4; color: "#2dd4bf" }
                        Rectangle { width: 20; height: 5; radius: 2; color: "#cbd5e1"; anchors.verticalCenter: parent.verticalCenter }
                        Rectangle { width: 16; height: 5; radius: 2; color: "#64748b"; anchors.verticalCenter: parent.verticalCenter }
                        Rectangle { width: 16; height: 5; radius: 2; color: "#64748b"; anchors.verticalCenter: parent.verticalCenter }
                    }

                    Row {
                        anchors.right: parent.right
                        anchors.verticalCenter: parent.verticalCenter
                        anchors.rightMargin: 9
                        spacing: 5

                        Rectangle { width: 7; height: 7; radius: 2; color: "#64748b" }
                        Rectangle { width: 20; height: 5; radius: 2; color: "#cbd5e1"; anchors.verticalCenter: parent.verticalCenter }
                    }
                }

                // Stylized window (left-hand traffic-light dots)
                Rectangle {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.top: parent.top
                    anchors.topMargin: 28
                    width: parent.width * 0.68
                    height: 92
                    radius: 6
                    color: "#0b1224"
                    border.color: "#22304d"
                    border.width: 1

                    Rectangle {
                        anchors.top: parent.top
                        anchors.left: parent.left
                        anchors.right: parent.right
                        height: 20
                        radius: 5
                        color: "#111b33"

                        Row {
                            anchors.left: parent.left
                            anchors.verticalCenter: parent.verticalCenter
                            anchors.leftMargin: 9
                            spacing: 5

                            Rectangle { width: 8; height: 8; radius: 4; color: "#ef4444" }
                            Rectangle { width: 8; height: 8; radius: 4; color: "#f59e0b" }
                            Rectangle { width: 8; height: 8; radius: 4; color: "#22c55e" }
                        }

                        Rectangle {
                            anchors.centerIn: parent
                            width: 44
                            height: 5
                            radius: 2
                            color: "#22304d"
                        }
                    }

                    Column {
                        anchors.left: parent.left
                        anchors.top: parent.top
                        anchors.leftMargin: 12
                        anchors.topMargin: 32
                        width: parent.width - 24
                        spacing: 6

                        Rectangle { width: parent.width * 0.52; height: 7; radius: 2; color: "#22304d" }
                        Rectangle { width: parent.width * 0.74; height: 6; radius: 2; color: "#1c2842" }
                        Rectangle { width: parent.width * 0.60; height: 6; radius: 2; color: "#1c2842" }
                    }
                }

                // Centered floating dock
                Rectangle {
                    anchors.horizontalCenter: parent.horizontalCenter
                    anchors.bottom: parent.bottom
                    anchors.bottomMargin: 8
                    width: dockRow.implicitWidth + 18
                    height: 26
                    radius: 8
                    color: "#111c36"
                    border.color: "#22304d"
                    border.width: 1

                    Row {
                        id: dockRow
                        anchors.centerIn: parent
                        spacing: 7

                        Rectangle { width: 14; height: 14; radius: 4; color: "#2dd4bf" }
                        Rectangle { width: 14; height: 14; radius: 4; color: "#22304d" }
                        Rectangle { width: 14; height: 14; radius: 4; color: "#22304d" }
                        Rectangle { width: 14; height: 14; radius: 4; color: "#1c2842" }
                        Rectangle { width: 14; height: 14; radius: 4; color: "#22304d" }
                    }
                }
            }
        }

        QQC2.Label {
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            font.pixelSize: 12
            color: "#94a3b8"
            text: "Tip: After picking a style, you can still fine-tune your taskbar or dock size and hiding in Settings > Taskbar."
        }
    }
}
