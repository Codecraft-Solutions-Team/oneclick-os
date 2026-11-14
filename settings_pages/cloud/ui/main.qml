// The Cloud Drives page in Settings: OneDrive and Google Drive setup.
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

KCM.SimpleKCM {
    id: page

    Component.onCompleted: kcm.refresh()

    component FlatButton: QQC2.Button {
        id: btn
        property bool primary: false
        implicitHeight: 36
        leftPadding: 16
        rightPadding: 16
        scale: btn.down && Kirigami.Units.longDuration > 0 ? 0.98 : 1.0
        Behavior on scale { NumberAnimation { duration: Kirigami.Units.shortDuration; easing.type: Easing.OutCubic } }

        background: Rectangle {
            radius: 6
            color: {
                if (!btn.enabled) return "#162038"
                if (btn.primary) return btn.down ? "#14b8a6" : (btn.hovered ? "#5eead4" : "#2dd4bf")
                return btn.down ? "#162038" : (btn.hovered ? "#131d36" : "#0a1020")
            }
            border.color: btn.primary ? "transparent" : (btn.hovered ? "#2dd4bf" : "#22304d")
            border.width: btn.primary ? 0 : 1
            Behavior on color { ColorAnimation { duration: Kirigami.Units.shortDuration } }
            Behavior on border.color { ColorAnimation { duration: Kirigami.Units.shortDuration } }
        }

        contentItem: QQC2.Label {
            text: btn.text
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            font.weight: btn.primary ? Font.DemiBold : Font.Normal
            color: {
                if (!btn.enabled) return "#64748b"
                if (btn.primary) return "#0a1020"
                return "#ffffff"
            }
        }
    }

    component StatusPill: Rectangle {
        property bool active: false
        property bool busy: false
        property string labelText: ""
        implicitWidth: pillText.implicitWidth + 16
        implicitHeight: 24
        radius: 4
        color: active ? "#0f2e2b" : "#0a1020"
        border.color: active ? "#2dd4bf" : (busy ? "#2dd4bf" : "#22304d")
        border.width: 1
        Behavior on color { ColorAnimation { duration: Kirigami.Units.shortDuration } }
        Behavior on border.color { ColorAnimation { duration: Kirigami.Units.shortDuration } }

        QQC2.Label {
            id: pillText
            anchors.centerIn: parent
            text: parent.labelText
            font.pixelSize: 12
            font.weight: Font.Medium
            color: parent.active ? "#2dd4bf" : "#cbd5e1"
        }
    }

    ColumnLayout {
        spacing: Kirigami.Units.largeSpacing

        // ---- Header card ---------------------------------------------------
        Rectangle {
            id: cloudHeaderCard
            property bool shown: Kirigami.Units.longDuration === 0
            Layout.fillWidth: true
            implicitHeight: headerLayout.implicitHeight + 28
            radius: 6
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            opacity: shown ? 1.0 : 0.0
            transform: Translate {
                y: cloudHeaderCard.shown ? 0 : 8
                Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            }
            Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            Component.onCompleted: shown = true

            RowLayout {
                id: headerLayout
                anchors.fill: parent
                anchors.margins: 14
                spacing: 12

                Kirigami.Icon {
                    source: "oneclick-cloud-drive"
                    Layout.preferredWidth: Kirigami.Units.iconSizes.medium
                    Layout.preferredHeight: Kirigami.Units.iconSizes.medium
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 2

                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        font.pixelSize: 15
                        font.weight: Font.DemiBold
                        color: "#ffffff"
                        text: "Cloud Drives"
                    }
                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        font.pixelSize: 13
                        color: "#cbd5e1"
                        text: "Connect your cloud storage so your files appear directly inside Files alongside your local folders."
                    }
                }

                FlatButton {
                    text: "Refresh"
                    onClicked: kcm.refresh()
                }
            }
        }

        // ---- OneDrive card -------------------------------------------------
        Rectangle {
            id: oneDriveCard
            property bool shown: Kirigami.Units.longDuration === 0
            Layout.fillWidth: true
            implicitHeight: oneDriveLayout.implicitHeight + 32
            radius: 6
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            opacity: shown ? 1.0 : 0.0
            transform: Translate {
                y: oneDriveCard.shown ? 0 : 10
                Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            }
            Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            Timer { interval: 50; running: !oneDriveCard.shown; onTriggered: oneDriveCard.shown = true }

            ColumnLayout {
                id: oneDriveLayout
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3

                        QQC2.Label {
                            text: "Microsoft OneDrive"
                            font.pixelSize: 15
                            font.weight: Font.DemiBold
                            color: "#ffffff"
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            font.pixelSize: 13
                            color: "#94a3b8"
                            text: "Opens your OneDrive files as a folder at " + kcm.oneDriveMountPath + " and pins it in the Files sidebar."
                        }
                    }

                    StatusPill {
                        active: kcm.oneDriveMounted
                        busy: kcm.oneDriveBusy
                        labelText: kcm.oneDriveBusy ? "Connecting"
                                 : (kcm.oneDriveMounted ? "Ready in Files"
                                 : (kcm.oneDriveConnected ? "Connected" : "Not connected"))
                    }
                }

                QQC2.Label {
                    Layout.fillWidth: true
                    wrapMode: Text.WordWrap
                    font.pixelSize: 13
                    color: "#e2e8f0"
                    text: kcm.oneDriveStatus
                }

                Rectangle {
                    Layout.fillWidth: true
                    visible: kcm.oneDriveError.length > 0
                    implicitHeight: oneDriveErrLabel.implicitHeight + 16
                    radius: 6
                    color: "#0a1020"
                    border.color: "#f87171"
                    border.width: 1

                    QQC2.Label {
                        id: oneDriveErrLabel
                        anchors.fill: parent
                        anchors.margins: 8
                        wrapMode: Text.WordWrap
                        font.pixelSize: 12
                        color: "#fecaca"
                        text: kcm.oneDriveError
                    }
                }

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    FlatButton {
                        primary: true
                        visible: !kcm.oneDriveConnected && !kcm.oneDriveBusy
                        enabled: kcm.rcloneAvailable
                        text: "Sign in to OneDrive"
                        onClicked: kcm.connectOneDrive()
                    }

                    FlatButton {
                        primary: true
                        visible: kcm.oneDriveConnected && kcm.oneDriveMounted
                        text: "Open in Files"
                        onClicked: kcm.openOneDrive()
                    }

                    FlatButton {
                        primary: true
                        visible: kcm.oneDriveConnected && !kcm.oneDriveMounted && !kcm.oneDriveBusy
                        text: "Connect Folder"
                        onClicked: kcm.mountOneDrive()
                    }

                    FlatButton {
                        visible: kcm.oneDriveConnected && !kcm.oneDriveMounted && !kcm.oneDriveBusy
                        text: "Open Folder"
                        onClicked: kcm.openOneDrive()
                    }

                    FlatButton {
                        visible: kcm.oneDriveBusy
                        text: "Cancel"
                        onClicked: kcm.cancelOneDrive()
                    }

                    FlatButton {
                        visible: kcm.oneDriveBusy && kcm.oneDriveAuthUrl.length > 0
                        text: "Open Sign-in Page"
                        onClicked: Qt.openUrlExternally(kcm.oneDriveAuthUrl)
                    }

                    Item { Layout.fillWidth: true }

                    FlatButton {
                        visible: kcm.oneDriveConnected && !kcm.oneDriveBusy
                        text: "Disconnect"
                        onClicked: kcm.disconnectOneDrive()
                    }
                }
            }
        }

        // ---- Google Drive card ---------------------------------------------
        Rectangle {
            id: gdriveCard
            property bool shown: Kirigami.Units.longDuration === 0
            Layout.fillWidth: true
            implicitHeight: gdriveLayout.implicitHeight + 32
            radius: 6
            color: "#0b1224"
            border.color: "#22304d"
            border.width: 1
            opacity: shown ? 1.0 : 0.0
            transform: Translate {
                y: gdriveCard.shown ? 0 : 10
                Behavior on y { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            }
            Behavior on opacity { NumberAnimation { duration: Kirigami.Units.longDuration; easing.type: Easing.OutCubic } }
            Timer { interval: 100; running: !gdriveCard.shown; onTriggered: gdriveCard.shown = true }

            ColumnLayout {
                id: gdriveLayout
                anchors.fill: parent
                anchors.margins: 16
                spacing: 12

                RowLayout {
                    Layout.fillWidth: true
                    spacing: 12

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 3

                        QQC2.Label {
                            text: "Google Drive"
                            font.pixelSize: 15
                            font.weight: Font.DemiBold
                            color: "#ffffff"
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            font.pixelSize: 13
                            color: "#94a3b8"
                            text: "Sign in with your Google account or link Google Drive directly as a folder at " + kcm.googleDriveMountPath + "."
                        }
                    }

                    StatusPill {
                        active: kcm.googleDriveMounted || kcm.googleAccountConfigured
                        busy: kcm.googleDriveBusy
                        labelText: kcm.googleDriveBusy ? "Connecting"
                                 : (kcm.googleDriveMounted ? "Folder Ready"
                                 : (kcm.googleAccountConfigured ? "Account Ready"
                                 : (kcm.googleDriveConnected ? "Connected" : "Not connected")))
                    }
                }

                // Online Accounts option
                RowLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    FlatButton {
                        primary: !kcm.googleDriveConnected && !kcm.googleAccountConfigured
                        text: "Sign in with Google"
                        onClicked: kcm.openGoogleSignIn()
                    }

                    FlatButton {
                        primary: kcm.googleAccountConfigured && !kcm.googleDriveMounted
                        visible: kcm.googleAccountConfigured
                        text: "Open in Files"
                        onClicked: kcm.openGoogleAccountFiles()
                    }

                    Item { Layout.fillWidth: true }
                }

                Rectangle {
                    Layout.fillWidth: true
                    height: 1
                    color: "#22304d"
                }

                // Direct folder sync fallback / alternative
                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 8

                    QQC2.Label {
                        text: "Direct Folder Sync"
                        font.pixelSize: 13
                        font.weight: Font.DemiBold
                        color: "#ffffff"
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        font.pixelSize: 12
                        color: "#94a3b8"
                        text: "Recommended if Google says 'This app is blocked'. Mounts Google Drive at " + kcm.googleDriveMountPath + " and adds it to Files."
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        font.pixelSize: 13
                        color: "#e2e8f0"
                        text: kcm.googleDriveStatus
                    }

                    Rectangle {
                        Layout.fillWidth: true
                        visible: kcm.googleDriveError.length > 0
                        implicitHeight: gdriveErrLabel.implicitHeight + 16
                        radius: 6
                        color: "#0a1020"
                        border.color: "#f87171"
                        border.width: 1

                        QQC2.Label {
                            id: gdriveErrLabel
                            anchors.fill: parent
                            anchors.margins: 8
                            wrapMode: Text.WordWrap
                            font.pixelSize: 12
                            color: "#fecaca"
                            text: kcm.googleDriveError
                        }
                    }

                    RowLayout {
                        Layout.fillWidth: true
                        spacing: 8

                        FlatButton {
                            primary: kcm.googleAccountConfigured && !kcm.googleDriveConnected
                            visible: !kcm.googleDriveConnected && !kcm.googleDriveBusy
                            enabled: kcm.rcloneAvailable
                            text: "Link Google Drive Folder"
                            onClicked: kcm.connectGoogleDriveFolder()
                        }

                        FlatButton {
                            primary: true
                            visible: kcm.googleDriveConnected && kcm.googleDriveMounted
                            text: "Open Google Drive Folder"
                            onClicked: kcm.openGoogleDriveFolder()
                        }

                        FlatButton {
                            primary: true
                            visible: kcm.googleDriveConnected && !kcm.googleDriveMounted && !kcm.googleDriveBusy
                            text: "Connect Folder"
                            onClicked: kcm.mountGoogleDriveFolder()
                        }

                        FlatButton {
                            visible: kcm.googleDriveBusy
                            text: "Cancel"
                            onClicked: kcm.cancelGoogleDriveFolder()
                        }

                        FlatButton {
                            visible: kcm.googleDriveBusy && kcm.googleDriveAuthUrl.length > 0
                            text: "Open Sign-in Page"
                            onClicked: Qt.openUrlExternally(kcm.googleDriveAuthUrl)
                        }

                        Item { Layout.fillWidth: true }

                        FlatButton {
                            visible: kcm.googleDriveConnected && !kcm.googleDriveBusy
                            text: "Disconnect Folder"
                            onClicked: kcm.disconnectGoogleDriveFolder()
                        }
                    }
                }
            }
        }
    }
}
