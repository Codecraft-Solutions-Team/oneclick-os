// The Windows Apps page in Settings.
// Lets the user toggle double-click .exe/.msi handling and open or install Bottles.
#pragma once

#include <KQuickConfigModule>
#include <QPair>
#include <QProcess>
#include <QQueue>
#include <QString>

class WindowsModule : public KQuickConfigModule
{
    Q_OBJECT
    Q_PROPERTY(bool exeHandled READ exeHandled NOTIFY changed)
    Q_PROPERTY(bool bottlesInstalled READ bottlesInstalled NOTIFY changed)
    Q_PROPERTY(bool isArmPreview READ isArmPreview CONSTANT)

public:
    WindowsModule(QObject *parent, const KPluginMetaData &data);

    bool exeHandled() const { return m_exeHandled; }
    bool bottlesInstalled() const { return m_bottlesInstalled; }
    bool isArmPreview() const { return m_isArmPreview; }

    Q_INVOKABLE void refresh();
    Q_INVOKABLE void setExeHandled(bool enabled);
    Q_INVOKABLE void installBottles();
    Q_INVOKABLE void openBottles();

Q_SIGNALS:
    void changed();

private:
    static QString configFilePath();
    void loadInitialExeState();
    void checkMimeDefault();
    void checkBottlesInstalled();
    void startNextMimeUpdate();

    bool m_exeHandled = true;
    bool m_hasExplicitConfig = false;
    bool m_bottlesInstalled = false;
    bool m_isArmPreview = false;

    QProcess *m_mimeQueryProcess = nullptr;
    QProcess *m_bottlesProcess = nullptr;
    QProcess *m_mimeApplyProcess = nullptr;
    QQueue<QPair<QString, QString>> m_mimeQueue;
};
