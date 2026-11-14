#include "cloudmodule.h"

#include <QDesktopServices>
#include <QDir>
#include <QFile>
#include <QFileInfo>
#include <QJsonArray>
#include <QJsonDocument>
#include <QJsonObject>
#include <QNetworkReply>
#include <QNetworkRequest>
#include <QRegularExpression>
#include <QSaveFile>
#include <QStandardPaths>
#include <QUrl>
#include <QXmlStreamReader>
#include <QXmlStreamWriter>

#include <KPluginFactory>

K_PLUGIN_CLASS_WITH_JSON(CloudModule, "kcm_oneclick_cloud.json")

namespace {

int runCommand(const QString &program, const QStringList &args, QString *stdoutOut = nullptr, QString *stderrOut = nullptr)
{
    QProcess proc;
    proc.start(program, args);
    if (!proc.waitForFinished(15000)) {
        proc.kill();
        proc.waitForFinished(1000);
        return -1;
    }
    if (stdoutOut) {
        *stdoutOut = QString::fromUtf8(proc.readAllStandardOutput());
    }
    if (stderrOut) {
        *stderrOut = QString::fromUtf8(proc.readAllStandardError());
    }
    return proc.exitCode();
}

QString extractJsonToken(const QString &output)
{
    static const QRegularExpression pasteBlock(QStringLiteral("--->\\s*(\\{.*?\\})\\s*<---End paste"),
                                               QRegularExpression::DotMatchesEverythingOption);
    const QRegularExpressionMatch match = pasteBlock.match(output);
    if (match.hasMatch()) {
        const QByteArray raw = match.captured(1).toUtf8();
        const QJsonDocument doc = QJsonDocument::fromJson(raw);
        if (doc.isObject() && doc.object().contains(QStringLiteral("access_token"))) {
            return QString::fromUtf8(doc.toJson(QJsonDocument::Compact));
        }
    }

    // Fallback: scan lines or braces for a JSON object containing access_token
    static const QRegularExpression anyObject(QStringLiteral("\\{[^{}]*\"access_token\"[^{}]*\\}"),
                                              QRegularExpression::DotMatchesEverythingOption);
    const QRegularExpressionMatch fallback = anyObject.match(output);
    if (fallback.hasMatch()) {
        const QJsonDocument doc = QJsonDocument::fromJson(fallback.captured(0).toUtf8());
        if (doc.isObject() && doc.object().contains(QStringLiteral("access_token"))) {
            return QString::fromUtf8(doc.toJson(QJsonDocument::Compact));
        }
    }

    return QString();
}

QString normalizeMountUrl(const QString &path)
{
    const QString canonical = QFileInfo(path).canonicalFilePath();
    const QString effective = canonical.isEmpty() ? path : canonical;
    return QUrl::fromLocalFile(effective).toString();
}

} // namespace

CloudModule::CloudModule(QObject *parent, const KPluginMetaData &data)
    : KQuickConfigModule(parent, data)
{
    setButtons(NoAdditionalButton);
    refresh();
}

CloudModule::~CloudModule()
{
    if (m_oneDrive.authProcess) {
        m_oneDrive.authProcess->kill();
        m_oneDrive.authProcess->waitForFinished(1000);
    }
    if (m_googleDrive.authProcess) {
        m_googleDrive.authProcess->kill();
        m_googleDrive.authProcess->waitForFinished(1000);
    }
}

QString CloudModule::oneDriveMountPath() const
{
    return mountPathFor(DriveKind::OneDrive);
}

QString CloudModule::googleDriveMountPath() const
{
    return mountPathFor(DriveKind::GoogleDrive);
}

CloudModule::DriveSpec CloudModule::specFor(DriveKind kind) const
{
    if (kind == DriveKind::OneDrive) {
        return DriveSpec{
            DriveKind::OneDrive,
            QStringLiteral("onedrive"),
            QStringLiteral("onedrive"),
            QStringLiteral("OneDrive"),
            QStringLiteral("OneDrive"),
            QStringLiteral("oneclick-onedrive.service"),
            QStringLiteral("oneclick-onedrive"),
        };
    }
    return DriveSpec{
        DriveKind::GoogleDrive,
        QStringLiteral("gdrive"),
        QStringLiteral("drive"),
        QStringLiteral("Google Drive"),
        QStringLiteral("Google Drive"),
        QStringLiteral("oneclick-gdrive.service"),
        QStringLiteral("oneclick-gdrive"),
    };
}

