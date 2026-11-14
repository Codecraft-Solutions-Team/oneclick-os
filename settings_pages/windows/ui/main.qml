// The Windows Apps page in Settings.
import QtQuick
import QtQuick.Layouts
import QtQuick.Controls as QQC2
import org.kde.kirigami as Kirigami
import org.kde.kcmutils as KCM

KCM.SimpleKCM {
    id: page

    Component.onCompleted: {
        exeSwitch.checked = kcm.exeHandled
        kcm.refresh()
    }

    Connections {
        target: kcm
        function onChanged() {
            exeSwitch.checked = kcm.exeHandled
        }
    }

    ColumnLayout {
        spacing: Kirigami.Units.largeSpacing

        Kirigami.InlineMessage {
            Layout.fillWidth: true
            visible: kcm.isArmPreview
            type: Kirigami.MessageType.Information
            text: "This preview runs on an Arm processor, which cannot run Windows .exe programs. Windows programs are supported on the PC version. You can still change these settings."
        }

        // ---- .exe / .msi double-click handling ----------------------------
        Kirigami.AbstractCard {
            Layout.fillWidth: true
            contentItem: RowLayout {
                spacing: Kirigami.Units.largeSpacing

                Kirigami.Icon {
                    source: "oneclick-windows-apps"
                    Layout.preferredWidth: Kirigami.Units.iconSizes.large
                    Layout.preferredHeight: Kirigami.Units.iconSizes.large
                }

                ColumnLayout {
                    Layout.fillWidth: true
                    spacing: 4

                    Kirigami.Heading {
                        level: 3
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        text: "Open Windows .exe and .msi programs"
                    }
                    QQC2.Label {
                        Layout.fillWidth: true
                        wrapMode: Text.WordWrap
                        opacity: 0.75
                        text: kcm.exeHandled
                              ? "Double-clicking a Windows installer or program will launch it with Bottles, or ask if you want to install Bottles."
                              : "Double-clicking a Windows .exe or .msi file will inspect it as an archive instead of running it."
                    }
                }

                QQC2.Switch {
                    id: exeSwitch
                    onToggled: kcm.setExeHandled(checked)
                }
            }
        }

        // ---- Bottles ------------------------------------------------------
        Kirigami.AbstractCard {
            Layout.fillWidth: true
            contentItem: ColumnLayout {
                spacing: Kirigami.Units.largeSpacing

                RowLayout {
                    spacing: Kirigami.Units.largeSpacing

                    Kirigami.Icon {
                        source: "oneclick-store"
                        Layout.preferredWidth: Kirigami.Units.iconSizes.large
                        Layout.preferredHeight: Kirigami.Units.iconSizes.large
                    }

                    ColumnLayout {
                        Layout.fillWidth: true
                        spacing: 4

                        Kirigami.Heading {
                            level: 3
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            text: "Bottles"
                        }
                        QQC2.Label {
                            Layout.fillWidth: true
                            wrapMode: Text.WordWrap
                            opacity: 0.75
                            text: kcm.bottlesInstalled
                                  ? "Bottles is installed and ready to run Windows programs."
                                  : "Bottles is a free app that runs Windows programs on OneClick OS. Nothing is installed unless you choose to install it."
                        }
                    }
                }

                RowLayout {
                    Layout.alignment: Qt.AlignRight
                    spacing: Kirigami.Units.smallSpacing

                    QQC2.Button {
                        text: "Check again"
                        icon.name: "view-refresh"
                        onClicked: kcm.refresh()
                    }
                    QQC2.Button {
                        visible: !kcm.bottlesInstalled
                        text: "Install Bottles from App Store"
                        icon.name: "system-software-install"
                        highlighted: true
                        onClicked: kcm.installBottles()
                    }
                    QQC2.Button {
                        visible: kcm.bottlesInstalled
                        text: "Open Bottles"
                        icon.name: "oneclick-windows-apps"
                        highlighted: true
                        onClicked: kcm.openBottles()
                    }
                }
            }
        }
    }
}
