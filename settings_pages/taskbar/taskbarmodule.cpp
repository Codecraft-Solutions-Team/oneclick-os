#include "taskbarmodule.h"

#include <KPluginFactory>
#include <QRegularExpression>
#include <QStringList>

K_PLUGIN_CLASS_WITH_JSON(TaskbarModule, "kcm_oneclick_taskbar.json")

namespace
{
const QString QDBUS_BIN = QStringLiteral("qdbus-qt6");
const QString PLASMA_SERVICE = QStringLiteral("org.kde.plasmashell");
const QString PLASMA_PATH = QStringLiteral("/PlasmaShell");
const QString PLASMA_METHOD = QStringLiteral("org.kde.PlasmaShell.evaluateScript");
}

TaskbarModule::TaskbarModule(QObject *parent, const KPluginMetaData &data)
    : KQuickConfigModule(parent, data)
{
    setButtons(NoAdditionalButton);
    refresh();
}

QString TaskbarModule::findTaskbarPanelScript()
{
    // Prefer the panel hosting the taskbar widget (avoids altering the top menu bar in Mac mode),
    // then fall back to a bottom panel, then panels()[0].
    return QStringLiteral(
        "var ps = panels();"
        "var p = null;"
        "for (var i = 0; i < ps.length; i++) {"
        "  var ws = ps[i].widgets();"
        "  for (var j = 0; j < ws.length; j++) {"
        "    if (ws[j].type === 'org.kde.plasma.icontasks') { p = ps[i]; break; }"
        "  }"
        "  if (p) break;"
        "}"
        "if (!p) {"
        "  for (var i = 0; i < ps.length; i++) {"
        "    if (ps[i].location === 'bottom') { p = ps[i]; break; }"
        "  }"
        "}"
        "if (!p && ps.length > 0) { p = ps[0]; }"
    );
}

QString TaskbarModule::normalizeHiding(const QString &hiding)
{
    if (hiding == QLatin1String("dodgewindows") || hiding == QLatin1String("autohide")) {
        return hiding;
    }
    return QStringLiteral("none");
}

QString TaskbarModule::normalizeLocation(const QString &location)
{
    return location == QLatin1String("top") ? QStringLiteral("top") : QStringLiteral("bottom");
}

QString TaskbarModule::normalizeSize(const QString &size)
{
    if (size == QLatin1String("small") || size == QLatin1String("large")) {
        return size;
    }
    return QStringLiteral("medium");
}

int TaskbarModule::heightForSize(const QString &size)
{
    if (size == QLatin1String("small")) {
        return 34;
    }
    if (size == QLatin1String("large")) {
        return 60;
    }
    return 44;
}

QString TaskbarModule::sizeForHeight(int height)
{
    if (height <= 38) {
        return QStringLiteral("small");
    }
    if (height >= 56) {
        return QStringLiteral("large");
    }
    return QStringLiteral("medium");
}

void TaskbarModule::refresh()
{
    if (m_readProcess) {
        return;
    }

    m_dirtyByApply = false;
    const QString script = findTaskbarPanelScript() + QStringLiteral(
        "if (p) { print(p.hiding + ' ' + p.floating + ' ' + p.location + ' ' + p.height); }"
    );

    m_readProcess = new QProcess(this);
    connect(m_readProcess, &QProcess::finished, this, [this](int code, QProcess::ExitStatus) {
        const QString output = QString::fromUtf8(m_readProcess->readAllStandardOutput()).trimmed();
        m_readProcess->deleteLater();
        m_readProcess = nullptr;

        if (code != 0 || output.isEmpty() || m_dirtyByApply) {
            return;
        }

        const QStringList parts = output.split(QRegularExpression(QStringLiteral("\\s+")), Qt::SkipEmptyParts);
        if (parts.size() < 4) {
            return;
        }

        const QString nextHiding = normalizeHiding(parts.at(0));
        const bool nextFloating = (parts.at(1) == QLatin1String("true") || parts.at(1) == QLatin1String("1"));
        const QString nextLocation = normalizeLocation(parts.at(2));
        bool ok = false;
        const int height = parts.at(3).toInt(&ok);
        const QString nextSize = ok ? sizeForHeight(height) : QStringLiteral("medium");

        if (nextHiding != m_hiding || nextFloating != m_floating || nextLocation != m_location || nextSize != m_size) {
            m_hiding = nextHiding;
            m_floating = nextFloating;
            m_location = nextLocation;
            m_size = nextSize;
            Q_EMIT stateChanged();
        }
    });
    connect(m_readProcess, &QProcess::errorOccurred, this, [this](QProcess::ProcessError err) {
        if (err == QProcess::FailedToStart && m_readProcess) {
            m_readProcess->deleteLater();
            m_readProcess = nullptr;
        }
    });

    m_readProcess->start(QDBUS_BIN, {PLASMA_SERVICE, PLASMA_PATH, PLASMA_METHOD, script});
}

void TaskbarModule::applySettings(const QString &hiding, bool floating, const QString &location, const QString &size)
{
    const QString nextHiding = normalizeHiding(hiding);
    const QString nextLocation = normalizeLocation(location);
    const QString nextSize = normalizeSize(size);
    const int height = heightForSize(nextSize);

    m_dirtyByApply = true;
    const bool changed = (nextHiding != m_hiding || floating != m_floating || nextLocation != m_location || nextSize != m_size);
    m_hiding = nextHiding;
    m_floating = floating;
    m_location = nextLocation;
    m_size = nextSize;
    if (changed) {
        Q_EMIT stateChanged();
    }

    const QString script = findTaskbarPanelScript() + QStringLiteral(
        "if (ps.length === 1 && ps[0]) { p = ps[0]; }"
        "if (p) {"
        "  p.hiding = '%1';"
        "  p.floating = %2;"
        "  p.location = '%3';"
        "  p.height = %4;"
        "}"
    ).arg(nextHiding,
          floating ? QStringLiteral("true") : QStringLiteral("false"),
          nextLocation,
          QString::number(height));

    m_pendingScript = script;
    if (!m_applyProcess) {
        startNextApply();
    }
}

void TaskbarModule::startNextApply()
{
    if (m_pendingScript.isEmpty() || m_applyProcess) {
        return;
    }

    const QString script = m_pendingScript;
    m_pendingScript.clear();

    m_applyProcess = new QProcess(this);
    auto finishApply = [this]() {
        if (m_applyProcess) {
            m_applyProcess->deleteLater();
            m_applyProcess = nullptr;
        }
        startNextApply();
    };
    connect(m_applyProcess, &QProcess::finished, this, [finishApply](int, QProcess::ExitStatus) {
        finishApply();
    });
    connect(m_applyProcess, &QProcess::errorOccurred, this, [finishApply](QProcess::ProcessError err) {
        if (err == QProcess::FailedToStart) {
            finishApply();
        }
    });

    m_applyProcess->start(QDBUS_BIN, {PLASMA_SERVICE, PLASMA_PATH, PLASMA_METHOD, script});
}

#include "taskbarmodule.moc"
