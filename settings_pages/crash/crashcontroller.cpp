#include "crashcontroller.h"

#include <QClipboard>
#include <QCoreApplication>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QGuiApplication>
#include <QJsonDocument>
#include <QJsonObject>
#include <QSettings>
#include <QStandardPaths>
#include <QTimer>

namespace {

QString signalLabel(const QString &raw)
{
    if (raw.isEmpty()) {
        return QStringLiteral("Unknown");
    }
    bool ok = false;
    const int num = raw.toInt(&ok);
    if (!ok) {
        return raw;
    }
    switch (num) {
    case 4:
        return QStringLiteral("4 (SIGILL)");
    case 6:
        return QStringLiteral("6 (SIGABRT)");
    case 7:
        return QStringLiteral("7 (SIGBUS)");
    case 8:
        return QStringLiteral("8 (SIGFPE)");
    case 9:
        return QStringLiteral("9 (SIGKILL)");
    case 11:
        return QStringLiteral("11 (SIGSEGV)");
    case 15:
        return QStringLiteral("15 (SIGTERM)");
    default:
        return QString::number(num);
    }
}

QString formatAppTitle(const QString &programName, const QString &appName, const QString &exePath)
{
    QString candidate = programName.trimmed();
    if (candidate.isEmpty() || candidate.compare(QStringLiteral("unknown"), Qt::CaseInsensitive) == 0) {
        if (!exePath.isEmpty()) {
            candidate = QFileInfo(exePath).fileName();
        } else if (!appName.isEmpty()) {
            candidate = QFileInfo(appName).fileName();
        }
    }
    if (candidate.isEmpty()) {
        return QStringLiteral("This application");
    }
    if (candidate == candidate.toLower() && candidate.at(0).isLower()) {
        candidate[0] = candidate.at(0).toUpper();
    }
    return candidate;
}

QString jsonString(const QJsonObject &obj, const QString &key)
{
    if (!obj.contains(key)) {
        return QString();
    }
    return obj.value(key).toVariant().toString().trimmed();
}

int computeExpandDurationMs()
{
    const QStringList dirs = QStandardPaths::standardLocations(QStandardPaths::GenericConfigLocation);
    for (const QString &dir : dirs) {
        const QString path = QDir(dir).filePath(QStringLiteral("kdeglobals"));
        if (!QFileInfo::exists(path)) {
            continue;
        }
        QSettings cfg(path, QSettings::IniFormat);
        cfg.beginGroup(QStringLiteral("KDE"));
        if (cfg.contains(QStringLiteral("AnimationDurationFactor"))) {
            bool ok = false;
            const double factor = cfg.value(QStringLiteral("AnimationDurationFactor")).toDouble(&ok);
            if (ok) {
                if (factor <= 0.0) {
                    return 0;
                }
                return qRound(140.0 * qBound(0.0, factor, 5.0));
            }
        }
    }
    return 140;
}

} // namespace

CrashController::CrashController(const QStringList &arguments, QObject *parent)
    : QObject(parent)
    , m_expandDurationMs(computeExpandDurationMs())
{
    parseArguments(arguments);
    resolveExecutable();

    m_hasCrashInfo = !m_appName.isEmpty() || !m_programName.isEmpty() || !m_executablePath.isEmpty()
        || !m_pidRaw.isEmpty() || !m_signalRaw.isEmpty();

    if (m_hasCrashInfo) {
        m_appTitle = formatAppTitle(m_programName, m_appName, m_executablePath);
        m_headline = QStringLiteral("%1 closed unexpectedly.").arg(m_appTitle);
        m_summaryText = canReopen()
            ? QStringLiteral("You can try reopening it or close this window.")
            : QStringLiteral("You can close this window and open the app again from the Start Menu.");
    } else {
        m_appTitle = QStringLiteral("OneClick OS");
        m_headline = QStringLiteral("No recent application crash details found.");
        m_summaryText = QStringLiteral("If an app closes unexpectedly, a recovery window will appear here.");
    }

    startCoredumpLookup();
}

