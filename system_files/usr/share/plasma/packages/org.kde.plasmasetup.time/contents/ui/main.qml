// SPDX-FileCopyrightText: 2023 Devin Lin <devin@kde.org>
// SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>
//
// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasmasetup.timeutil as Time
import org.kde.plasma.workspace.timezoneselector as TimeZone
import org.kde.plasmasetup.components as PlasmaSetupComponents

PlasmaSetupComponents.SetupModule {
    id: root

    readonly property bool animationsEnabled: Kirigami.Units.longDuration > 0
    readonly property int animLong: animationsEnabled ? Kirigami.Units.longDuration : 0

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(680, Kirigami.Units.gridUnit * 40)
        implicitHeight: Math.max(500, Kirigami.Units.gridUnit * 36)

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
            width: Math.min(parent.width - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 42)
            height: Math.min(parent.height - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 36)
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            radius: 10
            opacity: root.animationsEnabled ? 0 : 1
            Component.onCompleted: opacity = 1
            Behavior on opacity {
                enabled: root.animationsEnabled
                NumberAnimation { duration: root.animLong; easing.type: Easing.OutCubic }
            }

            ColumnLayout {
                id: mainColumn
                anchors.fill: parent
                anchors.margins: Kirigami.Units.gridUnit * 1.5
                spacing: Kirigami.Units.largeSpacing

                Image {
                    Layout.alignment: Qt.AlignHCenter
                    Layout.preferredHeight: 34
                    Layout.preferredWidth: 160
                    fillMode: Image.PreserveAspectFit
                    smooth: true
                    mipmap: true
                    source: "file:///usr/share/oneclick/wordmark.svg"
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Label {
                        Layout.fillWidth: true
                        text: i18n("Set your time zone")
                        color: "#ffffff"
                        font.pixelSize: 20
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }

                    Label {
                        Layout.fillWidth: true
                        text: i18n("Select your city or region so your taskbar clock matches where you live.")
                        color: "#94a3b8"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }
                }

                Rectangle {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    color: "#0a1020"
                    border.color: "#22304d"
                    border.width: 1
                    radius: 8
                    clip: true

                    TimeZone.TimezoneSelector {
                        id: tzSelector
                        anchors.centerIn: parent
                        width: Kirigami.Settings.isMobile
                            ? Math.min(parent.width, Kirigami.Units.gridUnit * 24)
                            : parent.width - Kirigami.Units.largeSpacing * 2
                        height: Kirigami.Settings.isMobile
                            ? implicitHeight
                            : parent.height - Kirigami.Units.largeSpacing * 2
                        Component.onCompleted: {
                            selectedTimeZone = Time.TimeUtil.currentTimeZone;
                        }
                        onSelectedTimeZoneChanged: Time.TimeUtil.currentTimeZone = selectedTimeZone
                    }
                }
            }
        }
    }
}
