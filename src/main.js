const { app, BrowserWindow, autoUpdater, dialog, ipcMain } = require('electron');
const log = require('electron-log');
const path = require('path');
const url = require('url');

// Setting log level
log.transports.file.level = 'info';

// Correcting the path setting method
app.on('ready', () => {
  // Set path explicitly (optional, only if needed)
log.transports.file.resolvePath = () => require('path').join(require('electron').app.getPath('userData'), 'log.log');

});

// Redirect console output to log file
console.log = log.log;
console.error = log.error;
console.warn = log.warn;
console.info = log.info;


log.info('Application starting...');
log.warn('This is a warning message');
log.error('This is an error message');
log.info('Logs are being stored in:', log.transports.file.getFile().path);


// Setting autoUpdater's logging to use electron-log
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

// Handling the 'update-downloaded' event
autoUpdater.on('update-downloaded', (event, releaseNotesreleaseName) => {
    const dialogOpts = {
        type: 'info',
        buttons: ['Restart', 'Later'],
        title: 'Application Update',
        message: process.platform === 'win32' ? releaseNotes : releaseName,
        detail: 'A new version has been downloaded. Restart the application to apply the updates.'
    };

    dialog.showMessageBox(dialogOpts).then((returnValue) => {
        if (returnValue.response === 0) autoUpdater.quitAndInstall();
    });
});

function createWindow() {
    let mainWindow = new BrowserWindow({
        width: 800,
        height: 600,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false  // Consider security implications depending on your app's needs
        }
    });
    
    mainWindow.loadFile('src/index.html');
    
    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

app.whenReady().then(createWindow);

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
