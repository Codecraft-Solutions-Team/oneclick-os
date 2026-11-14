/*
SPDX-FileCopyrightText: 2024 Evgeny Chesnokov <echesnokov@astralinux.ru>
SPDX-FileCopyrightText: 2025 Kristen McWilliam <kristen@kde.org>

SPDX-License-Identifier: GPL-2.0-or-later
*/

pragma ComponentBehavior: Bound

import QtQuick
import QtQuick.Layouts
import QtQuick.Controls

import org.kde.kirigami as Kirigami
import org.kde.kitemmodels as KItemModels
import org.kde.plasmasetup
import org.kde.plasmasetup.components as PlasmaSetupComponents
import org.kde.plasma.private.kcm_keyboard as KCMKeyboard

PlasmaSetupComponents.SetupModule {
    id: root

    available: !Kirigami.Settings.isMobile

    function onPageActivated(): void {
        layoutsView.highlightMoveDuration = 0;
        variantView.highlightMoveDuration = 0;
        layoutsView.currentIndex = layoutsProxy.findCurrentLayoutIndex();
        variantView.currentIndex = variantProxy.findCurrentVariantIndex();
        layoutsView.highlightMoveDuration = -1;
        variantView.highlightMoveDuration = -1;
        searchField.forceActiveFocus();
    }

    KCMKeyboard.LayoutSearchModel {
        id: layoutSearchProxy
        sourceModel: KCMKeyboard.LayoutModel {}
        searchString: ""
    }

    KItemModels.KSortFilterProxyModel {
        id: layoutsProxy
        sourceModel: layoutSearchProxy
        sortRoleName: "searchScore"
        sortOrder: Qt.AscendingOrder

        filterRowCallback: function (row, parent) {
            const modelIndex = sourceModel.index(row, 0, parent);
            const currentVariantName = modelIndex.data(KItemModels.KRoleNames.role("variantName"));

            if (currentVariantName !== '') {
                return false;
            }

            if (searchField.text.length > 0) {
                const score = modelIndex.data(KItemModels.KRoleNames.role("searchScore"));
                if (score !== 0) {
                    return true;
                }
                const shortNameRole = KItemModels.KRoleNames.role("shortName");
                const currentName = modelIndex.data(shortNameRole);
                const searchScoreRole = KItemModels.KRoleNames.role("searchScore");
                for (let i = 0; i < sourceModel.rowCount(); i++) {
                    const index = sourceModel.index(i, 0, parent);
                    const name = sourceModel.data(index, shortNameRole);
                    const variantSearchScore = sourceModel.data(index, searchScoreRole);
                    if (name === currentName && variantSearchScore > 100) {
                        return true;
                    }
                }
                return false;
            }

            return true;
        }

        function findCurrentLayoutIndex(): int {
            const layoutName = KeyboardUtil.layoutName.split(",").pop().trim();
            for (let i = 0; i < rowCount(); i++) {
                const proxyIndex = index(i, 0);
                const shortName = data(proxyIndex, KItemModels.KRoleNames.role("shortName"));
                if (shortName === layoutName) {
                    return i;
                }
            }
            return -1;
        }
    }

    KItemModels.KSortFilterProxyModel {
        id: variantProxy
        sourceModel: layoutSearchProxy
        sortRoleName: "searchScore"
        sortOrder: Qt.AscendingOrder

        filterRowCallback: function (row, parent) {
            if (!layoutsView.currentItem) {
                return false;
            }
            const modelIndex = sourceModel.index(row, 0, parent);
            const currentName = modelIndex.data(KItemModels.KRoleNames.role("shortName"));
            const selectedName = (layoutsView.currentItem as LayoutDelegate).shortName;

            if (currentName !== selectedName) {
                return false;
            }

            if (searchField.text.length > 0) {
                const searchScore = modelIndex.data(KItemModels.KRoleNames.role("searchScore"));
                return searchScore > 100;
            }

            return true;
        }

        function findCurrentVariantIndex(): int {
            const layoutIndex = layoutsView.currentIndex;
            if (layoutIndex === -1) {
                return -1;
            }
            const layoutModelIndex = layoutsProxy.index(layoutIndex, 0);
            const layoutShortName = layoutsProxy.data(layoutModelIndex, KItemModels.KRoleNames.role("shortName"));
            const currentVariantName = KeyboardUtil.layoutVariant.split(",").pop().trim();

            for (let i = 0; i < rowCount(); i++) {
                const proxyIndex = index(i, 0);
                const shortName = data(proxyIndex, KItemModels.KRoleNames.role("shortName"));
                const variantName = data(proxyIndex, KItemModels.KRoleNames.role("variantName"));
                if (shortName === layoutShortName && variantName === currentVariantName) {
                    return i;
                }
            }
            return -1;
        }
    }

    contentItem: Rectangle {
        id: backdrop
        color: "#0a1020"
        implicitWidth: Math.max(680, card.implicitWidth + Kirigami.Units.gridUnit * 2)
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
            width: Math.min(parent.width - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 42)
            height: Math.min(parent.height - Kirigami.Units.gridUnit * 2, Kirigami.Units.gridUnit * 36)
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            radius: 10

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
                        text: i18n("Choose your keyboard layout")
                        color: "#ffffff"
                        font.pixelSize: 20
                        font.weight: Font.DemiBold
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }

                    Label {
                        Layout.fillWidth: true
                        text: i18n("Pick your layout and variant so every key types as expected.")
                        color: "#94a3b8"
                        font.pixelSize: 13
                        horizontalAlignment: Text.AlignHCenter
                        wrapMode: Text.Wrap
                    }
                }

                Kirigami.SearchField {
                    id: searchField
                    Layout.fillWidth: true
                    placeholderText: i18n("Search keyboard layouts...")
                    color: "#ffffff"
                    placeholderTextColor: "#64748b"
                    background: Rectangle {
                        color: "#0a1020"
                        border.color: searchField.activeFocus ? "#2dd4bf" : "#22304d"
                        border.width: 1
                        radius: 6
                    }
                    onAccepted: {
                        searchDebouncer.stop();
                        layoutSearchProxy.searchString = searchField.text.trim();
                    }
                    onTextChanged: searchDebouncer.reset()
                }

                PlasmaSetupComponents.Debouncer {
                    id: searchDebouncer
                    onDebounced: layoutSearchProxy.searchString = searchField.text.trim()
                }

                RowLayout {
                    Layout.fillWidth: true
                    Layout.fillHeight: true
                    spacing: Kirigami.Units.largeSpacing

                    ScrollView {
                        clip: true
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        implicitWidth: Math.round(mainColumn.width / 2)

                        background: Rectangle {
                            color: "#0a1020"
                            border.color: "#22304d"
                            border.width: 1
                            radius: 8
                        }

                        contentItem: ListView {
                            id: layoutsView
                            model: layoutsProxy
                            delegate: LayoutDelegate {}
                            keyNavigationEnabled: true
                            activeFocusOnTab: true
                            onCurrentIndexChanged: variantProxy.invalidateFilter()
                        }
                    }

                    ScrollView {
                        clip: true
                        Layout.fillWidth: true
                        Layout.fillHeight: true
                        implicitWidth: Math.round(mainColumn.width / 2)

                        background: Rectangle {
                            color: "#0a1020"
                            border.color: "#22304d"
                            border.width: 1
                            radius: 8
                        }

                        contentItem: ListView {
                            id: variantView
                            model: layoutsView.currentItem ? variantProxy : []
                            delegate: LayoutDelegate {}
                            keyNavigationEnabled: true
                            activeFocusOnTab: true
                        }
                    }
                }
            }
        }
    }

    component LayoutDelegate: ItemDelegate {
        id: delegate

        width: ListView.view.width
        implicitHeight: 40
        leftPadding: 14
        rightPadding: 14
        highlighted: ListView.isCurrentItem

        required property string shortName
        required property string description
        required property string variantName
        required property int index

        onClicked: {
            ListView.view.currentIndex = index;
            KeyboardUtil.layoutName = shortName;
            KeyboardUtil.layoutVariant = variantName;
            KeyboardUtil.applyLayout();
        }

        Accessible.name: delegate.description

        background: Rectangle {
            color: delegate.highlighted
                ? "#0f2433"
                : (delegate.hovered ? "#131c34" : "transparent")
        }

        contentItem: Label {
            text: delegate.description
            color: delegate.highlighted ? "#2dd4bf" : "#ffffff"
            font.weight: delegate.highlighted ? Font.DemiBold : Font.Normal
            elide: Text.ElideRight
            verticalAlignment: Text.AlignVCenter
        }
    }
}
