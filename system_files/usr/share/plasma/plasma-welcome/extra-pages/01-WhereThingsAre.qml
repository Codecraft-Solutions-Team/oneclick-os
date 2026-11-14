// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.welcome as Welcome

Welcome.Page {
    id: root

    heading: i18n("Where things are")
    description: i18n("OneClick OS keeps your desktop familiar and predictable.")

    QQC2.ScrollView {
        id: scroller
        anchors.fill: parent
        clip: true
        QQC2.ScrollBar.horizontal.policy: QQC2.ScrollBar.AlwaysOff
        contentWidth: availableWidth

        ColumnLayout {
            width: scroller.availableWidth
            spacing: 14

            // Flat schematic preview of taskbar, Start menu, and app window using QtQuick Rectangles.
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: previewCol.implicitHeight + 24
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: previewCol
                    anchors.fill: parent
                    anchors.margins: 12
                    spacing: 10

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        Image {
                            Layout.preferredWidth: 112
                            Layout.preferredHeight: 24
                            fillMode: Image.PreserveAspectFit
                            smooth: true
                            mipmap: true
                            source: "file:///usr/share/oneclick/wordmark.svg"
                        }

                        Item { Layout.fillWidth: true }

                        QQC2.Label {
                            text: i18n("Desktop layout overview")
                            color: "#94a3b8"
                            font.pixelSize: 12
                        }
                    }

                    Rectangle {
                        id: screenBox
                        Layout.fillWidth: true
                        implicitHeight: 210
                        color: "#0a1020"
                        border.color: "#22304d"
                        border.width: 1
                        radius: 6
                        clip: true

                        // Open Start menu card at bottom-left
                        Rectangle {
                            id: startMock
                            x: 10
                            anchors.bottom: taskbarMock.top
                            anchors.bottomMargin: 6
                            width: Math.min(200, Math.round(screenBox.width * 0.42))
                            height: 150
                            color: "#0b1224"
                            border.color: "#22304d"
                            border.width: 1
                            radius: 6

                            ColumnLayout {
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 6

                                // Search bar inside Start menu
                                Rectangle {
                                    Layout.fillWidth: true
                                    height: 22
                                    color: "#0a1020"
                                    border.color: "#2dd4bf"
                                    border.width: 1
                                    radius: 4

                                    QQC2.Label {
                                        anchors.left: parent.left
                                        anchors.leftMargin: 8
                                        anchors.verticalCenter: parent.verticalCenter
                                        text: i18n("Search apps, files, settings...")
                                        color: "#94a3b8"
                                        font.pixelSize: 10
                                    }
                                }

                                QQC2.Label {
                                    text: i18n("Pinned")
                                    color: "#94a3b8"
                                    font.pixelSize: 10
                                    font.weight: Font.DemiBold
                                }

                                GridLayout {
                                    Layout.fillWidth: true
                                    Layout.fillHeight: true
                                    columns: 4
                                    rowSpacing: 5
                                    columnSpacing: 5

                                    Repeater {
                                        model: ["#2dd4bf", "#cbd5e1", "#22304d", "#94a3b8", "#2dd4bf", "#ffffff", "#22304d", "#cbd5e1"]
                                        delegate: Rectangle {
                                            required property string modelData
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            color: "#111b33"
                                            border.color: "#22304d"
                                            border.width: 1
                                            radius: 4

                                            Rectangle {
                                                width: 14
                                                height: 14
                                                radius: 3
                                                anchors.centerIn: parent
                                                color: modelData
                                            }
                                        }
                                    }
                                }

                                RowLayout {
                                    Layout.fillWidth: true
                                    QQC2.Label {
                                        text: i18n("All Apps")
                                        color: "#cbd5e1"
                                        font.pixelSize: 10
                                    }
                                    Item { Layout.fillWidth: true }
                                    Rectangle {
                                        width: 36
                                        height: 14
                                        radius: 3
                                        color: "#111b33"
                                        border.color: "#22304d"
                                        border.width: 1
                                        QQC2.Label {
                                            anchors.centerIn: parent
                                            text: i18n("Power")
                                            color: "#cbd5e1"
                                            font.pixelSize: 9
                                        }
                                    }
                                }
                            }
                        }

                        // Sample open app window on the right
                        Rectangle {
                            anchors.left: startMock.right
                            anchors.leftMargin: 12
                            anchors.right: parent.right
                            anchors.rightMargin: 12
                            anchors.top: parent.top
                            anchors.topMargin: 14
                            anchors.bottom: taskbarMock.top
                            anchors.bottomMargin: 14
                            visible: width > 120
                            color: "#0b1224"
                            border.color: "#22304d"
                            border.width: 1
                            radius: 6

                            Rectangle {
                                id: titleBarMock
                                anchors.top: parent.top
                                anchors.left: parent.left
                                anchors.right: parent.right
                                height: 22
                                color: "#111b33"
                                radius: 6

                                Rectangle {
                                    anchors.bottom: parent.bottom
                                    anchors.left: parent.left
                                    anchors.right: parent.right
                                    height: 6
                                    color: "#111b33"
                                }

                                QQC2.Label {
                                    anchors.left: parent.left
                                    anchors.leftMargin: 8
                                    anchors.verticalCenter: parent.verticalCenter
                                    text: i18n("Files")
                                    color: "#ffffff"
                                    font.pixelSize: 10
                                    font.weight: Font.DemiBold
                                }

                                Row {
                                    anchors.right: parent.right
                                    anchors.rightMargin: 8
                                    anchors.verticalCenter: parent.verticalCenter
                                    spacing: 5
                                    Rectangle { width: 7; height: 7; radius: 3.5; color: "#94a3b8" }
                                    Rectangle { width: 7; height: 7; radius: 3.5; color: "#94a3b8" }
                                    Rectangle { width: 7; height: 7; radius: 3.5; color: "#2dd4bf" }
                                }
                            }

                            RowLayout {
                                anchors.top: titleBarMock.bottom
                                anchors.left: parent.left
                                anchors.right: parent.right
                                anchors.bottom: parent.bottom
                                anchors.margins: 8
                                spacing: 8

                                Rectangle {
                                    Layout.preferredWidth: 54
                                    Layout.fillHeight: true
                                    color: "#0a1020"
                                    border.color: "#22304d"
                                    border.width: 1
                                    radius: 4
                                }

                                GridLayout {
                                    Layout.fillWidth: true
                                    Layout.fillHeight: true
                                    columns: 3
                                    columnSpacing: 6
                                    rowSpacing: 6
                                    Repeater {
                                        model: 6
                                        delegate: Rectangle {
                                            Layout.fillWidth: true
                                            Layout.fillHeight: true
                                            color: "#0a1020"
                                            border.color: "#22304d"
                                            border.width: 1
                                            radius: 4
                                        }
                                    }
                                }
                            }
                        }

                        // Bottom taskbar
                        Rectangle {
                            id: taskbarMock
                            anchors.left: parent.left
                            anchors.right: parent.right
                            anchors.bottom: parent.bottom
                            height: 30
                            color: "#0b1224"
                            border.color: "#22304d"
                            border.width: 1

                            RowLayout {
                                anchors.fill: parent
                                anchors.leftMargin: 8
                                anchors.rightMargin: 10
                                spacing: 6

                                // Start button with teal ring
                                Rectangle {
                                    Layout.preferredWidth: 52
                                    Layout.preferredHeight: 20
                                    radius: 4
                                    color: "#111b33"
                                    border.color: "#2dd4bf"
                                    border.width: 1

                                    Row {
                                        anchors.centerIn: parent
                                        spacing: 4
                                        Rectangle {
                                            width: 10
                                            height: 10
                                            radius: 5
                                            anchors.verticalCenter: parent.verticalCenter
                                            color: "transparent"
                                            border.color: "#2dd4bf"
                                            border.width: 2
                                            Rectangle {
                                                width: 3
                                                height: 3
                                                radius: 1.5
                                                anchors.centerIn: parent
                                                color: "#ffffff"
                                            }
                                        }
                                        QQC2.Label {
                                            text: i18n("Start")
                                            color: "#ffffff"
                                            font.pixelSize: 10
                                            font.weight: Font.DemiBold
                                            anchors.verticalCenter: parent.verticalCenter
                                        }
                                    }
                                }

                                Repeater {
                                    model: ["#2dd4bf", "#cbd5e1", "#22304d", "#94a3b8"]
                                    delegate: Rectangle {
                                        required property string modelData
                                        Layout.preferredWidth: 18
                                        Layout.preferredHeight: 18
                                        radius: 3
                                        color: modelData
                                    }
                                }

                                Item { Layout.fillWidth: true }

                                // System tray dots + clock
                                Row {
                                    spacing: 6
                                    Rectangle { width: 8; height: 8; radius: 4; anchors.verticalCenter: parent.verticalCenter; color: "#2dd4bf" }
                                    Rectangle { width: 8; height: 8; radius: 2; anchors.verticalCenter: parent.verticalCenter; color: "#94a3b8" }
                                    Rectangle { width: 8; height: 8; radius: 2; anchors.verticalCenter: parent.verticalCenter; color: "#94a3b8" }
                                    QQC2.Label {
                                        text: "10:30"
                                        color: "#ffffff"
                                        font.pixelSize: 10
                                        font.weight: Font.DemiBold
                                        anchors.verticalCenter: parent.verticalCenter
                                    }
                                }
                            }
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 12
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("1. Start menu (bottom-left)")
                            color: "#2dd4bf"
                            font.pixelSize: 12
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("2. Taskbar & pinned apps (bottom)")
                            color: "#cbd5e1"
                            font.pixelSize: 12
                            horizontalAlignment: Text.AlignHCenter
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("3. Wi-Fi, sound & clock (bottom-right)")
                            color: "#cbd5e1"
                            font.pixelSize: 12
                            horizontalAlignment: Text.AlignRight
                            wrapMode: Text.Wrap
                        }
                    }
                }
            }

            // Three clear flat explanation cards
            GridLayout {
                Layout.fillWidth: true
                columns: scroller.availableWidth > 680 ? 3 : 1
                columnSpacing: 12
                rowSpacing: 12

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    implicitHeight: c1.implicitHeight + 24
                    color: "#0b1224"
                    border.color: "#22304d"
                    border.width: 1
                    radius: 8

                    ColumnLayout {
                        id: c1
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 6
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Start menu (bottom-left)")
                            color: "#2dd4bf"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Press the Windows key on your keyboard or click Start at bottom-left. Start typing anytime to search apps, files, and Settings pages.")
                            color: "#cbd5e1"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    implicitHeight: c2.implicitHeight + 24
                    color: "#0b1224"
                    border.color: "#22304d"
                    border.width: 1
                    radius: 8

                    ColumnLayout {
                        id: c2
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 6
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Taskbar at the bottom")
                            color: "#ffffff"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Switch between open windows, pin your favorite apps, and check Wi-Fi, volume, and clock at the bottom-right. Auto-hide or center it in Taskbar settings.")
                            color: "#cbd5e1"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    implicitHeight: c3.implicitHeight + 24
                    color: "#0b1224"
                    border.color: "#22304d"
                    border.width: 1
                    radius: 8

                    ColumnLayout {
                        id: c3
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 6
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Settings & Task Manager")
                            color: "#ffffff"
                            font.pixelSize: 14
                            font.weight: Font.DemiBold
                            wrapMode: Text.Wrap
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            text: i18n("Open Settings from Start for display, network, updates, cloud drives, or Windows apps. Press Ctrl+Shift+Esc anytime for Task Manager.")
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
                    id: settingsBtn
                    text: i18n("Open Settings")
                    onClicked: Welcome.Controller.runCommand("systemsettings")
                    background: Rectangle {
                        color: settingsBtn.hovered ? "#22304d" : "#0b1224"
                        border.color: "#2dd4bf"
                        border.width: 1
                        radius: 6
                    }
                    contentItem: QQC2.Label {
                        text: settingsBtn.text
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
                    id: taskbarBtn
                    text: i18n("Taskbar Settings")
                    onClicked: Welcome.Controller.runCommand("systemsettings kcm_oneclick_taskbar")
                    background: Rectangle {
                        color: taskbarBtn.hovered ? "#22304d" : "#0b1224"
                        border.color: "#22304d"
                        border.width: 1
                        radius: 6
                    }
                    contentItem: QQC2.Label {
                        text: taskbarBtn.text
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
