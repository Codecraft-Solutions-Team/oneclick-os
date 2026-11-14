// SPDX-FileCopyrightText: 2025 Carl Schwan <carl@carlschwan.eu>
// SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>
// SPDX-FileCopyrightText: 2026 Jesús T. <hello.triplean.dev@gmail.com>
// SPDX-FileCopyrightText: 2026 Tiziano Gaia <ti.gaia@proton.me>
//
// SPDX-License-Identifier: LGPL-2.0-or-later

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.kirigamiaddons.components as KirigamiComponents
import org.kde.plasmasetup
import org.kde.plasmasetup.components as PlasmaSetupComponents

PlasmaSetupComponents.SetupModule {
    id: root

    cardWidth: Math.min(Kirigami.Units.gridUnit * 32, root.contentItem.width - Kirigami.Units.gridUnit * 2)

    available: !AccountController.hasExistingUsers
    property bool usernameValid: AccountController.isUsernameValid(usernameField.text)
    property string usernameValidationMessage: AccountController.usernameValidationMessage(usernameField.text)

    nextEnabled: root.usernameValid && passwordField.text.length > 0 && repeatField.text === passwordField.text

    function onPageActivated(): void {
        fullNameField.forceActiveFocus();
    }

    function ensureVisible(item: Item): void {
        const flickable = scroll.contentItem;
        const itemPos = item.mapToItem(flickable.contentItem, 0, 0);
        const margin = Kirigami.Units.gridUnit;
        const itemTop = itemPos.y;
        const itemBottom = itemPos.y + item.height;
        const visibleTop = flickable.contentY;
        const visibleBottom = visibleTop + flickable.height;

        if (itemTop < visibleTop + margin) {
            flickable.contentY = Math.max(0, itemTop - margin);
        } else if (itemBottom > visibleBottom - margin) {
            flickable.contentY = itemBottom - flickable.height + margin;
        }
    }

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(640, Kirigami.Units.gridUnit * 36)
        implicitHeight: Math.max(520, Kirigami.Units.gridUnit * 34)

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

            ColumnLayout {
                id: mainColumn
                width: scroll.availableWidth
                height: Math.max(implicitHeight, scroll.availableHeight)

                Item { Layout.fillHeight: true }

                Rectangle {
                    Layout.alignment: Qt.AlignHCenter
                    Layout.fillWidth: true
                    Layout.maximumWidth: Kirigami.Units.gridUnit * 34
                    Layout.leftMargin: Kirigami.Units.gridUnit
                    Layout.rightMargin: Kirigami.Units.gridUnit
                    implicitHeight: cardCol.implicitHeight + Kirigami.Units.gridUnit * 3
                    color: "#0b1224"
                    border.color: "#22304d"
                    border.width: 1
                    radius: 10

                    ColumnLayout {
                        id: cardCol
                        anchors.fill: parent
                        anchors.margins: Kirigami.Units.gridUnit * 1.5
                        spacing: Kirigami.Units.largeSpacing

                        Image {
                            Layout.alignment: Qt.AlignHCenter
                            Layout.preferredHeight: 32
                            Layout.preferredWidth: 150
                            fillMode: Image.PreserveAspectFit
                            smooth: true
                            mipmap: true
                            source: "file:///usr/share/oneclick/wordmark.svg"
                        }

                        KirigamiComponents.AvatarButton {
                            id: avatar
                            Layout.alignment: Qt.AlignHCenter
                            implicitWidth: Kirigami.Units.gridUnit * 4.5
                            implicitHeight: implicitWidth
                            name: fullNameField.text
                            enabled: false
                        }

                        ColumnLayout {
                            Layout.fillWidth: true
                            spacing: 4

                            Label {
                                Layout.fillWidth: true
                                text: i18n("Create your PC account")
                                color: "#ffffff"
                                font.pixelSize: 20
                                font.weight: Font.DemiBold
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                            }

                            Label {
                                Layout.fillWidth: true
                                text: i18n("Stored locally on this PC only. No online account or sign-in is required.")
                                color: "#94a3b8"
                                font.pixelSize: 13
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                            }
                        }

                        Item {
                            Layout.fillWidth: true
                            implicitHeight: Math.max(administratorLabel.implicitHeight, helpButton.implicitHeight)

                            Label {
                                id: administratorLabel
                                anchors.horizontalCenter: parent.horizontalCenter
                                width: Math.min(implicitWidth, cardCol.width - helpButton.implicitWidth - Kirigami.Units.largeSpacing)
                                text: i18nc("@info", "This account has administrator permission on this PC.")
                                color: "#2dd4bf"
                                font.pixelSize: 12
                                horizontalAlignment: Text.AlignHCenter
                                wrapMode: Text.Wrap
                            }

                            Kirigami.ContextualHelpButton {
                                id: helpButton
                                anchors.left: administratorLabel.right
                                anchors.verticalCenter: administratorLabel.verticalCenter
                                toolTipText: xi18nc("@info", "Administrator permission lets you change system settings, install software, and manage updates.<nl/><nl/>Pick a strong password you will remember.")
                            }
                        }

                        Kirigami.FormLayout {
                            Layout.fillWidth: true

                            TextField {
                                id: fullNameField
                                Kirigami.FormData.label: i18nc("@label:textbox", "Full Name")
                                color: "#ffffff"
                                placeholderTextColor: "#64748b"
                                background: Rectangle {
                                    color: "#0a1020"
                                    border.color: fullNameField.activeFocus ? "#2dd4bf" : "#22304d"
                                    border.width: 1
                                    radius: 6
                                }
                                onActiveFocusChanged: {
                                    if (activeFocus) {
                                        Qt.callLater(() => root.ensureVisible(fullNameField));
                                    }
                                }
                                property string previousText: ""
                                onTextChanged: {
                                    if (usernameField.text.length === 0 || usernameField.text === previousText) {
                                        usernameField.text = previousText = AccountController.sanitizeUsername(fullNameField.text);
                                    }
                                }
                                Binding {
                                    target: AccountController
                                    property: "fullName"
                                    value: fullNameField.text
                                }
                            }

                            TextField {
                                id: usernameField
                                Kirigami.FormData.label: i18nc("@label:textbox", "Username")
                                color: "#ffffff"
                                placeholderTextColor: "#64748b"
                                inputMethodHints: Qt.ImhNoAutoUppercase | Qt.ImhNoPredictiveText
                                background: Rectangle {
                                    color: "#0a1020"
                                    border.color: usernameField.activeFocus ? "#2dd4bf" : "#22304d"
                                    border.width: 1
                                    radius: 6
                                }
                                onActiveFocusChanged: {
                                    if (activeFocus) {
                                        Qt.callLater(() => root.ensureVisible(usernameField));
                                    }
                                }
                                Binding {
                                    target: AccountController
                                    property: "username"
                                    value: usernameField.text
                                }
                            }

                            Kirigami.InlineMessage {
                                Layout.fillWidth: true
                                type: Kirigami.MessageType.Error
                                text: root.usernameValidationMessage
                                visible: root.usernameValidationMessage.length > 0 && usernameField.text.length > 0
                            }

                            Kirigami.PasswordField {
                                id: passwordField
                                Kirigami.FormData.label: i18nc("@label:textbox", "Password")
                                color: "#ffffff"
                                placeholderText: ""
                                background: Rectangle {
                                    color: "#0a1020"
                                    border.color: passwordField.activeFocus ? "#2dd4bf" : "#22304d"
                                    border.width: 1
                                    radius: 6
                                }
                                onActiveFocusChanged: {
                                    if (activeFocus) {
                                        Qt.callLater(() => root.ensureVisible(passwordField));
                                    }
                                }
                                onTextChanged: debouncer.reset()
                                Binding {
                                    target: AccountController
                                    property: "password"
                                    value: passwordField.text
                                }
                            }

                            Kirigami.PasswordField {
                                id: repeatField
                                Kirigami.FormData.label: i18nc("@label:textbox", "Confirm Password")
                                color: "#ffffff"
                                placeholderText: ""
                                background: Rectangle {
                                    color: "#0a1020"
                                    border.color: repeatField.activeFocus ? "#2dd4bf" : "#22304d"
                                    border.width: 1
                                    radius: 6
                                }
                                onActiveFocusChanged: {
                                    if (activeFocus) {
                                        Qt.callLater(() => root.ensureVisible(repeatField));
                                    }
                                }
                                onAccepted: {
                                    if (root.nextEnabled) {
                                        root.nextRequested();
                                    }
                                }
                                onTextChanged: debouncer.reset()
                                onEditingFinished: debouncer.isTriggered = true
                            }

                            PlasmaSetupComponents.Debouncer {
                                id: debouncer
                            }

                            Kirigami.InlineMessage {
                                id: passwordWarning
                                Layout.fillWidth: true
                                type: Kirigami.MessageType.Error
                                text: i18n("Passwords must match.")
                                visible: passwordField.text !== "" && repeatField.text !== "" && passwordField.text !== repeatField.text && debouncer.isTriggered
                            }
                        }
                    }
                }

                Item { Layout.fillHeight: true }
            }
        }
    }
}
