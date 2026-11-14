#include <QGuiApplication>
#include <QQmlApplicationEngine>
#include <QQmlContext>
#include <QStringList>
#include <QUrl>

#include <iostream>

#include "crashcontroller.h"

int main(int argc, char *argv[])
{
    qputenv("KDE_DEBUG", "true");
    QCoreApplication::setAttribute(Qt::AA_DisableSessionManager);

    QGuiApplication app(argc, argv);
    app.setApplicationName(QStringLiteral("oneclick-crash-dialog"));
    app.setApplicationDisplayName(QStringLiteral("OneClick OS"));

    const QStringList args = app.arguments();
    for (int i = 1; i < args.size(); ++i) {
        const QString &arg = args.at(i);
        if (arg == QStringLiteral("-h") || arg == QStringLiteral("--help")) {
            std::cout << "OneClick OS Application Recovery Window\n";
            return 0;
        }
        if (arg == QStringLiteral("-v") || arg == QStringLiteral("--version")) {
            std::cout << "oneclick-crash-dialog 1.0\n";
            return 0;
        }
    }

    CrashController controller(args);

    QQmlApplicationEngine engine;
    engine.rootContext()->setContextProperty(QStringLiteral("crash"), &controller);
    engine.load(QUrl(QStringLiteral("qrc:/oneclick/crash/ui/CrashDialog.qml")));
    if (engine.rootObjects().isEmpty()) {
        return 1;
    }

    return app.exec();
}
