// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.welcome as Welcome

Welcome.Page {
    id: root

    heading: i18n("Coming from Windows")
    description: i18n("An honest guide to what runs right away and what works differently on OneClick OS.")

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

            // What works out of the box
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: worksCol.implicitHeight + 24
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: worksCol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 8

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("What works right away")
                        color: "#2dd4bf"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        wrapMode: Text.Wrap
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("- Everyday browsing, video, music, photos, PDFs, email, and web apps work out of the box.")
                        color: "#cbd5e1"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("- Most PC games on Steam and Heroic Games Launcher run smoothly with built-in Proton compatibility.")
                        color: "#cbd5e1"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("- Many offline Windows .exe programs and installers run inside Bottles or through Settings > Windows Apps.")
                        color: "#cbd5e1"
                        font.pixelSize: 13
                        wrapMode: Text.Wrap
                    }
                }
            }

            // What does not work natively and alternatives
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: diffCol.implicitHeight + 24
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: diffCol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 10

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("What does not work natively (and what to use instead)")
                        color: "#ffffff"
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        wrapMode: Text.Wrap
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Kernel-level anti-cheat multiplayer games (Valorant, Fortnite, Call of Duty, Apex Legends)")
                            color: "#2dd4bf"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Windows kernel drivers cannot run on Linux. Play them at full speed using GeForce NOW or Xbox Cloud Gaming shortcuts in the Start menu.")
                            color: "#cbd5e1"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Adobe Creative Cloud desktop apps (Photoshop, Premiere Pro, Illustrator)")
                            color: "#2dd4bf"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Use GIMP or Krita for photos and illustration, Kdenlive for video editing, Inkscape for vector design, or browser-based editors.")
                            color: "#cbd5e1"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Desktop Microsoft Office installer")
                            color: "#2dd4bf"
                            font.pixelSize: 13
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Use LibreOffice (already set up to open and save .docx, .xlsx, .pptx, and .odt files) or open Word, Excel, and PowerPoint on the web from Start.")
                            color: "#cbd5e1"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }
                    }
                }
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 10

                QQC2.Button {
                    id: winAppsBtn
                    text: i18n("Open Windows Apps Settings")
                    onClicked: Welcome.Controller.runCommand("systemsettings kcm_oneclick_windows")
                    scale: !root.animationsEnabled ? 1 : (down ? 0.98 : (hovered ? 1.02 : 1))
                    Behavior on scale {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
                    }
                    background: Rectangle {
                        color: winAppsBtn.hovered ? "#22304d" : "#0b1224"
                        border.color: "#2dd4bf"
                        border.width: 1
                        radius: 6
                        Behavior on color {
                            enabled: root.animationsEnabled
                            ColorAnimation { duration: root.animFast }
                        }
                    }
                    contentItem: QQC2.Label {
                        text: winAppsBtn.text
                        color: "#ffffff"
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 14
                        rightPadding: 14
                        topPadding: 8
                        bottomPadding: 8
                    }
                }

                QQC2.Button {
                    id: cloudBtn
                    text: i18n("Open Cloud Drives Settings")
                    onClicked: Welcome.Controller.runCommand("systemsettings kcm_oneclick_cloud")
                    scale: !root.animationsEnabled ? 1 : (down ? 0.98 : (hovered ? 1.02 : 1))
                    Behavior on scale {
                        enabled: root.animationsEnabled
                        NumberAnimation { duration: root.animFast; easing.type: Easing.OutCubic }
                    }
                    background: Rectangle {
                        color: cloudBtn.hovered ? "#22304d" : "#0b1224"
                        border.color: cloudBtn.hovered ? "#2dd4bf" : "#22304d"
                        border.width: 1
                        radius: 6
                        Behavior on color {
                            enabled: root.animationsEnabled
                            ColorAnimation { duration: root.animFast }
                        }
                        Behavior on border.color {
                            enabled: root.animationsEnabled
                            ColorAnimation { duration: root.animFast }
                        }
                    }
                    contentItem: QQC2.Label {
                        text: cloudBtn.text
                        color: "#cbd5e1"
                        horizontalAlignment: Text.AlignHCenter
                        verticalAlignment: Text.AlignVCenter
                        leftPadding: 14
                        rightPadding: 14
                        topPadding: 8
                        bottomPadding: 8
                    }
                }

                Item { Layout.fillWidth: true }
            }
        }
    }
}
