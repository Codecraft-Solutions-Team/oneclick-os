// The Taskbar page in Settings.
// Reads and updates the active desktop taskbar via org.kde.plasmashell D-Bus scripting.
#pragma once

#include <KQuickConfigModule>
#include <QProcess>
#include <QString>

class TaskbarModule : public KQuickConfigModule
{
    Q_OBJECT
    Q_PROPERTY(QString hiding READ hiding NOTIFY stateChanged)
    Q_PROPERTY(bool floating READ floating NOTIFY stateChanged)
    Q_PROPERTY(QString location READ location NOTIFY stateChanged)
    Q_PROPERTY(QString size READ size NOTIFY stateChanged)

public:
    TaskbarModule(QObject *parent, const KPluginMetaData &data);

    QString hiding() const { return m_hiding; }
    bool floating() const { return m_floating; }
    QString location() const { return m_location; }
    QString size() const { return m_size; }

    Q_INVOKABLE void refresh();
    Q_INVOKABLE void applySettings(const QString &hiding, bool floating, const QString &location, const QString &size);

Q_SIGNALS:
    void stateChanged();

private:
    void startNextApply();
    static QString findTaskbarPanelScript();
    static QString normalizeHiding(const QString &hiding);
    static QString normalizeLocation(const QString &location);
    static QString normalizeSize(const QString &size);
    static int heightForSize(const QString &size);
    static QString sizeForHeight(int height);

    QString m_hiding = QStringLiteral("none");
    bool m_floating = false;
    QString m_location = QStringLiteral("bottom");
    QString m_size = QStringLiteral("medium");

    QProcess *m_readProcess = nullptr;
    QProcess *m_applyProcess = nullptr;
    QString m_pendingScript;
    bool m_dirtyByApply = false;
};