CloudModule::DriveState &CloudModule::stateFor(DriveKind kind)
{
    return kind == DriveKind::OneDrive ? m_oneDrive : m_googleDrive;
}

QString CloudModule::mountPathFor(DriveKind kind) const
{
    return QDir::homePath() + QLatin1Char('/') + specFor(kind).folderName;
}

QStringList CloudModule::listConfiguredRemotes() const
{
    if (!m_rcloneAvailable) {
        return {};
    }
    QString out;
    if (runCommand(QStringLiteral("rclone"), {QStringLiteral("listremotes")}, &out) != 0) {
        return {};
    }
    QStringList remotes;
    for (const QString &line : out.split(QLatin1Char('\n'), Qt::SkipEmptyParts)) {
        remotes << line.trimmed();
    }
    return remotes;
}

bool CloudModule::isMountActive(const QString &mountPath, const QString &serviceName) const
{
    QString serviceOut;
    if (runCommand(QStringLiteral("systemctl"), {QStringLiteral("--user"), QStringLiteral("is-active"), serviceName}, &serviceOut) == 0) {
        if (serviceOut.trimmed() == QStringLiteral("active")) {
            return true;
        }
    }

    QFile mountsFile(QStringLiteral("/proc/self/mounts"));
    if (mountsFile.open(QIODevice::ReadOnly | QIODevice::Text)) {
        const QString canonical = QFileInfo(mountPath).canonicalFilePath();
        const QByteArray targetUtf8 = (canonical.isEmpty() ? mountPath : canonical).toUtf8();
        const QByteArray content = mountsFile.readAll();
        if (content.contains(targetUtf8)) {
            return true;
        }
    }
    return false;
}

bool CloudModule::detectGoogleAccount() const
{
    const QStringList candidates{
        QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation)
            + QStringLiteral("/libaccounts-glib/accounts.db"),
        QStandardPaths::writableLocation(QStandardPaths::GenericDataLocation)
            + QStringLiteral("/libaccounts-glib/accounts.db"),
    };
    for (const QString &dbPath : candidates) {
        QFile db(dbPath);
        if (db.exists() && db.open(QIODevice::ReadOnly)) {
            const QByteArray bytes = db.read(256 * 1024);
            if (bytes.contains("google") || bytes.contains("Google")) {
                return true;
            }
        }
    }
    return false;
}

void CloudModule::refresh()
{
    m_rcloneAvailable = !QStandardPaths::findExecutable(QStringLiteral("rclone")).isEmpty();
    m_googleAccountConfigured = detectGoogleAccount();

    const QStringList remotes = listConfiguredRemotes();

    auto refreshDrive = [&](DriveKind kind) {
        const DriveSpec spec = specFor(kind);
        DriveState &st = stateFor(kind);
        if (st.busy) {
            return;
        }
        st.connected = remotes.contains(spec.remoteName + QLatin1Char(':'));
        const QString path = mountPathFor(kind);
        st.mounted = st.connected && isMountActive(path, spec.serviceName);

        if (!m_rcloneAvailable) {
            st.status = QStringLiteral("Cloud sync tool is unavailable in this image.");
        } else if (st.mounted) {
            st.status = QStringLiteral("Connected and synced to %1").arg(path);
        } else if (st.connected) {
            st.status = QStringLiteral("Connected, folder is not mounted yet.");
        } else if (kind == DriveKind::GoogleDrive && m_googleAccountConfigured) {
            st.status = QStringLiteral("Google account is signed in and ready in Files.");
        } else {
            st.status = QStringLiteral("Not connected");
        }
    };

    refreshDrive(DriveKind::OneDrive);
    refreshDrive(DriveKind::GoogleDrive);
    Q_EMIT stateChanged();
}

void CloudModule::connectOneDrive()
{
    startAuthorize(DriveKind::OneDrive);
}

void CloudModule::cancelOneDrive()
{
    cancelAuthorize(DriveKind::OneDrive);
}

