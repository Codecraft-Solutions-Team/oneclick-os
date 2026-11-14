// SPDX-FileCopyrightText: 2023 Devin Lin <devin@kde.org>
// SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>
//
// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasmasetup.prepareutil as Prepare
import org.kde.plasmasetup.components as PlasmaSetupComponents

PlasmaSetupComponents.SetupModule {
    id: root

    cardWidth: Math.min(Kirigami.Units.gridUnit * 32, root.contentItem.width - Kirigami.Units.gridUnit * 2)
    nextEnabled: true

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(640, card.implicitWidth + Kirigami.Units.gridUnit * 2)
        implicitHeight: Math.max(440, card.implicitHeight + Kirigami.Units.gridUnit * 2)

        Kirigami.Theme.inherit: false
        Kirigami.Theme.colorSet: Kirigami.Theme.Window
        Kirigami.Theme.backgroundColor: "#0a1020"
        Kirigami.Theme.alternateBackgroundColor: "#0b1224"
        Kirigami.Theme.textColor: "#ffffff"
        Kirigami.Theme.disabledTextColor: "#64748b"
        Kirigami.Theme.highlightColor: "#2dd4bf"
        Kirigami.Theme.highlightedTextColor: "#042f2e"
        Kirigami.Theme.focusColor: "#2dd4bf"
        Kirigami.Theme.hoverColor: "#22304d"

        Rectangle {
            id: card
            anchors.centerIn: parent
            width: Math.min(parent.width - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 34)
            implicitHeight: innerCol.implicitHeight + Kirigami.Units.gridUnit * 3
            height: Math.min(parent.height - Kirigami.Units.gridUnit * 2, implicitHeight)
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            radius: 10

            ColumnLayout {
                id: innerCol
                anchors.fill: parent
                anchors.margins: Kirigami.Units.gridUnit * 1.5
                spacing: Kirigami.Units.gridUnit

                Image {
                    Layout.alignment: Qt.AlignHCenter
                    Layout.preferredHeight: 38
                    Layout.preferredWidth: 180
                    fillMode: Image.PreserveAspectFit
                    smooth: true
                    mipmap: true
                    source: "file:///usr/share/oneclick/wordmark.svg"
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 6

                    Label {
                        Layout.fillWidth: true
                        text: i18n("Welcome to OneClick OS")
                        color: "#ffffff"
                        font.pixelSize: 22
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }

                    Label {
                        Layout.fillWidth: true
                        text: i18n("No online account required, no background surprises, and everything stays easy to change later in Settings.")
                        color: "#94a3b8"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    implicitHeight: themeRow.implicitHeight + 24
                    color: "#0a1020"
                    border.color: "#22304d"
                    border.width: 1
                    radius: 8

                    RowLayout {
                        id: themeRow
                        anchors.fill: parent
                        anchors.margins: 12
                        spacing: 12

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 2

                            Label {
                                Layout.fillWidth: true
                                text: i18n("Dark Navy theme")
                                color: "#ffffff"
                                font.pixelSize: 14
                                font.weight: Font.DemiBold
                            }

                            Label {
                                Layout.fillWidth: true
                                text: i18n("Recommended for low-glare reading. You can switch anytime in Settings.")
                                color: "#94a3b8"
                                font.pixelSize: 12
                                wrapMode: Text.Wrap
                            }
                        }

                        Switch {
                            id: darkThemeSwitch
                            checked: Prepare.PrepareUtil.usingDarkTheme

                            onCheckedChanged: {
                                if (checked !== Prepare.PrepareUtil.usingDarkTheme) {
                                    Prepare.PrepareUtil.usingDarkTheme = checked;
                                }
                            }

                            indicator: Rectangle {
                                implicitWidth: 44
                                implicitHeight: 24
                                radius: 12
                                color: darkThemeSwitch.checked ? "#2dd4bf" : "#0b1224"
                                border.color: darkThemeSwitch.checked ? "#2dd4bf" : "#22304d"
                                border.width: 1

                                Rectangle {
                                    x: darkThemeSwitch.checked ? parent.width - width - 3 : 3
                                    anchors.verticalCenter: parent.verticalCenter
                                    width: 18
                                    height: 18
                                    radius: 9
                                    color: darkThemeSwitch.checked ? "#042f2e" : "#94a3b8"
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
