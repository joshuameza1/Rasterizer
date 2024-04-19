// main.js

const { app, BrowserWindow, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const url = require('url');

function createWindow() {
    let mainWindow = new BrowserWindow({width: 800, height: 600});
    mainWindow.loadFile('src/index.html');
  
    mainWindow.on('closed', function () {
      mainWindow = null;
    });
  }
  
  app.on('ready', () => {
    createWindow();
    autoUpdater.checkForUpdatesAndNotify();
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
  
  autoUpdater.on('update-available', () => {
    console.log('A new update is available');
  });
  
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