CrashController::~CrashController()
{
    if (m_coredumpProc) {
        m_coredumpProc->kill();
        m_coredumpProc->waitForFinished(500);
    }
}

void CrashController::parseArguments(const QStringList &arguments)
{
    QString metadataPath;

    auto readOptionValue = [&](int &index, const QString &flag, const QString &arg) -> QString {
        const QString prefix = flag + QLatin1Char('=');
        if (arg.startsWith(prefix)) {
            return arg.mid(prefix.size());
        }
        if (arg == flag && index + 1 < arguments.size()) {
            ++index;
            return arguments.at(index);
        }
        return QString();
    };

    for (int i = 1; i < arguments.size(); ++i) {
        const QString &arg = arguments.at(i);
        if (arg == QStringLiteral("--appname") || arg.startsWith(QStringLiteral("--appname="))) {
            m_appName = readOptionValue(i, QStringLiteral("--appname"), arg);
        } else if (arg == QStringLiteral("--programname") || arg.startsWith(QStringLiteral("--programname="))) {
            m_programName = readOptionValue(i, QStringLiteral("--programname"), arg);
        } else if (arg == QStringLiteral("--apppath") || arg.startsWith(QStringLiteral("--apppath="))) {
            m_appPath = readOptionValue(i, QStringLiteral("--apppath"), arg);
        } else if (arg == QStringLiteral("--pid") || arg.startsWith(QStringLiteral("--pid="))) {
            m_pidRaw = readOptionValue(i, QStringLiteral("--pid"), arg);
        } else if (arg == QStringLiteral("--signal") || arg.startsWith(QStringLiteral("--signal="))) {
            m_signalRaw = readOptionValue(i, QStringLiteral("--signal"), arg);
        } else if (arg == QStringLiteral("--metadata_file") || arg.startsWith(QStringLiteral("--metadata_file="))) {
            metadataPath = readOptionValue(i, QStringLiteral("--metadata_file"), arg);
        }
    }

    if (!metadataPath.isEmpty()) {
        loadMetadataFile(metadataPath);
    }
}

void CrashController::loadMetadataFile(const QString &path)
{
    QFile file(path);
    if (!file.open(QIODevice::ReadOnly)) {
        return;
    }
    const QJsonDocument doc = QJsonDocument::fromJson(file.readAll());
    if (!doc.isObject()) {
        return;
    }
    const QJsonObject root = doc.object();
    const QJsonObject kcrash = root.value(QStringLiteral("kcrash")).toObject();
    const QJsonObject journal = root.value(QStringLiteral("journal")).toObject();

    auto fillIfEmpty = [](QString &target, const QString &candidate) {
        if (target.isEmpty() && !candidate.isEmpty()) {
            target = candidate;
        }
    };

    fillIfEmpty(m_programName, jsonString(kcrash, QStringLiteral("programname")));
    fillIfEmpty(m_appName, jsonString(kcrash, QStringLiteral("appname")));
    fillIfEmpty(m_appPath, jsonString(kcrash, QStringLiteral("apppath")));
    fillIfEmpty(m_appPath, jsonString(kcrash, QStringLiteral("exe")));
    fillIfEmpty(m_pidRaw, jsonString(kcrash, QStringLiteral("pid")));
    fillIfEmpty(m_signalRaw, jsonString(kcrash, QStringLiteral("signal")));

    fillIfEmpty(m_appPath, jsonString(journal, QStringLiteral("COREDUMP_EXE")));
    fillIfEmpty(m_appName, jsonString(journal, QStringLiteral("COREDUMP_COMM")));
    fillIfEmpty(m_pidRaw, jsonString(journal, QStringLiteral("COREDUMP_PID")));
    fillIfEmpty(m_signalRaw, jsonString(journal, QStringLiteral("COREDUMP_SIGNAL")));
}

