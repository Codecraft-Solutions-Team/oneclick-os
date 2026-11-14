// SPDX-License-Identifier: GPL-2.0-or-later

import QtQuick
import QtQuick.Controls as QQC2
import QtQuick.Layouts

import org.kde.kirigami as Kirigami
import org.kde.plasma.welcome as Welcome

Welcome.Page {
    id: root

    heading: i18n("Your apps")
    description: i18n("Choose a starter set or pick individual apps to install from Flathub. Nothing installs without your click.")

    readonly property var presets: [
        {
            name: "Everyday",
            subtitle: "Browser, office, media",
            flathubIds: [
                "org.mozilla.firefox",
                "org.libreoffice.LibreOffice",
                "org.videolan.VLC",
                "com.spotify.Client"
            ]
        },
        {
            name: "Gamer",
            subtitle: "Steam, launchers, Discord",
            flathubIds: [
                "com.valvesoftware.Steam",
                "com.heroicgameslauncher.hgl",
                "net.lutris.Lutris",
                "com.usebottles.bottles",
                "com.discordapp.Discord",
                "com.obsproject.Studio"
            ]
        },
        {
            name: "Work",
            subtitle: "Office, meetings, cloud",
            flathubIds: [
                "org.libreoffice.LibreOffice",
                "us.zoom.Zoom",
                "org.mozilla.Thunderbird"
            ]
        },
        {
            name: "Creator",
            subtitle: "Photo, video, audio",
            flathubIds: [
                "org.gimp.GIMP",
                "org.kde.krita",
                "org.kde.kdenlive",
                "org.audacityteam.Audacity",
                "com.obsproject.Studio",
                "org.blender.Blender",
                "org.inkscape.Inkscape"
            ]
        }
    ]

    readonly property var appCatalog: [
        { id: "org.mozilla.firefox", name: "Firefox", note: "Fast private web browser" },
        { id: "org.libreoffice.LibreOffice", name: "LibreOffice", note: "Word, sheets, and slides (.docx/.xlsx)" },
        { id: "org.videolan.VLC", name: "VLC", note: "Plays any video or audio file" },
        { id: "com.spotify.Client", name: "Spotify", note: "Music and podcasts" },
        { id: "com.valvesoftware.Steam", name: "Steam", note: "PC games and Proton" },
        { id: "com.heroicgameslauncher.hgl", name: "Heroic Games Launcher", note: "Epic Games, GOG, and Amazon" },
        { id: "net.lutris.Lutris", name: "Lutris", note: "Game library launcher" },
        { id: "com.usebottles.bottles", name: "Bottles", note: "Run offline Windows installers" },
        { id: "com.discordapp.Discord", name: "Discord", note: "Voice, video, and communities" },
        { id: "com.obsproject.Studio", name: "OBS Studio", note: "Screen recording and streaming" },
        { id: "us.zoom.Zoom", name: "Zoom", note: "Video meetings" },
        { id: "org.mozilla.Thunderbird", name: "Thunderbird", note: "Email and calendar" },
        { id: "org.gimp.GIMP", name: "GIMP", note: "Photo editing" },
        { id: "org.kde.krita", name: "Krita", note: "Digital painting" },
        { id: "org.kde.kdenlive", name: "Kdenlive", note: "Video editing" },
        { id: "org.audacityteam.Audacity", name: "Audacity", note: "Audio recording and editing" },
        { id: "org.blender.Blender", name: "Blender", note: "3D modeling and rendering" },
        { id: "org.inkscape.Inkscape", name: "Inkscape", note: "Vector graphics and SVG" }
    ]

    readonly property var includedItems: [
        { name: "Photos & PDF Reader", detail: "Already installed" },
        { name: "MangoHud & Controllers", detail: "Built into system" },
        { name: "Word, Excel, PowerPoint (web)", detail: "In Start menu" },
        { name: "OneDrive & Google Drive", detail: "Settings > Cloud Drives" },
        { name: "GeForce NOW & Xbox Cloud", detail: "In Start menu" },
        { name: "Claude & ChatGPT (web)", detail: "Pinned in Start menu" },
        { name: "WhatsApp & Microsoft Teams (web)", detail: "Open in browser" }
    ]

    property var selectedMap: ({})
    property string activePreset: ""
    property bool launching: false
    property string statusText: ""
    property bool statusError: false

    function isSelected(appId) {
        return selectedMap[appId] === true;
    }

    function toggleApp(appId) {
        const next = Object.assign({}, selectedMap);
        if (next[appId]) {
            delete next[appId];
        } else {
            next[appId] = true;
        }
        selectedMap = next;
        activePreset = "";
    }

    function selectPreset(presetObj) {
        const next = {};
        for (let i = 0; i < presetObj.flathubIds.length; i++) {
            next[presetObj.flathubIds[i]] = true;
        }
        selectedMap = next;
        activePreset = presetObj.name;
    }

    function clearSelection() {
        selectedMap = {};
        activePreset = "";
    }

    function selectedIds() {
        const out = [];
        for (let i = 0; i < appCatalog.length; i++) {
            const appId = appCatalog[i].id;
            if (selectedMap[appId] === true) {
                out.push(appId);
            }
        }
        return out;
    }

    function installSelected() {
        const ids = selectedIds();
        if (ids.length === 0 || launching) {
            return;
        }
        launching = true;
        statusError = false;
        statusText = i18n("Launching OneClick app installer for %1 selected app(s)...", ids.length);
        const cmd = "/usr/bin/oneclick-install-chosen-apps " + ids.join(" ");
        Welcome.Controller.runCommand(cmd, function(returnStatus, outputText) {
            launching = false;
            if (returnStatus === 0) {
                statusError = false;
                statusText = i18n("Finished installing selected apps.");
            } else if (returnStatus === -1) {
                statusError = true;
                statusText = i18n("Installer helper was not found. You can install these anytime from the App Store.");
            } else {
                statusError = true;
                const detail = outputText ? outputText.trim() : "";
                statusText = detail.length > 0
                    ? i18n("Installer exited with an issue: %1", detail)
                    : i18n("Installer closed before finishing. Your choices were saved and you can retry anytime.");
            }
        });
    }

    QQC2.ScrollView {
        id: scroller
        anchors.fill: parent
        clip: true
        QQC2.ScrollBar.horizontal.policy: QQC2.ScrollBar.AlwaysOff
        contentWidth: availableWidth

        ColumnLayout {
            width: scroller.availableWidth
            spacing: 14

            // Starter sets row
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                QQC2.Label {
                    text: i18n("Starter sets")
                    color: "#ffffff"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: scroller.availableWidth > 680 ? 4 : 2
                    columnSpacing: 10
                    rowSpacing: 10

                    Repeater {
                        model: root.presets
                        delegate: Rectangle {
                            required property var modelData
                            readonly property bool isActive: root.activePreset === modelData.name

                            Layout.fillWidth: true
                            implicitHeight: presetCol.implicitHeight + 18
                            color: isActive ? "#0f2433" : (presetMouse.containsMouse ? "#111b33" : "#0b1224")
                            border.color: isActive ? "#2dd4bf" : "#22304d"
                            border.width: 1
                            radius: 8

                            ColumnLayout {
                                id: presetCol
                                anchors.fill: parent
                                anchors.margins: 9
                                spacing: 2

                                QQC2.Label {
                                    Layout.fillWidth: true
                                    text: modelData.name
                                    color: isActive ? "#2dd4bf" : "#ffffff"
                                    font.pixelSize: 14
                                    font.weight: Font.DemiBold
                                }

                                QQC2.Label {
                                    Layout.fillWidth: true
                                    text: modelData.subtitle
                                    color: "#94a3b8"
                                    font.pixelSize: 12
                                    wrapMode: Text.Wrap
                                }
                            }

                            MouseArea {
                                id: presetMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.selectPreset(modelData)
                            }
                        }
                    }
                }
            }

            // Flathub app checkboxes grid
            ColumnLayout {
                Layout.fillWidth: true
                spacing: 8

                QQC2.Label {
                    text: i18n("Installable apps (Flathub)")
                    color: "#ffffff"
                    font.pixelSize: 14
                    font.weight: Font.DemiBold
                }

                GridLayout {
                    Layout.fillWidth: true
                    columns: scroller.availableWidth > 680 ? 2 : 1
                    columnSpacing: 10
                    rowSpacing: 8

                    Repeater {
                        model: root.appCatalog
                        delegate: Rectangle {
                            required property var modelData
                            readonly property bool checked: root.isSelected(modelData.id)

                            Layout.fillWidth: true
                            implicitHeight: appRow.implicitHeight + 16
                            color: checked ? "#0f2433" : (appMouse.containsMouse ? "#111b33" : "#0b1224")
                            border.color: checked ? "#2dd4bf" : "#22304d"
                            border.width: 1
                            radius: 8

                            RowLayout {
                                id: appRow
                                anchors.fill: parent
                                anchors.margins: 8
                                spacing: 10

                                // Flat custom checkbox square
                                Rectangle {
                                    Layout.preferredWidth: 18
                                    Layout.preferredHeight: 18
                                    radius: 4
                                    color: checked ? "#2dd4bf" : "#0a1020"
                                    border.color: checked ? "#2dd4bf" : "#22304d"
                                    border.width: 1

                                    Rectangle {
                                        width: 8
                                        height: 8
                                        radius: 2
                                        anchors.centerIn: parent
                                        color: "#042f2e"
                                        visible: checked
                                    }
                                }

                                ColumnLayout {
                                    Layout.fillWidth: true
                                    spacing: 1

                                    QQC2.Label {
                                        Layout.fillWidth: true
                                        text: modelData.name
                                        color: "#ffffff"
                                        font.pixelSize: 13
                                        font.weight: Font.DemiBold
                                    }

                                    QQC2.Label {
                                        Layout.fillWidth: true
                                        text: modelData.note
                                        color: "#94a3b8"
                                        font.pixelSize: 11
                                        elide: Text.ElideRight
                                    }
                                }
                            }

                            MouseArea {
                                id: appMouse
                                anchors.fill: parent
                                hoverEnabled: true
                                cursorShape: Qt.PointingHandCursor
                                onClicked: root.toggleApp(modelData.id)
                            }
                        }
                    }
                }
            }

            // Built-in & shortcut apps included in starter sets
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: includedCol.implicitHeight + 20
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: includedCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    QQC2.Label {
                        Layout.fillWidth: true
                        text: i18n("Already included or ready as shortcuts")
                        color: "#ffffff"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                    }

                    GridLayout {
                        Layout.fillWidth: true
                        columns: scroller.availableWidth > 680 ? 2 : 1
                        columnSpacing: 10
                        rowSpacing: 6

                        Repeater {
                            model: root.includedItems
                            delegate: RowLayout {
                                required property var modelData
                                Layout.fillWidth: true
                                spacing: 8

                                Rectangle {
                                    width: 6
                                    height: 6
                                    radius: 3
                                    color: "#2dd4bf"
                                }

                                QQC2.Label {
                                    Layout.fillWidth: true
                                    text: modelData.name
                                    color: "#cbd5e1"
                                    font.pixelSize: 12
                                    elide: Text.ElideRight
                                }

                                QQC2.Label {
                                    text: modelData.detail
                                    color: "#2dd4bf"
                                    font.pixelSize: 11
                                }
                            }
                        }
                    }
                }
            }

            // Bottom action bar
            Rectangle {
                Layout.fillWidth: true
                implicitHeight: actionCol.implicitHeight + 20
                color: "#0b1224"
                border.color: "#22304d"
                border.width: 1
                radius: 8

                ColumnLayout {
                    id: actionCol
                    anchors.fill: parent
                    anchors.margins: 10
                    spacing: 8

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 10

                        QQC2.Label {
                            Layout.fillWidth: true
                            readonly property int count: root.selectedIds().length
                            text: count > 0
                                ? i18n("%1 app(s) selected to install", count)
                                : i18n("Select a starter set or check individual apps above.")
                            color: count > 0 ? "#ffffff" : "#94a3b8"
                            font.pixelSize: 13
                            wrapMode: Text.Wrap
                        }

                        QQC2.Button {
                            id: clearBtn
                            visible: root.selectedIds().length > 0 && !root.launching
                            text: i18n("Clear")
                            onClicked: root.clearSelection()
                            background: Rectangle {
                                color: clearBtn.hovered ? "#22304d" : "#0a1020"
                                border.color: "#22304d"
                                border.width: 1
                                radius: 6
                            }
                            contentItem: QQC2.Label {
                                text: clearBtn.text
                                color: "#cbd5e1"
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 12
                                rightPadding: 12
                                topPadding: 8
                                bottomPadding: 8
                            }
                        }

                        QQC2.Button {
                            id: installBtn
                            enabled: root.selectedIds().length > 0 && !root.launching
                            text: root.launching ? i18n("Starting installer...") : i18n("Install selected apps")
                            onClicked: root.installSelected()
                            background: Rectangle {
                                color: !installBtn.enabled
                                    ? "#1e293b"
                                    : (installBtn.hovered ? "#5eead4" : "#2dd4bf")
                                radius: 6
                            }
                            contentItem: QQC2.Label {
                                text: installBtn.text
                                color: installBtn.enabled ? "#042f2e" : "#64748b"
                                font.weight: Font.DemiBold
                                horizontalAlignment: Text.AlignHCenter
                                verticalAlignment: Text.AlignVCenter
                                leftPadding: 16
                                rightPadding: 16
                                topPadding: 8
                                bottomPadding: 8
                            }
                        }
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        visible: root.statusText.length > 0
                        text: root.statusText
                        color: root.statusError ? "#ffffff" : "#2dd4bf"
                        font.pixelSize: 12
                        wrapMode: Text.Wrap
                    }
                }
            }
        }
    }
}
