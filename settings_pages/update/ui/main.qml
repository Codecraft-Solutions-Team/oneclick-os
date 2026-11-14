// The Update page. One card that changes with the state, then the channel choice,
// then previous versions and "go back".
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

KCM.SimpleKCM {
    id: page

    readonly property bool busy: kcm.state === "downloading"
                              || kcm.state === "checking"
                              || kcm.state === "rollingback"

    Component.onCompleted: {
        kcm.check()
        kcm.loadVersions()
    }

    component MotionButton: QQC2.Button {
        scale: down && Kirigami.Units.longDuration > 0 ? 0.98 : 1.0
        Behavior on scale { NumberAnimation { duration: Kirigami.Units.shortDuration; easing.type: Easing.OutCubic } }
    }

    ColumnLayout {
        spacing: Kirigami.Units.largeSpacing * 2

        // ---- status card --------------------------------------------------
        Kirigami.AbstractCard {
            id: statusCard
            property bool shown: Kirigami.Units.longDuration === 0
            Layout.fillWidth: true
            opacity: shown ? 1.0 : 0.0
            transform: Translate {
                y: statusCard.shown ? 0 : 8
                Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            }
            Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            Component.onCompleted: shown = true

            contentItem: ColumnLayout {
                spacing: Kirigami.Units.largeSpacing

                RowLayout {
                    spacing: Kirigami.Units.largeSpacing
                    Kirigami.Icon {
                        id: statusIcon
                        source: kcm.state === "error" ? "dialog-error"
                              : kcm.state === "uptodate" ? "checkmark" : "oneclick-update"
                        Layout.preferredWidth: Kirigami.Units.iconSizes.huge
                        Layout.preferredHeight: Kirigami.Units.iconSizes.huge
                        onSourceChanged: rotation = 0
                        RotationAnimator {
                            target: statusIcon
                            running: kcm.state === "checking" && Kirigami.Units.longDuration > 0
                            from: 0; to: 360; duration: 1400; loops: Animation.Infinite
                            onRunningChanged: if (!running) statusIcon.rotation = 0
                            onStopped: statusIcon.rotation = 0
                        }
                    }
                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 2
                        Kirigami.Heading {
                            level: 2
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            text: ({
                                idle: "Check for updates",
                                checking: "Checking for updates...",
                                available: kcm.channel === "security" ? "Security fixes are available" : "A new version is available",
                                uptodate: "You're up to date",
                                downloading: "Downloading...",
                                rollingback: "Undoing the last update...",
                                ready: "Ready. Restart to finish",
                                error: "Something went wrong"
                            })[kcm.state] || "Check for updates"
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            opacity: 0.7
                            text: kcm.state === "error"
                                  ? (kcm.message.indexOf("private") !== -1
                                     ? kcm.message
                                     : ("Check your internet connection and try again." + (kcm.message ? "\n" + kcm.message : "")))
                                : kcm.state === "downloading" ? "You can keep using your PC. Nothing changes until you restart."
                                : kcm.state === "rollingback" ? "Restoring the version from before your last update..."
                                : kcm.state === "ready" ? "Your open apps will close when you restart."
                                : "You have OneClick OS " + (kcm.currentVersion || "(development build)")
                        }
                    }
                }

                // Download progress: bar, megabytes, time left
                ColumnLayout {
                    visible: kcm.state === "downloading" || kcm.state === "rollingback"
                    Layout.fillWidth: true
                    spacing: Kirigami.Units.smallSpacing
                    QQC2.ProgressBar {
                        Layout.fillWidth: true
                        indeterminate: kcm.state === "rollingback" || kcm.totalMb <= 0
                        from: 0
                        to: Math.max(1, kcm.totalMb)
                        value: kcm.doneMb
                        Behavior on value { NumberAnimation { duration: Kirigami.Units.longDuration > 0 ? 900 : 0 } }
                    }
                    RowLayout {
                        visible: kcm.state === "downloading"
                        Layout.fillWidth: true
                        QQC2.Label {
                            text: kcm.totalMb > 0
                                ? Math.round(kcm.doneMb) + " MB of " + Math.round(kcm.totalMb) + " MB"
                                : "Working out the size..."
                        }
                        Item { Layout.fillWidth: true }
                        QQC2.Label { text: kcm.eta; opacity: 0.7 }
                    }
                }

                RowLayout {
                    Layout.alignment: Qt.AlignRight
                    spacing: Kirigami.Units.smallSpacing
                    MotionButton {
                        visible: ["idle", "uptodate", "error"].includes(kcm.state)
                        text: "Check now"
                        icon.name: "view-refresh"
                        onClicked: kcm.check()
                    }
                    MotionButton {
                        visible: kcm.state === "available"
                        text: "Download"
                        icon.name: "download"
                        onClicked: kcm.download(false)
                    }
                    MotionButton {
                        visible: kcm.state === "available"
                        text: "Download and restart"
                        icon.name: "system-reboot"
                        highlighted: true
                        onClicked: kcm.download(true)
                    }
                    MotionButton {
                        visible: kcm.state === "ready"
                        text: "Restart now"
                        icon.name: "system-reboot"
                        highlighted: true
                        onClicked: kcm.restart()
                    }
                }
            }
        }

        // ---- what to receive ---------------------------------------------
        Kirigami.FormLayout {
            Layout.fillWidth: true
            enabled: !page.busy
            QQC2.ButtonGroup { id: channels }
            QQC2.RadioButton {
                Kirigami.FormData.label: "Updates to receive:"
                text: "Full: new features and security fixes"
                checked: kcm.channel === "full"
                QQC2.ButtonGroup.group: channels
                onToggled: if (checked) { kcm.setChannel("full"); kcm.check() }
            }
            QQC2.RadioButton {
                text: "Security only: keep this version, receive security fixes"
                checked: kcm.channel === "security"
                QQC2.ButtonGroup.group: channels
                onToggled: if (checked) { kcm.setChannel("security"); kcm.check() }
            }
            QQC2.Label {
                text: "Updates are never installed without you choosing to."
                opacity: 0.7
            }
        }

        // ---- previous versions -------------------------------------------
        Kirigami.Heading { level: 3; text: "Previous versions" }
        QQC2.Label {
            Layout.fillWidth: true
            wrapMode: Text.WordWrap
            opacity: 0.7
            text: "Each version below keeps its own features and includes the latest security fixes. Your files and apps are not affected."
        }
        ColumnLayout {
            Layout.fillWidth: true
            spacing: Kirigami.Units.smallSpacing
            enabled: !page.busy

            Repeater {
                model: kcm.versions
                delegate: Kirigami.AbstractCard {
                    id: card
                    required property string modelData
                    required property int index
                    property bool open: false
                    property bool shown: Kirigami.Units.longDuration === 0
                    Layout.fillWidth: true
                    opacity: shown ? 1.0 : 0.0
                    transform: Translate {
                        y: card.shown ? 0 : 8
                        Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
                    }
                    Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
                    Timer {
                        running: !card.shown
                        interval: Math.min(card.index, 5) * 40
                        onTriggered: card.shown = true
                    }
                    contentItem: ColumnLayout {
                        RowLayout {
                            Kirigami.Icon { source: "oneclick-update"; Layout.preferredWidth: Kirigami.Units.iconSizes.medium; Layout.preferredHeight: Kirigami.Units.iconSizes.medium }
                            QQC2.Label {
                                Layout.fillWidth: true
                                font.bold: true
                                text: "OneClick OS " + card.modelData + (card.modelData === kcm.currentVersion ? "  (this PC)" : "")
                            }
                            QQC2.ToolButton {
                                icon.name: card.open ? "arrow-up" : "arrow-down"
                                onClicked: card.open = !card.open
                            }
                        }
                        RowLayout {
                            visible: card.open || opacity > 0
                            opacity: card.open ? 1.0 : 0.0
                            Behavior on opacity { NumberAnimation { duration: Kirigami.Units.shortDuration; easing.type: Easing.OutCubic } }
                            Layout.alignment: Qt.AlignRight
                            MotionButton { text: "Download"; onClicked: kcm.installVersion(card.modelData, false) }
                            MotionButton { text: "Download and restart"; onClicked: kcm.installVersion(card.modelData, true) }
                        }
                    }
                }
            }
            QQC2.Label {
                visible: kcm.versions.length === 0
                opacity: 0.7
                text: "No earlier versions have been published yet."
            }
        }

        MotionButton {
            text: "Undo the last update"
            icon.name: "edit-undo"
            enabled: !page.busy
            onClicked: kcm.rollback()
            QQC2.ToolTip.text: "Go back to exactly what this PC ran before the last update"
            QQC2.ToolTip.visible: hovered
        }
    }
}