void CloudModule::mountOneDrive()
{
    mountDrive(DriveKind::OneDrive);
}

void CloudModule::openOneDrive()
{
    openDriveFolder(DriveKind::OneDrive);
}

void CloudModule::disconnectOneDrive()
{
    disconnectDrive(DriveKind::OneDrive);
}

void CloudModule::openGoogleSignIn()
{
    QProcess::startDetached(QStringLiteral("systemsettings"), {QStringLiteral("kcm_kaccounts")});
}

void CloudModule::openGoogleAccountFiles()
{
    if (!QDesktopServices::openUrl(QUrl(QStringLiteral("gdrive:/")))) {
        QProcess::startDetached(QStringLiteral("dolphin"), {QStringLiteral("gdrive:/")});
    }
}

void CloudModule::connectGoogleDriveFolder()
{
    startAuthorize(DriveKind::GoogleDrive);
}

void CloudModule::cancelGoogleDriveFolder()
{
    cancelAuthorize(DriveKind::GoogleDrive);
}

void CloudModule::mountGoogleDriveFolder()
{
    mountDrive(DriveKind::GoogleDrive);
}

void CloudModule::openGoogleDriveFolder()
{
    openDriveFolder(DriveKind::GoogleDrive);
}

void CloudModule::disconnectGoogleDriveFolder()
{
    disconnectDrive(DriveKind::GoogleDrive);
}

void CloudModule::startAuthorize(DriveKind kind)
{
    DriveState &st = stateFor(kind);
    const DriveSpec spec = specFor(kind);

    if (!m_rcloneAvailable) {
        st.error = QStringLiteral("Cloud sync tool is not installed on this system.");
        Q_EMIT stateChanged();
        return;
    }

    if (st.authProcess) {
        st.authProcess->disconnect(this);
        st.authProcess->kill();
        st.authProcess->deleteLater();
        st.authProcess = nullptr;
    }

    st.busy = true;
    st.error.clear();
    st.authUrl.clear();
    st.authBuffer.clear();
    st.status = QStringLiteral("Complete sign-in in the browser window that opens...");
    Q_EMIT stateChanged();

    auto *proc = new QProcess(this);
    proc->setProcessChannelMode(QProcess::MergedChannels);
    st.authProcess = proc;

    connect(proc, &QProcess::readyReadStandardOutput, this, [this, kind, proc]() {
        DriveState &state = stateFor(kind);
        const QString chunk = QString::fromUtf8(proc->readAllStandardOutput());
        state.authBuffer.append(chunk);

        if (state.authUrl.isEmpty()) {
            static const QRegularExpression urlRx(QStringLiteral("https?://127\\.0\\.0\\.1:\\d+/auth\\S*"));
            const QRegularExpressionMatch m = urlRx.match(state.authBuffer);
            if (m.hasMatch()) {
                state.authUrl = m.captured(0);
                QDesktopServices::openUrl(QUrl(state.authUrl));
                Q_EMIT stateChanged();
            }
        }
    });

    connect(proc, &QProcess::finished, this, [this, kind](int exitCode, QProcess::ExitStatus exitStatus) {
        handleAuthorizeFinished(kind, exitCode, exitStatus);
    });

    connect(proc, &QProcess::errorOccurred, this, [this, kind](QProcess::ProcessError) {
        DriveState &state = stateFor(kind);
        if (!state.busy) {
            return;
        }
        state.busy = false;
        state.error = QStringLiteral("Could not start sign-in helper.");
        if (state.authProcess) {
            state.authProcess->deleteLater();
            state.authProcess = nullptr;
        }
        refresh();
    });

    proc->start(QStringLiteral("rclone"), {
        QStringLiteral("authorize"),
        spec.backendName,
        QStringLiteral("--auth-no-open-browser"),
    });
}

void CloudModule::cancelAuthorize(DriveKind kind)
{
    DriveState &st = stateFor(kind);
    if (st.authProcess) {
        st.authProcess->disconnect(this);
        st.authProcess->kill();
        st.authProcess->waitForFinished(1000);
        st.authProcess->deleteLater();
        st.authProcess = nullptr;
    }
    st.busy = false;
    st.authUrl.clear();
    st.authBuffer.clear();
    st.error.clear();
    refresh();
}

