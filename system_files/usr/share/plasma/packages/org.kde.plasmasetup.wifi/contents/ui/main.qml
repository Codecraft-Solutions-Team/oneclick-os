// SPDX-FileCopyrightText: 2017 Martin Kacej <m.kacej@atlas.sk>
// SPDX-FileCopyrightText: 2023 Devin Lin <devin@kde.org>
// SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>
//
// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.networkmanagement as PlasmaNM
import org.kde.plasmasetup.components as PlasmaSetupComponents

PlasmaSetupComponents.SetupModule {
    id: root

    readonly property bool animationsEnabled: Kirigami.Units.longDuration > 0
    readonly property int animLong: animationsEnabled ? Kirigami.Units.longDuration : 0

    available: availableDevices.wirelessDeviceAvailable

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(640, Kirigami.Units.gridUnit * 36)
        implicitHeight: Math.max(480, Kirigami.Units.gridUnit * 36)

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

        PlasmaNM.AvailableDevices {
            id: availableDevices
        }

        PlasmaNM.Handler {
            id: handler
        }

        PlasmaNM.EnabledConnections {
            id: enabledConnections
        }

        PlasmaNM.NetworkModel {
            id: connectionModel
        }

        PlasmaNM.MobileProxyModel {
            id: mobileProxyModel
            sourceModel: connectionModel
            showSavedMode: false
        }

        ConnectDialog {
            id: connectionDialog
            handler: handler
            parent: backdrop.Overlay.overlay
        }

        Component.onCompleted: handler.requestScan()

        Timer {
            id: scanTimer
            interval: 10200
            repeat: true
            running: backdrop.visible
            onTriggered: handler.requestScan()
        }

        Rectangle {
            id: card
            anchors.centerIn: parent
            width: Math.min(parent.width - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 34)
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
                        text: i18n("Connect to Wi-Fi")
                        color: "#ffffff"
                        font.pixelSize: 20
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }

                    Label {
                        Layout.fillWidth: true
                        text: i18n("Select a network to connect now, or skip and connect from the taskbar later.")
                        color: "#94a3b8"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }
                }

                ScrollView {
                    id: savedCard
                    Layout.fillWidth: true
                    visible: enabledConnections.wirelessEnabled && count > 0

                    background: Rectangle {
                        color: "#0a1020"
                        border.color: "#2dd4bf"
                        border.width: 1
                        radius: 8
                    }

                    property int count: 0
                    function updateCount(): void {
                        count = 0;
                        for (let i = 0; i < connectedRepeater.count; i++) {
                            const item = connectedRepeater.itemAt(i);
                            if (item && item.shouldDisplay) {
                                count++;
                            }
                        }
                    }

                    ColumnLayout {
                        id: column
                        width: savedCard.width

                        Repeater {
                            id: connectedRepeater
                            model: mobileProxyModel
                            delegate: ConnectionItemDelegate {
                                property bool shouldDisplay: (Uuid != "") || ConnectionState === PlasmaNM.Enums.Activated
                                onShouldDisplayChanged: savedCard.updateCount()
                                visible: (Uuid != "") || ConnectionState === PlasmaNM.Enums.Activated
                                Layout.fillWidth: true
                                hoverEnabled: false
                            }
                        }
                    }
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    visible: enabledConnections.wirelessEnabled
                    clip: true

                    background: Rectangle {
                        color: "#0a1020"
                        border.color: "#22304d"
                        border.width: 1
                        radius: 8
                    }

                    ListView {
                        clip: true
                        model: mobileProxyModel

                        delegate: ConnectionItemDelegate {
                            width: ListView.view.width
                            height: visible ? implicitHeight : 0
                            visible: !((Uuid != "") || ConnectionState === PlasmaNM.Enums.Activated)

                            onClicked: changeState()

                            property bool predictableWirelessPassword: !Uuid && Type == PlasmaNM.Enums.Wireless &&
                                (SecurityType == PlasmaNM.Enums.StaticWep ||
                                 SecurityType == PlasmaNM.Enums.WpaPsk ||
                                 SecurityType == PlasmaNM.Enums.Wpa2Psk ||
                                 SecurityType == PlasmaNM.Enums.SAE)

                            function changeState(): void {
                                if (Uuid || !predictableWirelessPassword) {
                                    if (ConnectionState == PlasmaNM.Enums.Deactivated) {
                                        if (!predictableWirelessPassword && !Uuid) {
                                            handler.addAndActivateConnection(DevicePath, SpecificPath);
                                        } else {
                                            handler.activateConnection(ConnectionPath, DevicePath, SpecificPath);
                                        }
                                    }
                                } else if (predictableWirelessPassword) {
                                    connectionDialog.headingText = i18n("Connect to") + " " + ItemUniqueName;
                                    connectionDialog.devicePath = DevicePath;
                                    connectionDialog.specificPath = SpecificPath;
                                    connectionDialog.securityType = SecurityType;
                                    connectionDialog.openAndClear();
                                }
                            }
                        }
                    }
                }
            }
        }
    }
}
