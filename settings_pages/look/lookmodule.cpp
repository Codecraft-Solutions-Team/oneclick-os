#include "lookmodule.h"

#include <KPluginFactory>
#include <QDir>
#include <QFile>
#include <QStandardPaths>

K_PLUGIN_CLASS_WITH_JSON(LookModule, "kcm_oneclick_look.json")

namespace
{
const QString APPLY_BIN = QStringLiteral("/usr/bin/oneclick-apply-look");
}

LookModule::LookModule(QObject *parent, const KPluginMetaData &data)
    : KQuickConfigModule(parent, data)
    , m_currentLook(readLocalLookState())
{
    setButtons(NoAdditionalButton);
    refresh();
}

QString LookModule::normalizeLook(const QString &look)
{
    return look.trimmed() == QLatin1String("mac") ? QStringLiteral("mac") : QStringLiteral("windows");
}

QString LookModule::readLocalLookState()
{
    const QString cfg = QStandardPaths::writableLocation(QStandardPaths::ConfigLocation);
    if (!cfg.isEmpty()) {
        QFile stateFile(QDir(cfg).filePath(QStringLiteral("oneclick/look")));
        if (stateFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
            const QString val = QString::fromUtf8(stateFile.readAll()).trimmed();
            if (val == QLatin1String("mac") || val == QLatin1String("windows")) {
                return val;
            }
        }
    }
    return QStringLiteral("windows");
}

void LookModule::refresh()
{
    if (m_statusProcess || m_busy) {
        return;
    }

    m_statusProcess = new QProcess(this);
    connect(m_statusProcess, &QProcess::finished, this, [this](int exitCode, QProcess::ExitStatus exitStatus) {
        const QString out = QString::fromUtf8(m_statusProcess->readAllStandardOutput()).trimmed();
        m_statusProcess->deleteLater();
        m_statusProcess = nullptr;

        if (exitStatus == QProcess::NormalExit && exitCode == 0 && !out.isEmpty()) {
            const QString next = normalizeLook(out);
            if (next != m_currentLook) {
                m_currentLook = next;
                Q_EMIT stateChanged();
            }
        }
    });
    connect(m_statusProcess, &QProcess::errorOccurred, this, [this](QProcess::ProcessError) {
        if (!m_statusProcess) {
            return;
        }
        m_statusProcess->deleteLater();
        m_statusProcess = nullptr;
    });

    m_statusProcess->start(APPLY_BIN, {QStringLiteral("--status")});
}

void LookModule::applyLook(const QString &look)
{
    const QString normalized = normalizeLook(look);
    if (m_applyProcess) {
        m_pendingLook = normalized;
        return;
    }
    if (normalized == m_currentLook && m_errorMessage.isEmpty()) {
        return;
    }
    startApply(normalized);
}

void LookModule::startApply(const QString &look)
{
    m_busy = true;
    m_errorMessage.clear();
    Q_EMIT stateChanged();

    m_applyProcess = new QProcess(this);
    connect(m_applyProcess, &QProcess::finished, this, [this, look](int exitCode, QProcess::ExitStatus exitStatus) {
        const QString err = QString::fromUtf8(m_applyProcess->readAllStandardError()).trimmed();
        m_applyProcess->deleteLater();
        m_applyProcess = nullptr;
        m_busy = false;

        if (exitStatus == QProcess::NormalExit && exitCode == 0) {
            m_currentLook = look;
            m_errorMessage.clear();
        } else {
            m_errorMessage = err.isEmpty()
                ? QStringLiteral("Could not switch the desktop look right now.")
                : err;
        }
        Q_EMIT stateChanged();

        if (!m_pendingLook.isEmpty()) {
            const QString next = m_pendingLook;
            m_pendingLook.clear();
            if (next != m_currentLook) {
                startApply(next);
                return;
            }
        }

        refresh();
    });
    connect(m_applyProcess, &QProcess::errorOccurred, this, [this](QProcess::ProcessError) {
        if (!m_applyProcess) {
            return;
        }
        const QString msg = m_applyProcess->errorString();
        m_applyProcess->deleteLater();
        m_applyProcess = nullptr;
        m_busy = false;
        m_pendingLook.clear();
        m_errorMessage = msg.isEmpty()
            ? QStringLiteral("Could not start the look switcher.")
            : msg;
        Q_EMIT stateChanged();
    });

    m_applyProcess->start(APPLY_BIN, {look});
}