void CloudModule::handleAuthorizeFinished(DriveKind kind, int exitCode, QProcess::ExitStatus exitStatus)
{
    DriveState &st = stateFor(kind);
    if (st.authProcess) {
        st.authBuffer.append(QString::fromUtf8(st.authProcess->readAllStandardOutput()));
        st.authProcess->deleteLater();
        st.authProcess = nullptr;
    }

    if (exitStatus != QProcess::NormalExit || exitCode != 0) {
        st.busy = false;
        st.authUrl.clear();
        st.error = QStringLiteral("Sign-in was cancelled or did not finish. Please try again.");
        refresh();
        return;
    }

    const QString tokenJson = extractJsonToken(st.authBuffer);
    if (tokenJson.isEmpty()) {
        st.busy = false;
        st.authUrl.clear();
        st.error = QStringLiteral("Did not receive a valid login token from the browser.");
        refresh();
        return;
    }

    const QJsonObject tokenObj = QJsonDocument::fromJson(tokenJson.toUtf8()).object();
    const QString accessToken = tokenObj.value(QStringLiteral("access_token")).toString();

    if (kind == DriveKind::OneDrive) {
        completeOneDriveSetup(tokenJson, accessToken);
    } else {
        createRemoteAndMount(DriveKind::GoogleDrive, tokenJson, {
            {QStringLiteral("scope"), QStringLiteral("drive")},
            {QStringLiteral("config_is_local"), QStringLiteral("false")},
        });
    }
}

void CloudModule::completeOneDriveSetup(const QString &tokenJson, const QString &accessToken)
{
    if (accessToken.isEmpty()) {
        createRemoteAndMount(DriveKind::OneDrive, tokenJson, {
            {QStringLiteral("config_type"), QStringLiteral("onedrive")},
            {QStringLiteral("config_is_local"), QStringLiteral("false")},
        });
        return;
    }

    QNetworkRequest req(QUrl(QStringLiteral("https://graph.microsoft.com/v1.0/me/drives")));
    req.setRawHeader("Authorization", QByteArrayLiteral("Bearer ") + accessToken.toUtf8());

    QNetworkReply *reply = m_network.get(req);
    connect(reply, &QNetworkReply::finished, this, [this, reply, tokenJson]() {
        reply->deleteLater();

        QMap<QString, QString> opts{
            {QStringLiteral("config_is_local"), QStringLiteral("false")},
        };

        if (reply->error() == QNetworkReply::NoError) {
            const QJsonDocument doc = QJsonDocument::fromJson(reply->readAll());
            const QJsonArray drives = doc.object().value(QStringLiteral("value")).toArray();
            if (!drives.isEmpty()) {
                const QJsonObject first = drives.first().toObject();
                const QString driveId = first.value(QStringLiteral("id")).toString();
                const QString driveType = first.value(QStringLiteral("driveType")).toString();
                if (!driveId.isEmpty()) {
                    opts.insert(QStringLiteral("drive_id"), driveId);
                }
                if (!driveType.isEmpty()) {
                    opts.insert(QStringLiteral("drive_type"), driveType);
                }
            }
        }

        if (!opts.contains(QStringLiteral("drive_id"))) {
            opts.insert(QStringLiteral("config_type"), QStringLiteral("onedrive"));
        }

        createRemoteAndMount(DriveKind::OneDrive, tokenJson, opts);
    });
}

