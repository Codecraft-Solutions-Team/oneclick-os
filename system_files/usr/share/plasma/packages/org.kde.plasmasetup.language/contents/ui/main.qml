// SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>
// SPDX-FileCopyrightText: 2026 Tiziano Gaia <ti.gaia@proton.me>
// SPDX-License-Identifier: LGPL-2.1-or-later

pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Controls
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasmasetup.languageutil as Language
import org.kde.plasmasetup.components as PlasmaSetupComponents

PlasmaSetupComponents.SetupModule {
    id: root

    function onPageActivated(): void {
        searchField.forceActiveFocus();
    }

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(640, card.implicitWidth + Kirigami.Units.gridUnit * 2)
        implicitHeight: Math.max(480, card.implicitHeight + Kirigami.Units.gridUnit * 2)

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
            height: Math.min(parent.height - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 36)
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            radius: 10

            ColumnLayout {
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
                        text: i18n("Choose your language")
                        color: "#ffffff"
                        font.pixelSize: 20
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }

                    Label {
                        Layout.fillWidth: true
                        text: i18n("Select the language you want across your desktop, menus, and settings.")
                        color: "#94a3b8"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }
                }

                Kirigami.SearchField {
                    id: searchField
                    Layout.fillWidth: true
                    placeholderText: i18n("Search languages...")
                    color: "#ffffff"
                    placeholderTextColor: "#64748b"
                    background: Rectangle {
                        color: "#0a1020"
                        border.color: searchField.activeFocus ? "#2dd4bf" : "#22304d"
                        border.width: 1
                        radius: 6
                    }
                    onTextChanged: {
                        Language.LanguageUtil.languageModel.setFilterString(text);
                    }
                }

                ScrollView {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    clip: true

                    background: Rectangle {
                        color: "#0a1020"
                        border.color: "#22304d"
                        border.width: 1
                        radius: 8
                    }

                    ListView {
                        id: languageListView
                        clip: true
                        model: Language.LanguageUtil.languageModel
                        currentIndex: -1

                        delegate: RadioDelegate {
                            id: langDelegate
                            required property string languageCode

                            width: ListView.view.width
                            implicitHeight: 42
                            leftPadding: 14
                            rightPadding: 40
                            checked: Language.LanguageUtil.currentLanguage === languageCode

                            text: {
                                const locale = Qt.locale(languageCode);
                                const localeName = locale.nativeLanguageName;
                                if (!localeName) {
                                    return languageCode;
                                }
                                const country = locale.nativeCountryName;
                                const titled = localeName.charAt(0).toUpperCase() + localeName.slice(1);
                                return country ? (titled + " (" + country + ")") : titled;
                            }

                            contentItem: Label {
                                text: langDelegate.text
                                color: langDelegate.checked ? "#2dd4bf" : "#ffffff"
                                font.weight: langDelegate.checked ? Font.DemiBold : Font.Normal
                                elide: Text.ElideRight
                                verticalAlignment: Text.AlignVCenter
                            }

                            indicator: Rectangle {
                                implicitWidth: 16
                                implicitHeight: 16
                                width: 16
                                height: 16
                                radius: 8
                                x: langDelegate.width - width - 14
                                y: (langDelegate.height - height) / 2
                                color: "#0a1020"
                                border.color: langDelegate.checked ? "#2dd4bf" : "#22304d"
                                border.width: 2

                                Rectangle {
                                    width: 8
                                    height: 8
                                    radius: 4
                                    anchors.centerIn: parent
                                    color: "#2dd4bf"
                                    visible: langDelegate.checked
                                }
                            }

                            background: Rectangle {
                                color: langDelegate.checked
                                    ? "#0f2433"
                                    : (langDelegate.hovered ? "#131c34" : "transparent")
                            }

                            onToggled: {
                                if (checked && languageCode !== Language.LanguageUtil.currentLanguage) {
                                    Language.LanguageUtil.currentLanguage = languageCode;
                                    Language.LanguageUtil.applyLanguage();
                                    checked = Qt.binding(() => Language.LanguageUtil.currentLanguage === languageCode);
                                }
                            }
                        }

                        function scrollToCurrentLanguage(): void {
                            const row = languageListView.model.rowForLanguage(
                                Language.LanguageUtil.currentLanguage
                            );
                            if (row >= 0) {
                                languageListView.positionViewAtIndex(row, ListView.Center);
                            }
                        }

                        Component.onCompleted: {
                            Qt.callLater(() => {
                                if (Language.LanguageUtil.currentLanguage) {
                                    scrollToCurrentLanguage();
                                }
                            });
                        }

                        Connections {
                            target: Language.LanguageUtil
                            function onInitialLanguageOverrideApplied(): void {
                                languageListView.scrollToCurrentLanguage();
                            }
                        }
                    }
                }
            }
        }
    }
}
