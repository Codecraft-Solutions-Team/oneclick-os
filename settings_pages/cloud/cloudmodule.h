#pragma once

#include <QMap>
#include <QNetworkAccessManager>
#include <QProcess>
#include <QString>
#include <KQuickConfigModule>

class CloudModule : public KQuickConfigModule
{
    Q_OBJECT

    Q_PROPERTY(bool rcloneAvailable READ rcloneAvailable NOTIFY stateChanged)

    Q_PROPERTY(bool oneDriveConnected READ oneDriveConnected NOTIFY stateChanged)
    Q_PROPERTY(bool oneDriveMounted READ oneDriveMounted NOTIFY stateChanged)
    Q_PROPERTY(bool oneDriveBusy READ oneDriveBusy NOTIFY stateChanged)
    Q_PROPERTY(QString oneDriveMountPath READ oneDriveMountPath CONSTANT)
    Q_PROPERTY(QString oneDriveStatus READ oneDriveStatus NOTIFY stateChanged)
    Q_PROPERTY(QString oneDriveError READ oneDriveError NOTIFY stateChanged)
    Q_PROPERTY(QString oneDriveAuthUrl READ oneDriveAuthUrl NOTIFY stateChanged)

    Q_PROPERTY(bool googleAccountConfigured READ googleAccountConfigured NOTIFY stateChanged)
    Q_PROPERTY(bool googleDriveConnected READ googleDriveConnected NOTIFY stateChanged)
    Q_PROPERTY(bool googleDriveMounted READ googleDriveMounted NOTIFY stateChanged)
    Q_PROPERTY(bool googleDriveBusy READ googleDriveBusy NOTIFY stateChanged)
    Q_PROPERTY(QString googleDriveMountPath READ googleDriveMountPath CONSTANT)
    Q_PROPERTY(QString googleDriveStatus READ googleDriveStatus NOTIFY stateChanged)
    Q_PROPERTY(QString googleDriveError READ googleDriveError NOTIFY stateChanged)
    Q_PROPERTY(QString googleDriveAuthUrl READ googleDriveAuthUrl NOTIFY stateChanged)

public:
    enum class DriveKind {
        OneDrive,
        GoogleDrive,
    };
    Q_ENUM(DriveKind)

    explicit CloudModule(QObject *parent, const KPluginMetaData &data);
    ~CloudModule() override;

    bool rcloneAvailable() const { return m_rcloneAvailable; }

    bool oneDriveConnected() const { return m_oneDrive.connected; }
    bool oneDriveMounted() const { return m_oneDrive.mounted; }
    bool oneDriveBusy() const { return m_oneDrive.busy; }
    QString oneDriveMountPath() const;
    QString oneDriveStatus() const { return m_oneDrive.status; }
    QString oneDriveError() const { return m_oneDrive.error; }
    QString oneDriveAuthUrl() const { return m_oneDrive.authUrl; }

    bool googleAccountConfigured() const { return m_googleAccountConfigured; }
    bool googleDriveConnected() const { return m_googleDrive.connected; }
    bool googleDriveMounted() const { return m_googleDrive.mounted; }
    bool googleDriveBusy() const { return m_googleDrive.busy; }
    QString googleDriveMountPath() const;
    QString googleDriveStatus() const { return m_googleDrive.status; }
    QString googleDriveError() const { return m_googleDrive.error; }
    QString googleDriveAuthUrl() const { return m_googleDrive.authUrl; }

    Q_INVOKABLE void refresh();
    Q_INVOKABLE void connectOneDrive();
    Q_INVOKABLE void cancelOneDrive();
    Q_INVOKABLE void mountOneDrive();
    Q_INVOKABLE void openOneDrive();
    Q_INVOKABLE void disconnectOneDrive();

    Q_INVOKABLE void openGoogleSignIn();
    Q_INVOKABLE void openGoogleAccountFiles();
    Q_INVOKABLE void connectGoogleDriveFolder();
    Q_INVOKABLE void cancelGoogleDriveFolder();
    Q_INVOKABLE void mountGoogleDriveFolder();
    Q_INVOKABLE void openGoogleDriveFolder();
    Q_INVOKABLE void disconnectGoogleDriveFolder();

Q_SIGNALS:
    void stateChanged();

private:
    struct DriveState {
        bool connected = false;
        bool mounted = false;
        bool busy = false;
        QString status;
        QString error;
        QString authUrl;
        QString authBuffer;
        QProcess *authProcess = nullptr;
    };

    struct DriveSpec {
        DriveKind kind;
        QString remoteName;
        QString backendName;
        QString folderName;
        QString displayName;
        QString serviceName;
        QString bookmarkId;
    };

    DriveSpec specFor(DriveKind kind) const;
    DriveState &stateFor(DriveKind kind);
    QString mountPathFor(DriveKind kind) const;

    void startAuthorize(DriveKind kind);
    void cancelAuthorize(DriveKind kind);
    void handleAuthorizeFinished(DriveKind kind, int exitCode, QProcess::ExitStatus exitStatus);
    void completeOneDriveSetup(const QString &tokenJson, const QString &accessToken);
    void createRemoteAndMount(DriveKind kind, const QString &tokenJson, const QMap<QString, QString> &extraOptions);
    void mountDrive(DriveKind kind);
    void openDriveFolder(DriveKind kind);
    void disconnectDrive(DriveKind kind);

    bool ensureServiceFile(const DriveSpec &spec) const;
    bool updateFilesBookmark(const DriveSpec &spec, bool add) const;
    bool isMountActive(const QString &mountPath, const QString &serviceName) const;
    bool detectGoogleAccount() const;
    QStringList listConfiguredRemotes() const;

    QNetworkAccessManager m_network;
    bool m_rcloneAvailable = false;
    bool m_googleAccountConfigured = false;
    DriveState m_oneDrive;
    DriveState m_googleDrive;
};