void CrashController::resolveExecutable()
{
    if (!m_appPath.isEmpty()) {
        const QFileInfo pathInfo(m_appPath);
        if (pathInfo.isFile() && pathInfo.isExecutable()) {
            m_executablePath = pathInfo.absoluteFilePath();
            return;
        }
        if (pathInfo.isDir() && !m_appName.isEmpty()) {
            const QString combined = pathInfo.absoluteFilePath() + QLatin1Char('/') + QFileInfo(m_appName).fileName();
            const QFileInfo binInfo(combined);
            if (binInfo.isFile() && binInfo.isExecutable()) {
                m_executablePath = binInfo.absoluteFilePath();
                return;
            }
        }
    }

    if (!m_appName.isEmpty()) {
        const QFileInfo direct(m_appName);
        if (direct.isAbsolute() && direct.isFile() && direct.isExecutable()) {
            m_executablePath = direct.absoluteFilePath();
            return;
        }
        const QString found = QStandardPaths::findExecutable(QFileInfo(m_appName).fileName());
        if (!found.isEmpty()) {
            m_executablePath = found;
        }
    }
}

void CrashController::startCoredumpLookup()
{
    bool ok = false;
    const qint64 pid = m_pidRaw.toLongLong(&ok);
    if (!ok || pid <= 0) {
        return;
    }

    if (QStandardPaths::findExecutable(QStringLiteral("coredumpctl")).isEmpty()) {
        return;
    }

    m_coredumpProc = new QProcess(this);
    m_coredumpProc->setProcessChannelMode(QProcess::MergedChannels);

    auto *timeout = new QTimer(this);
    timeout->setSingleShot(true);
    connect(timeout, &QTimer::timeout, this, [this]() {
        if (m_coredumpProc && m_coredumpProc->state() != QProcess::NotRunning) {
            m_coredumpProc->kill();
        }
    });

    connect(m_coredumpProc, &QProcess::finished, this, [this, timeout](int exitCode, QProcess::ExitStatus) {
        timeout->stop();
        timeout->deleteLater();
        if (m_coredumpProc) {
            const QString out = QString::fromUtf8(m_coredumpProc->readAllStandardOutput()).trimmed();
            if (exitCode == 0 && !out.isEmpty()) {
                m_coredumpOutput = out;
                Q_EMIT detailsChanged();
            }
            m_coredumpProc->deleteLater();
            m_coredumpProc = nullptr;
        }
    });

    timeout->start(3500);
    m_coredumpProc->start(QStringLiteral("coredumpctl"), {QStringLiteral("info"), QString::number(pid)});
}

QString CrashController::technicalDetails() const
{
    QStringList lines;
    lines << QStringLiteral("Application: %1").arg(m_appTitle);
    if (!m_executablePath.isEmpty()) {
        lines << QStringLiteral("Path: %1").arg(m_executablePath);
    } else if (!m_appPath.isEmpty()) {
        lines << QStringLiteral("Path: %1").arg(m_appPath);
    }
    if (!m_pidRaw.isEmpty()) {
        lines << QStringLiteral("PID: %1").arg(m_pidRaw);
    }
    if (!m_signalRaw.isEmpty()) {
        lines << QStringLiteral("Signal: %1").arg(signalLabel(m_signalRaw));
    }
    if (!m_coredumpOutput.isEmpty()) {
        lines << QString();
        lines << m_coredumpOutput;
    }
    return lines.join(QLatin1Char('\n'));
}

void CrashController::reopen()
{
    if (!m_executablePath.isEmpty()) {
        QProcess::startDetached(m_executablePath, {});
    }
    QCoreApplication::quit();
}

void CrashController::copyDetails()
{
    if (QClipboard *clipboard = QGuiApplication::clipboard()) {
        clipboard->setText(technicalDetails());
        m_copied = true;
        Q_EMIT copiedChanged();
    }
}

void CrashController::closeDialog()
{
    QCoreApplication::quit();
}
