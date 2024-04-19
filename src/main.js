const { app, BrowserWindow, dialog, ipcMain } = require('electron');
const autoUpdater = require('electron-updater').autoUpdater;
const log = require('electron-log');
const path = require('path');

// Setting log level
log.transports.file.level = 'info';

app.on('ready', () => {
  createWindow();
  
  log.transports.file.resolvePath = () => path.join(app.getPath('userData'), 'log.log');
  console.log = log.log;
  console.error = log.error;
  console.warn = log.warn;
  console.info = log.info;

  log.info('Application starting...');
  log.info('Logs are being stored in:', log.transports.file.getFile().path);

  autoUpdater.autoDownload = true;
  autoUpdater.logger = log;
  autoUpdater.logger.transports.file.level = 'info';

  autoUpdater.checkForUpdates();

  autoUpdater.on('checking-for-update', () => {
      log.info('Checking for update...');
  });
  autoUpdater.on('update-available', (info) => {
      log.info('Update available.', info);
  });
  autoUpdater.on('update-not-available', (info) => {
      log.info('No update available.', info);
  });
  autoUpdater.on('error', (err) => {
      log.error('Error in auto-updater. ' + err);
  });
  autoUpdater.on('download-progress', (d) => {
      log.info(`Downloaded ${d.percent}%`);
  });
  autoUpdater.on('update-downloaded', (info) => {
      log.info('Update downloaded');
      autoUpdater.quitAndInstall();  
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
