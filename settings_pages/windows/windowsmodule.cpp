#include "windowsmodule.h"

#include <KPluginFactory>
#include <QDesktopServices>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QStandardPaths>
#include <QStringList>
#include <QSysInfo>
#include <QUrl>

K_PLUGIN_CLASS_WITH_JSON(WindowsModule, "kcm_oneclick_windows.json")

namespace
{
const QString HANDLER_DESKTOP = QStringLiteral("oneclick-open-windows-app.desktop");
const QString ARCHIVE_DESKTOP = QStringLiteral("org.kde.ark.desktop");
const QString BOTTLES_ID = QStringLiteral("com.usebottles.bottles");

const QStringList &windowsMimeTypes()
{
    static const QStringList types = {
        QStringLiteral("application/x-ms-dos-executable"),
        QStringLiteral("application/x-msdownload"),
        QStringLiteral("application/vnd.microsoft.portable-executable"),
        QStringLiteral("application/x-msi"),
    };
    return types;
}
}

WindowsModule::WindowsModule(QObject *parent, const KPluginMetaData &data)
    : KQuickConfigModule(parent, data)
    , m_isArmPreview(QSysInfo::currentCpuArchitecture() != QLatin1String("x86_64"))
{
    setButtons(NoAdditionalButton);
    loadInitialExeState();
    refresh();
}

QString WindowsModule::configFilePath()
{
    return QStandardPaths::writableLocation(QStandardPaths::ConfigLocation)
        + QStringLiteral("/oneclick/windows-exe-enabled");
}

void WindowsModule::loadInitialExeState()
{
    QFile file(configFilePath());
    if (!file.exists()) {
        m_hasExplicitConfig = false;
        m_exeHandled = true;
        return;
    }

    m_hasExplicitConfig = true;
    if (file.open(QIODevice::ReadOnly)) {
        const QString val = QString::fromUtf8(file.readAll()).trimmed().toLower();
        m_exeHandled = (val != QLatin1String("false") && val != QLatin1String("0") && val != QLatin1String("no"));
    }
}

void WindowsModule::refresh()
{
    checkMimeDefault();
    checkBottlesInstalled();
}

void WindowsModule::checkMimeDefault()
{
    if (m_mimeQueryProcess || m_mimeApplyProcess) {
        return;
    }

    m_mimeQueryProcess = new QProcess(this);
    connect(m_mimeQueryProcess, &QProcess::finished, this, [this](int code, QProcess::ExitStatus) {
        const QString handler = QString::fromUtf8(m_mimeQueryProcess->readAllStandardOutput()).trimmed();
        m_mimeQueryProcess->deleteLater();
        m_mimeQueryProcess = nullptr;

        if (code != 0 || m_mimeApplyProcess || !m_mimeQueue.isEmpty()) {
            return;
        }

        // If the config file explicitly says false, keep false; otherwise respect xdg-mime default if set.
        bool nextHandled = m_exeHandled;
        if (!m_hasExplicitConfig) {
            nextHandled = handler.isEmpty() || handler == HANDLER_DESKTOP;
        } else if (m_exeHandled && !handler.isEmpty()) {
            nextHandled = (handler == HANDLER_DESKTOP);
        }

        if (nextHandled != m_exeHandled) {
            m_exeHandled = nextHandled;
            Q_EMIT changed();
        }
    });
    connect(m_mimeQueryProcess, &QProcess::errorOccurred, this, [this](QProcess::ProcessError err) {
        if (err == QProcess::FailedToStart && m_mimeQueryProcess) {
            m_mimeQueryProcess->deleteLater();
            m_mimeQueryProcess = nullptr;
        }
    });

    m_mimeQueryProcess->start(QStringLiteral("xdg-mime"),
                              {QStringLiteral("query"), QStringLiteral("default"), windowsMimeTypes().first()});
}

void WindowsModule::checkBottlesInstalled()
{
    if (m_bottlesProcess) {
        return;
    }

    m_bottlesProcess = new QProcess(this);
    connect(m_bottlesProcess, &QProcess::finished, this, [this](int code, QProcess::ExitStatus) {
        m_bottlesProcess->deleteLater();
        m_bottlesProcess = nullptr;

        const bool installed = (code == 0);
        if (installed != m_bottlesInstalled) {
            m_bottlesInstalled = installed;
            Q_EMIT changed();
        }
    });
    connect(m_bottlesProcess, &QProcess::errorOccurred, this, [this](QProcess::ProcessError err) {
        if (err != QProcess::FailedToStart) {
            return;
        }
        if (m_bottlesProcess) {
            m_bottlesProcess->deleteLater();
            m_bottlesProcess = nullptr;
        }
        if (m_bottlesInstalled) {
            m_bottlesInstalled = false;
            Q_EMIT changed();
        }
    });

    m_bottlesProcess->start(QStringLiteral("flatpak"), {QStringLiteral("info"), BOTTLES_ID});
}

void WindowsModule::setExeHandled(bool enabled)
{
    const QString path = configFilePath();
    QDir().mkpath(QFileInfo(path).absolutePath());
    QFile file(path);
    if (file.open(QIODevice::WriteOnly | QIODevice::Truncate)) {
        file.write(enabled ? "true\n" : "false\n");
    }

    m_hasExplicitConfig = true;
    if (enabled != m_exeHandled) {
        m_exeHandled = enabled;
        Q_EMIT changed();
    }

    const QString desktop = enabled ? HANDLER_DESKTOP : ARCHIVE_DESKTOP;
    m_mimeQueue.clear();
    for (const QString &mime : windowsMimeTypes()) {
        m_mimeQueue.enqueue(qMakePair(desktop, mime));
    }
    if (!m_mimeApplyProcess) {
        startNextMimeUpdate();
    }
}

void WindowsModule::startNextMimeUpdate()
{
    if (m_mimeQueue.isEmpty() || m_mimeApplyProcess) {
        return;
    }

    const auto next = m_mimeQueue.dequeue();
    m_mimeApplyProcess = new QProcess(this);
    auto advance = [this]() {
        if (m_mimeApplyProcess) {
            m_mimeApplyProcess->deleteLater();
            m_mimeApplyProcess = nullptr;
        }
        startNextMimeUpdate();
    };
    connect(m_mimeApplyProcess, &QProcess::finished, this, [advance](int, QProcess::ExitStatus) {
        advance();
    });
    connect(m_mimeApplyProcess, &QProcess::errorOccurred, this, [advance](QProcess::ProcessError err) {
        if (err == QProcess::FailedToStart) {
            advance();
        }
    });

    m_mimeApplyProcess->start(QStringLiteral("xdg-mime"),
                              {QStringLiteral("default"), next.first, next.second});
}

void WindowsModule::installBottles()
{
    const QUrl url(QStringLiteral("appstream://") + BOTTLES_ID);
    if (!QDesktopServices::openUrl(url)) {
        QProcess::startDetached(QStringLiteral("xdg-open"), {url.toString()});
    }
}

void WindowsModule::openBottles()
{
    if (!m_bottlesInstalled) {
        return;
    }
    QProcess::startDetached(QStringLiteral("flatpak"), {QStringLiteral("run"), BOTTLES_ID});
}

#include "windowsmodule.moc"
