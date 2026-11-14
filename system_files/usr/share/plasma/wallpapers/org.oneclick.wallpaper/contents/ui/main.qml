// OneClick login and lock screen wallpaper: full-bleed unblurred wallpaper with bottom wordmark.
import QtQuick
import QtQuick.Window
import org.kde.plasma.plasmoid

WallpaperItem {
    id: root

    readonly property string defaultImage: "file:///usr/share/wallpapers/OneClick/contents/images/3840x2160.jpg"

    loading: bgImage.status === Image.Loading

    function resolvedSource() {
        if (root.configuration && root.configuration.Image) {
            const img = String(root.configuration.Image).trim()
            if (/\.(jpe?g|png|webp|avif|svg)$/i.test(img)) {
                return img
            }
        }
        return root.defaultImage
    }

    function clearBlur() {
        const win = Window.window
        if (win && "blur" in win) {
            try {
                if (win.blur) {
                    win.blur = false
                }
            } catch (e) {
            }
            if (win.blur && root.parent && root.parent.parent) {
                const siblings = root.parent.parent.children
                for (let i = 0; i < siblings.length; i++) {
                    const s = siblings[i]
                    if (s && s !== root.parent && "factor" in s && "source" in s) {
                        s.factor = 0
                        s.visible = false
                    }
                }
            }
        }
    }

    Component.onCompleted: clearBlur()
    onVisibleChanged: clearBlur()
    Window.onWindowChanged: clearBlur()

    Connections {
        target: root.Window.window
        ignoreUnknownSignals: true
        function onBlurChanged() {
            root.clearBlur()
        }
    }

    Rectangle {
        anchors.fill: parent
        color: "#0a1020"
    }

    Image {
        id: bgImage
        anchors.fill: parent
        source: root.resolvedSource()
        fillMode: Image.PreserveAspectCrop
        asynchronous: true
        smooth: true
    }

    Image {
        id: wordmark
        anchors.bottom: parent.bottom
        anchors.bottomMargin: 28
        anchors.horizontalCenter: parent.horizontalCenter
        height: 28
        fillMode: Image.PreserveAspectFit
        source: "file:///usr/share/oneclick/wordmark.svg"
        sourceSize.height: Math.max(28, Math.round(28 * Screen.devicePixelRatio))
        smooth: true
        opacity: 0.85
        visible: status === Image.Ready
    }
}
