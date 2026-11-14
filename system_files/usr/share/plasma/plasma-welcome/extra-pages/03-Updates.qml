// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.welcome as Welcome

Welcome.Page {
    id: root

    heading: i18n("Updates are your choice")
    description: i18n("OneClick OS never installs updates behind your back or restarts your computer without permission.")

    readonly property bool animationsEnabled: Kirigami.Units.longDuration > 0
    readonly property int animFast: animationsEnabled ? Math.max(40, Math.round(Kirigami.Units.shortDuration * 0.6)) : 0
    readonly property int animLong: animationsEnabled ? Kirigami.Units.longDuration : 0

    QQC2.ScrollView {
        id: scroller
        anchors.fill: parent
        clip: true
        QQC2.ScrollBar.horizontal.policy: QQC2.ScrollBar.AlwaysOff
        contentWidth: availableWidth

        ColumnLayout {
            width: scroller.availableWidth
            spacing: 12
            opacity: root.animationsEnabled ? 0 : 1
            Component.onCompleted: opacity = 1
            Behavior on opacity {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animLong; easing.type: Easing.OutCubic }
            }

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: u1.implicitHeight + 24
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: u1
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 4
                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("You decide when to update")
                        color: "#2dd4bf"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        wrapMode: Text.Wrap
                    }
                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("OneClick OS never installs background updates automatically. Check for updates whenever you want, see the exact download size in MB and estimated time remaining, and choose before anything downloads or installs.")
                        color: "#cbd5e1"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: u2.implicitHeight + 24
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: u2
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 4
                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("Full updates vs. Security only")
                        color: "#ffffff"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        wrapMode: Text.Wrap
                    }
                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("Choose Full updates for the latest apps and system improvements, or Security only if you want your setup to stay unchanged except for critical safety fixes.")
                        color: "#cbd5e1"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }
                }
            }

            Rectangle {
                Layout.fillWidth: true
                implicitHeight: u3.implicitHeight + 24
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: u3
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 4
                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("Undo the last update in one click")
                        color: "#ffffff"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        wrapMode: Text.Wrap
                    }
                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("Every system update keeps your previous working system ready alongside the new one. If anything ever feels wrong after an update, click Undo last update in Settings and reboot back to normal.")
                        color: "#cbd5e1"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                Layout.topMargin: 4
                spacing: 10

                QQC2.Button {
                    id: openUpdateBtn
                    text: i18n("Open Update Settings")
                    onClicked: Welcome.Controller.runCommand("systemsettings kcm_oneclick_update")
                    scale: !root.animationsEnabled ? 1 : (down ? 0.98 : (hovered ? 1.02 : 1))
                    Behavior on scale {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
                    }
                    background: Rectangle {
                        color: openUpdateBtn.hovered ? "#5eead4" : "#2dd4bf"
                        radius: 6
                        Behavior on color {
                            enabled: root.animationsEnabled
                            ColorAnimation { duration: root.animFast }
                        }
                    }
                    contentItem: QQC2.Label {
                        text: openUpdateBtn.text
                        color: "#042f2e"
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 16
                        rightPadding: 16
                        topPadding: 9
                        bottomPadding: 9
                    }
                }

                Item { Layout.fillWidth: true }
            }
        }
    }
}