void CloudModule::createRemoteAndMount(DriveKind kind, const QString &tokenJson, const QMap<QString, QString> &extraOptions)
{
    DriveState &st = stateFor(kind);
    const DriveSpec spec = specFor(kind);

    auto failConfig = [&](const QString &msg) {
        st.busy = false;
        st.authUrl.clear();
        st.error = msg;
        refresh();
    };

    // Resolve active rclone config path via `rclone config file` and write the
    // remote section directly with 0600 permissions so the OAuth token is never
    // exposed in /proc/<pid>/cmdline or environment variables.
    QString cfgOut;
    QString cfgPath;
    if (runCommand(QStringLiteral("rclone"), {QStringLiteral("config"), QStringLiteral("file")}, &cfgOut) == 0) {
        const QStringList lines = cfgOut.split(QLatin1Char('\n'), Qt::SkipEmptyParts);
        if (!lines.isEmpty()) {
            cfgPath = lines.last().trimmed();
        }
    }
    if (cfgPath.isEmpty()) {
        cfgPath = QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation)
            + QStringLiteral("/rclone/rclone.conf");
    }

    QByteArray existingBytes;
    QFile existingFile(cfgPath);
    if (existingFile.exists() && existingFile.open(QIODevice::ReadOnly)) {
        existingBytes = existingFile.readAll();
    }

    if (existingBytes.startsWith("RCLONE_ENCRYPT_V0")) {
        failConfig(QStringLiteral("Your rclone configuration is password-encrypted. Unlock or update it first."));
        return;
    }

    QStringList keptLines;
    bool inTargetSection = false;
    const QString sectionHeader = QStringLiteral("[%1]").arg(spec.remoteName);
    for (const QString &line : QString::fromUtf8(existingBytes).split(QLatin1Char('\n'))) {
        const QString trimmed = line.trimmed();
        if (trimmed.startsWith(QLatin1Char('[')) && trimmed.endsWith(QLatin1Char(']'))) {
            inTargetSection = (trimmed == sectionHeader);
            if (inTargetSection) {
                continue;
            }
        }
        if (!inTargetSection) {
            keptLines << line;
        }
    }
    while (!keptLines.isEmpty() && keptLines.last().trimmed().isEmpty()) {
        keptLines.removeLast();
    }

    QStringList newSection;
    newSection << sectionHeader;
    newSection << (QStringLiteral("type = ") + spec.backendName);
    newSection << (QStringLiteral("token = ") + tokenJson);
    for (auto it = extraOptions.cbegin(); it != extraOptions.cend(); ++it) {
        newSection << (it.key() + QStringLiteral(" = ") + it.value());
    }

    QString finalText;
    if (!keptLines.isEmpty()) {
        finalText = keptLines.join(QLatin1Char('\n')) + QStringLiteral("\n\n");
    }
    finalText += newSection.join(QLatin1Char('\n')) + QStringLiteral("\n");

    const QFileInfo cfgInfo(cfgPath);
    if (!QDir().mkpath(cfgInfo.absolutePath())) {
        failConfig(QStringLiteral("Could not create configuration directory for %1.").arg(spec.displayName));
        return;
    }

    QSaveFile cfgSave(cfgPath);
    if (!cfgSave.open(QIODevice::WriteOnly | QIODevice::Truncate | QIODevice::Text)) {
        failConfig(QStringLiteral("Could not save %1 configuration.").arg(spec.displayName));
        return;
    }
    cfgSave.setPermissions(QFileDevice::ReadOwner | QFileDevice::WriteOwner);
    cfgSave.write(finalText.toUtf8());
    if (!cfgSave.commit()) {
        failConfig(QStringLiteral("Could not write %1 configuration file.").arg(spec.displayName));
        return;
    }
    QFile::setPermissions(cfgPath, QFileDevice::ReadOwner | QFileDevice::WriteOwner);

    const QString mountPath = mountPathFor(kind);
    QDir().mkpath(mountPath);

    if (!ensureServiceFile(spec)) {
        failConfig(QStringLiteral("Could not create background mount service for %1.").arg(spec.displayName));
        return;
    }

    updateFilesBookmark(spec, true);

    runCommand(QStringLiteral("systemctl"), {QStringLiteral("--user"), QStringLiteral("daemon-reload")});
    QString sysErr;
    const int startCode = runCommand(
        QStringLiteral("systemctl"),
        {QStringLiteral("--user"), QStringLiteral("enable"), QStringLiteral("--now"), spec.serviceName},
        nullptr,
        &sysErr);

    st.busy = false;
    st.authUrl.clear();
    if (startCode != 0) {
        st.error = sysErr.trimmed().isEmpty()
            ? QStringLiteral("Connected account, but failed to start %1 folder mount.").arg(spec.displayName)
            : sysErr.trimmed();
    } else {
        st.error.clear();
    }
    refresh();
}

