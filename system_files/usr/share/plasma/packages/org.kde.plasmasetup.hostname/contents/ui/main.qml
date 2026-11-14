// SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>
//
// SPDX-License-Identifier: LGPL-2.1-or-later

pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasmasetup
import org.kde.plasmasetup.components as PlasmaSetupComponents
import org.kde.plasmasetup.hostnameutil

PlasmaSetupComponents.SetupModule {
    id: root

    readonly property bool animationsEnabled: Kirigami.Units.longDuration > 0
    readonly property int animFast: animationsEnabled ? Math.max(40, Math.round(Kirigami.Units.shortDuration * 0.6)) : 0
    readonly property int animLong: animationsEnabled ? Kirigami.Units.longDuration : 0

    available: HostnameUtil.hostnameIsDefault()

    property bool hasEdited: false
    property bool validationPending: false
    property bool debouncedHostnameValid: false
    property string debouncedHostnameMessage: ""

    function onPageActivated(): void {
        if (HostnameUtil.hostname === "localhost" || HostnameUtil.hostname === "localhost.localdomain") {
            const username = AccountController.username;
            const prefix = username.length > 0 ? username : "oneclick";
            hostnameField.text = prefix + "-pc";
        }
        hostnameField.forceActiveFocus();
    }

    function updateValidation(): void {
        debouncedHostnameValid = HostnameUtil.isHostnameValid(hostnameField.text);
        debouncedHostnameMessage = HostnameUtil.hostnameValidationMessage(hostnameField.text);
        validationPending = false;
    }

    Component.onCompleted: updateValidation()

    nextEnabled: !root.validationPending && root.debouncedHostnameValid

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(640, Kirigami.Units.gridUnit * 36)
        implicitHeight: Math.max(440, Kirigami.Units.gridUnit * 30)

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

        ScrollView {
            id: scroll
            anchors.fill: parent
            clip: true

            Item {
                width: scroll.availableWidth
                height: Math.max(card.implicitHeight + Kirigami.Units.gridUnit * 2, scroll.availableHeight)

                Rectangle {
                    id: card
                    anchors.centerIn: parent
                    width: Math.min(parent.width - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 32)
                    implicitHeight: mainColumn.implicitHeight + Kirigami.Units.gridUnit * 3
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
                        spacing: Kirigami.Units.gridUnit

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
                                text: i18nc("@info:usagetip", "Name this PC")
                                color: "#ffffff"
                                font.pixelSize: 20
                                font.weight: Font.DemiBold
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                            }

                            Label {
                                Layout.fillWidth: true
                                text: i18n("Give this computer a recognizable name on your local network.")
                                color: "#94a3b8"
                                font.pixelSize: 13
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                            }
                        }

                        Kirigami.FormLayout {
                            Layout.fillWidth: true

                            TextField {
                                id: hostnameField
                                Kirigami.FormData.label: i18nc("@label:textbox", "PC Name:")
                                inputMethodHints: Qt.ImhNoAutoUppercase | Qt.ImhNoPredictiveText
                                color: "#ffffff"
                                placeholderTextColor: "#64748b"
                                Layout.fillWidth: true
                                Layout.minimumWidth: 0
                                text: HostnameUtil.hostname

                                background: Rectangle {
                                    color: "#0a1020"
                                    border.color: hostnameField.activeFocus ? "#2dd4bf" : "#22304d"
                                    border.width: 1
                                    radius: 6
                                    Behavior on border.color {
                                        enabled: root.animationsEnabled
                                        ColorAnimation { duration: root.animFast }
                                    }
                                }

                                onTextChanged: {
                                    root.hasEdited = true;
                                    root.validationPending = true;
                                    validationDebouncer.reset();
                                }

                                onAccepted: {
                                    if (root.nextEnabled) {
                                        root.nextRequested();
                                    }
                                }

                                onEditingFinished: {
                                    HostnameUtil.hostname = text;
                                    validationDebouncer.stop();
                                    root.updateValidation();
                                }
                            }

                            Kirigami.InlineMessage {
                                Layout.fillWidth: true
                                visible: root.hasEdited && !root.validationPending && root.debouncedHostnameMessage.length > 0
                                text: root.debouncedHostnameMessage
                                type: Kirigami.MessageType.Error
                            }

                            PlasmaSetupComponents.Debouncer {
                                id: validationDebouncer
                                onDebounced: root.updateValidation()
                            }
                        }
                    }
                }
            }
        }
    }
}
