const { app, BrowserWindow, dialog } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const log = require('electron-log');

log.transports.file.resolvePathFn = () => path.join(app.getPath('userData'), 'logs.txt');
log.info('Application starting...');

let mainWindow = null;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false  // Consider security implications depending on your app's needs
        }
    });

    mainWindow.loadFile(path.join(__dirname, 'index.html'));

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

// Ensure only one instance of the app is running
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
    app.quit();
} else {
    app.on('second-instance', (event, commandLine, workingDirectory) => {
        // Someone tried to run a second instance, we should focus our window.
        if (mainWindow) {
            if (mainWindow.isMinimized()) mainWindow.restore();
            mainWindow.focus();
        }
    });

    // This method will be called when Electron has finished initialization
    app.on('ready', () => {
        createWindow();
        autoUpdater.checkForUpdates();
    });

    autoUpdater.on('checking-for-update', () => {
        log.info('Checking for updates...');
    });

    autoUpdater.on('update-available', (info) => {
        log.info(`Update available: Version ${info.version}`);
        dialog.showMessageBox(mainWindow, {
            type: 'question',
            buttons: ['Yes', 'No'],
            title: 'Update Available',
            message: 'An update is available. Do you want to update now?',
            detail: `Version ${info.version} is available. You have ${app.getVersion()}.`
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.downloadUpdate();
                log.info('User accepted the update.');
            } else {
                log.info('User declined the update.');
            }
        }).catch(err => {
            log.error('Error in update dialog:', err);
        });
    });

    autoUpdater.on('update-not-available', (info) => {
        log.info('No update available.');
    });

    autoUpdater.on('error', (err) => {
        log.error('Error in auto-updater:', err);
    });

    autoUpdater.on('download-progress', (progressObj) => {
        mainWindow.webContents.send('download-progress', progressObj.percent);
        log.info(`Download progress: ${progressObj.percent}%`);
    });

    autoUpdater.on('update-downloaded', (info) => {
        log.info('Update downloaded; will install now.');
        dialog.showMessageBox(mainWindow, {
            title: 'Install Updates',
            message: 'Updates downloaded, application will be quit to apply the update...',
            buttons: ['Restart', 'Later'],
            defaultId: 0,
            detail: 'A new version has been downloaded. Restart the application to apply the updates.'
        }).then(result => {
            if (result.response === 0) {
                autoUpdater.quitAndInstall();
                log.info('Application is restarting to apply the update.');
            } else {
                log.info('User chose to install later.');
            }
        });
    });

    app.on('window-all-closed', () => {
        if (process.platform !== 'darwin') {
            app.quit();
        }
    });

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
}