void CloudModule::mountDrive(DriveKind kind)
{
    const DriveSpec spec = specFor(kind);
    DriveState &st = stateFor(kind);

    st.error.clear();
    QDir().mkpath(mountPathFor(kind));
    ensureServiceFile(spec);
    updateFilesBookmark(spec, true);

    runCommand(QStringLiteral("systemctl"), {QStringLiteral("--user"), QStringLiteral("daemon-reload")});
    QString sysErr;
    if (runCommand(QStringLiteral("systemctl"),
                   {QStringLiteral("--user"), QStringLiteral("enable"), QStringLiteral("--now"), spec.serviceName},
                   nullptr,
                   &sysErr) != 0) {
        st.error = sysErr.trimmed().isEmpty()
            ? QStringLiteral("Could not mount %1 folder.").arg(spec.displayName)
            : sysErr.trimmed();
    }
    refresh();
}

void CloudModule::openDriveFolder(DriveKind kind)
{
    const QString path = mountPathFor(kind);
    QDir().mkpath(path);
    if (!QDesktopServices::openUrl(QUrl::fromLocalFile(path))) {
        QProcess::startDetached(QStringLiteral("dolphin"), {path});
    }
}

void CloudModule::disconnectDrive(DriveKind kind)
{
    const DriveSpec spec = specFor(kind);
    DriveState &st = stateFor(kind);

    if (st.authProcess) {
        cancelAuthorize(kind);
    }

    runCommand(QStringLiteral("systemctl"),
               {QStringLiteral("--user"), QStringLiteral("disable"), QStringLiteral("--now"), spec.serviceName});

    const QString mountPath = mountPathFor(kind);
    runCommand(QStringLiteral("fusermount3"), {QStringLiteral("-u"), mountPath});

    const QString unitPath = QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation)
        + QStringLiteral("/systemd/user/") + spec.serviceName;
    QFile::remove(unitPath);
    runCommand(QStringLiteral("systemctl"), {QStringLiteral("--user"), QStringLiteral("daemon-reload")});

    if (m_rcloneAvailable) {
        runCommand(QStringLiteral("rclone"), {QStringLiteral("config"), QStringLiteral("delete"), spec.remoteName});
    }

    updateFilesBookmark(spec, false);
    st.error.clear();
    st.authUrl.clear();
    refresh();
}

bool CloudModule::ensureServiceFile(const DriveSpec &spec) const
{
    const QString userUnitDir = QStandardPaths::writableLocation(QStandardPaths::GenericConfigLocation)
        + QStringLiteral("/systemd/user");
    if (!QDir().mkpath(userUnitDir)) {
        return false;
    }

    const QString unitPath = userUnitDir + QLatin1Char('/') + spec.serviceName;
    const QString content = QStringLiteral(
        "[Unit]\n"
        "Description=%1 folder (OneClick OS)\n"
        "After=network-online.target graphical-session.target\n"
        "Wants=network-online.target\n\n"
        "[Service]\n"
        "Type=simple\n"
        "ExecStartPre=/usr/bin/mkdir -p \"%h/%2\"\n"
        "ExecStart=/usr/bin/rclone mount %3: \"%h/%2\" --vfs-cache-mode writes --vfs-cache-max-age 24h --dir-cache-time 30s\n"
        "ExecStop=/usr/bin/fusermount3 -u \"%h/%2\"\n"
        "Restart=on-failure\n"
        "RestartSec=10\n\n"
        "[Install]\n"
        "WantedBy=default.target\n")
                                .arg(spec.displayName, spec.folderName, spec.remoteName);

    QSaveFile file(unitPath);
    if (!file.open(QIODevice::WriteOnly | QIODevice::Truncate | QIODevice::Text)) {
        return false;
    }
    file.write(content.toUtf8());
    return file.commit();
}

