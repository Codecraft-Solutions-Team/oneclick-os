#pragma once

#include <QObject>
#include <QProcess>
#include <QString>
#include <QStringList>

class CrashController : public QObject
{
    Q_OBJECT

    Q_PROPERTY(QString appTitle READ appTitle CONSTANT)
    Q_PROPERTY(QString headline READ headline CONSTANT)
    Q_PROPERTY(QString summaryText READ summaryText CONSTANT)
    Q_PROPERTY(bool canReopen READ canReopen CONSTANT)
    Q_PROPERTY(bool copied READ copied NOTIFY copiedChanged)
    Q_PROPERTY(QString technicalDetails READ technicalDetails NOTIFY detailsChanged)

public:
    explicit CrashController(const QStringList &arguments, QObject *parent = nullptr);
    ~CrashController() override;

    QString appTitle() const { return m_appTitle; }
    QString headline() const { return m_headline; }
    QString summaryText() const { return m_summaryText; }
    bool canReopen() const { return !m_executablePath.isEmpty(); }
    bool copied() const { return m_copied; }
    QString technicalDetails() const;

    Q_INVOKABLE void reopen();
    Q_INVOKABLE void copyDetails();
    Q_INVOKABLE void closeDialog();

Q_SIGNALS:
    void detailsChanged();
    void copiedChanged();

private:
    void parseArguments(const QStringList &arguments);
    void loadMetadataFile(const QString &path);
    void resolveExecutable();
    void startCoredumpLookup();

    QString m_appName;
    QString m_programName;
    QString m_appPath;
    QString m_executablePath;
    QString m_signalRaw;
    QString m_pidRaw;
    QString m_appTitle;
    QString m_headline;
    QString m_summaryText;
    QString m_coredumpOutput;
    bool m_hasCrashInfo = false;
    bool m_copied = false;
    QProcess *m_coredumpProc = nullptr;
};
