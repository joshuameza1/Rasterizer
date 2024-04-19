const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
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
log.info('Logs are being stored in:', log.transports.file.getFile().path);


// Setting autoUpdater's logging to use electron-log
autoUpdater.autoDownload = true;
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

autoUpdater.on('checking-for-update', () => {
    console.log('Checking for update...');
});
autoUpdater.on('update-available', (info) => {
    console.log('Update available.', info);
});
autoUpdater.on('update-not-available', (info) => {
    console.log('Update not available.', info);
});
autoUpdater.on('error', (err) => {
    console.log('Error in auto-updater. ' + err);
});
autoUpdater.on('download-progress', (d) => {
    console.log(`Downloaded ${d.percent}%`);
});
autoUpdater.on('update-downloaded', (info) => {
    console.log('Update downloaded');
    autoUpdater.quitAndInstall();  
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