bool CloudModule::updateFilesBookmark(const DriveSpec &spec, bool add) const
{
    const QString dataDir = QStandardPaths::writableLocation(QStandardPaths::GenericDataLocation);
    if (!QDir().mkpath(dataDir)) {
        return false;
    }

    const QString xbelPath = dataDir + QStringLiteral("/user-places.xbel");
    const QString targetHref = normalizeMountUrl(mountPathFor(spec.kind));

    QByteArray existingBytes;
    QFile existingFile(xbelPath);
    if (existingFile.exists() && existingFile.open(QIODevice::ReadOnly)) {
        existingBytes = existingFile.readAll();
    }

    QByteArray outBytes;
    QXmlStreamWriter writer(&outBytes);
    writer.setAutoFormatting(true);
    writer.setAutoFormattingIndent(1);

    auto writeOneClickBookmark = [&](QXmlStreamWriter &targetWriter) {
        targetWriter.writeStartElement(QStringLiteral("bookmark"));
        targetWriter.writeAttribute(QStringLiteral("href"), targetHref);
        targetWriter.writeTextElement(QStringLiteral("title"), spec.displayName);
        targetWriter.writeStartElement(QStringLiteral("info"));

        targetWriter.writeStartElement(QStringLiteral("metadata"));
        targetWriter.writeAttribute(QStringLiteral("owner"), QStringLiteral("http://freedesktop.org"));
        targetWriter.writeEmptyElement(QStringLiteral("http://www.freedesktop.org/standards/desktop-bookmarks"),
                                       QStringLiteral("icon"));
        targetWriter.writeAttribute(QStringLiteral("name"), QStringLiteral("oneclick-cloud-drive"));
        targetWriter.writeEndElement();

        targetWriter.writeStartElement(QStringLiteral("metadata"));
        targetWriter.writeAttribute(QStringLiteral("owner"), QStringLiteral("http://www.kde.org"));
        targetWriter.writeTextElement(QStringLiteral("ID"), spec.bookmarkId);
        targetWriter.writeTextElement(QStringLiteral("isSystemItem"), QStringLiteral("false"));
        targetWriter.writeEndElement();

        targetWriter.writeEndElement(); // info
        targetWriter.writeEndElement(); // bookmark
    };

    bool hasXbel = false;
    if (!existingBytes.trimmed().isEmpty()) {
        QXmlStreamReader reader(existingBytes);
        while (!reader.atEnd()) {
            const auto token = reader.readNext();
            if (token == QXmlStreamReader::StartElement && reader.name() == QStringLiteral("xbel")) {
                hasXbel = true;
            }
            if (token == QXmlStreamReader::StartElement
                && reader.name() == QStringLiteral("bookmark")
                && reader.attributes().value(QStringLiteral("href")).toString() == targetHref) {
                reader.skipCurrentElement();
                continue;
            }
            if (token == QXmlStreamReader::EndElement
                && reader.name() == QStringLiteral("xbel")
                && add) {
                writeOneClickBookmark(writer);
            }
            if (token != QXmlStreamReader::Invalid && token != QXmlStreamReader::EndDocument) {
                writer.writeCurrentToken(reader);
            }
        }
        if (reader.hasError() || !hasXbel) {
            outBytes.clear();
        } else {
            writer.writeEndDocument();
        }
    }

    if (outBytes.isEmpty()) {
        if (!add) {
            return true;
        }
        QXmlStreamWriter freshWriter(&outBytes);
        freshWriter.setAutoFormatting(true);
        freshWriter.setAutoFormattingIndent(1);
        freshWriter.writeStartDocument();
        freshWriter.writeDTD(QStringLiteral("<!DOCTYPE xbel>"));
        freshWriter.writeNamespace(QStringLiteral("http://www.freedesktop.org/standards/desktop-bookmarks"),
                                   QStringLiteral("bookmark"));
        freshWriter.writeNamespace(QStringLiteral("http://www.kde.org/kdepriv"), QStringLiteral("kdepriv"));
        freshWriter.writeNamespace(QStringLiteral("http://freedesktop.org/standards/shared-mime-info"),
                                   QStringLiteral("mime"));
        freshWriter.writeStartElement(QStringLiteral("xbel"));
        writeOneClickBookmark(freshWriter);
        freshWriter.writeEndElement();
        freshWriter.writeEndDocument();
    }

    QSaveFile save(xbelPath);
    if (!save.open(QIODevice::WriteOnly | QIODevice::Truncate | QIODevice::Text)) {
        return false;
    }
    save.write(outBytes);
    return save.commit();
}

#include "cloudmodule.moc"
