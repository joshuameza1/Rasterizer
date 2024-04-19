// main.js

const { app, BrowserWindow, autoUpdater, ipcMain } = require('electron');
const log = require('electron-log');
const path = require('path');
const url = require('url');

log.transports.file.level = 'info';
console.log = log.log;
log.transports.file.file = '/Users/joshuameza/Library/Logs/Rasterizer/rasterizer.log';


autoUpdater.logger = log;


autoUpdater.on('update-downloaded', (event, releaseNotes, releaseName) => {
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
    let mainWindow = new BrowserWindow({width: 800, height: 600});
    mainWindow.loadFile('src/index.html');
  
    mainWindow.on('closed', function () {
      mainWindow = null;
    });
  }
  
  app.on('ready', () => {
    if (process.env.NODE_ENV === 'production') {
      autoUpdater.checkForUpdates();
    }
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