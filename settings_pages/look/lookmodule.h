// The Look page in Settings: switch between Windows style and Mac style.
#pragma once

#include <KQuickConfigModule>
#include <QProcess>
#include <QString>

class LookModule : public KQuickConfigModule
{
    Q_OBJECT
    Q_PROPERTY(QString currentLook READ currentLook NOTIFY stateChanged)
    Q_PROPERTY(bool busy READ busy NOTIFY stateChanged)
    Q_PROPERTY(QString errorMessage READ errorMessage NOTIFY stateChanged)

public:
    LookModule(QObject *parent, const KPluginMetaData &data);

    QString currentLook() const { return m_currentLook; }
    bool busy() const { return m_busy; }
    QString errorMessage() const { return m_errorMessage; }

    Q_INVOKABLE void refresh();
    Q_INVOKABLE void applyLook(const QString &look);

Q_SIGNALS:
    void stateChanged();

private:
    static QString normalizeLook(const QString &look);
    static QString readLocalLookState();
    void startApply(const QString &look);

    QString m_currentLook;
    bool m_busy = false;
    QString m_errorMessage;
    QString m_pendingLook;
    QProcess *m_statusProcess = nullptr;
    QProcess *m_applyProcess = nullptr;
};
