import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import QtQuick.Window

Window {
    id: win

    property bool detailsExpanded: false
    readonly property int collapsedHeight: Math.max(220, headerRow.implicitHeight + 170)
    readonly property int targetHeight: detailsExpanded ? 460 : collapsedHeight

    title: crash.appTitle + " — OneClick OS"
    width: 500
    height: targetHeight
    minimumWidth: 420
    minimumHeight: targetHeight
    maximumHeight: targetHeight
    visible: true
    color: "#0a1020"
    flags: Qt.Dialog | Qt.WindowTitleHint | Qt.WindowCloseButtonHint

    onDetailsExpandedChanged: {
        height = targetHeight
        requestUpdate()
    }

    component FlatBtn: QQC2.Button {
        id: btn
        property bool primary: false
        implicitHeight: 36
        leftPadding: 18
        rightPadding: 18

        background: Rectangle {
            radius: 6
            color: {
                if (!btn.enabled) return "#162038"
                if (btn.primary) return btn.down ? "#14b8a6" : "#2dd4bf"
                return btn.down ? "#162038" : "#0b1224"
            }
            border.color: btn.primary ? "transparent" : "#22304d"
            border.width: btn.primary ? 0 : 1
        }

        contentItem: QQC2.Label {
            text: btn.text
            horizontalAlignment: Text.AlignHCenter
            verticalAlignment: Text.AlignVCenter
            font.pixelSize: 13
            font.weight: btn.primary ? Font.DemiBold : Font.Normal
            color: btn.primary ? "#0a1020" : "#ffffff"
        }
    }

    Shortcut {
        sequences: [StandardKey.Cancel]
        onActivated: crash.closeDialog()
    }

    Rectangle {
        anchors.fill: parent
        anchors.margins: 14
        radius: 6
        color: "#0b1224"
        border.color: "#22304d"
        border.width: 1

        ColumnLayout {
            id: mainCol
            anchors.fill: parent
            anchors.margins: 18
            spacing: 14

            RowLayout {
                id: headerRow
                Layout.fillWidth: true
                spacing: 14

                // Crisp flat geometric warning badge (no emoji)
                Rectangle {
                    Layout.preferredWidth: 40
                    Layout.preferredHeight: 40
                    Layout.alignment: Qt.AlignTop
                    radius: 20
                    color: "#0a1020"
                    border.color: "#2dd4bf"
                    border.width: 2

                    Column {
                        anchors.centerIn: parent
                        spacing: 4

                        Rectangle {
                            width: 3
                            height: 13
                            radius: 1
                            color: "#2dd4bf"
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                        Rectangle {
                            width: 3
                            height: 3
                            radius: 1
                            color: "#2dd4bf"
                            anchors.horizontalCenter: parent.horizontalCenter
                        }
                    }
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        font.pixelSize: 16
                        font.weight: Font.DemiBold
                        color: "#ffffff"
                        text: crash.headline
                    }

                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        font.pixelSize: 13
                        color: "#cbd5e1"
                        text: crash.summaryText
                    }
                }
            }

            // Collapsed disclosure toggle
            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                QQC2.AbstractButton {
                    id: detailsToggle
                    implicitHeight: 28
                    implicitWidth: toggleRow.implicitWidth + 8
                    onClicked: win.detailsExpanded = !win.detailsExpanded

                    contentItem: RowLayout {
                        id: toggleRow
                        spacing: 6

                        QQC2.Label {
                            text: win.detailsExpanded ? "v" : ">"
                            font.family: "monospace"
                            font.pixelSize: 12
                            font.weight: Font.Bold
                            color: "#2dd4bf"
                        }
                        QQC2.Label {
                            text: "Details for developers"
                            font.pixelSize: 12
                            font.weight: Font.Medium
                            color: "#94a3b8"
                        }
                    }
                }

                Item { Layout.fillWidth: true }

                FlatBtn {
                    id: copyDetailsBtn
                    visible: win.detailsExpanded
                    implicitHeight: 28
                    leftPadding: 12
                    rightPadding: 12
                    text: crash.copied ? "Copied" : "Copy Details"
                    onClicked: crash.copyDetails()
                }
            }

            Rectangle {
                id: detailsBox
                Layout.fillWidth: true
                Layout.fillHeight: true
                visible: win.detailsExpanded
                radius: 6
                color: "#0a1020"
                border.color: "#22304d"
                border.width: 1

                QQC2.ScrollView {
                    anchors.fill: parent
                    anchors.margins: 10
                    clip: true

                    QQC2.TextArea {
                        readOnly: true
                        selectByMouse: true
                        wrapMode: TextEdit.Wrap
                        font.family: "monospace"
                        font.pixelSize: 11
                        color: "#cbd5e1"
                        background: null
                        text: crash.technicalDetails
                    }
                }
            }

            Item {
                Layout.fillHeight: !win.detailsExpanded
            }

            RowLayout {
                Layout.fillWidth: true
                spacing: 8

                Item { Layout.fillWidth: true }

                FlatBtn {
                    text: "Close"
                    onClicked: crash.closeDialog()
                }

                FlatBtn {
                    primary: true
                    visible: crash.canReopen
                    text: "Reopen"
                    onClicked: crash.reopen()
                }
            }
        }
    }
}
