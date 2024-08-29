// This is free and unencumbered software released into the public domain.
// See LICENSE for details

const {app, BrowserWindow, Menu} = require('electron');
const log = require('electron-log');
const {autoUpdater} = require("electron-updater");
const { NsisUpdater, MacUpdater, AppImageUpdater } = require("electron-updater")
const os = require('os');
const semver = require('semver');
//-------------------------------------------------------------------
// Logging
//
// THIS SECTION IS NOT REQUIRED
//
// This logging setup is not required for auto-updates to work,
// but it sure makes debugging easier :)
//-------------------------------------------------------------------
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';
log.info('App starting...');

//-------------------------------------------------------------------
// Define the menu
//
// THIS SECTION IS NOT REQUIRED
//-------------------------------------------------------------------
let template = []
if (process.platform === 'darwin') {
  // OS X
  const name = app.getName();
  template.unshift({
    label: name,
    submenu: [
      {
        label: 'About ' + name,
        role: 'about'
      },
      {
        label: 'Quit',
        accelerator: 'Command+Q',
        click() { app.quit(); }
      },
    ]
  })
}


//-------------------------------------------------------------------
// Open a window that displays the version
//
// THIS SECTION IS NOT REQUIRED
//
// This isn't required for auto-updates to work, but it's easier
// for the app to show a window than to have to click "About" to see
// that updates are working.
//-------------------------------------------------------------------
let win;

function sendStatusToWindow(text) {
  log.info(text);
  win.webContents.send('message', text);
}
function createDefaultWindow() {
  win = new BrowserWindow({
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  });
  win.webContents.openDevTools();
  win.on('closed', () => {
    win = null;
  });
  win.loadURL(`file://${__dirname}/version.html#v${app.getVersion()}`);
  return win;
}





class AppUpdater {
  constructor(win) {
    this.win = win;
    this.options = {
      requestHeaders: {
        "raka": true
      },
      provider: 'generic',
      url: 'http://api.localhost.io:5000/v1/agents/update'
    };

    this.autoUpdater = this.createAutoUpdater();
    if (!this.autoUpdater) return;

    this.autoUpdater.addAuthHeader(`Bearer comeone`);
    this.setupEventListeners();
    this.checkForUpdates();
  }

  createAutoUpdater() {
    switch(os.platform()) {
      case 'win32':
        return new NsisUpdater(this.options);
      case 'darwin':
        return new MacUpdater(this.options);
      case 'linux':
        return new AppImageUpdater(this.options);
      default:
        console.error('Unsupported platform for auto-updater');
        return null;
    }
  }

  setupEventListeners() {
    this.autoUpdater.on('checking-for-update', () => {
      this.sendStatusToWindow('Checking for update...');
    });

    this.autoUpdater.on('update-available', (info) => {
      this.sendStatusToWindow('Update available.');
      this.handleUpdateAvailable(info);
    });

    this.autoUpdater.on('update-not-available', (info) => {
      this.sendStatusToWindow('Update not available.');
    });

    this.autoUpdater.on('error', (err) => {
      this.sendStatusToWindow('Error in auto-updater. ' + err);
    });

    this.autoUpdater.on('download-progress', (progressObj) => {
      let log_message = "Download speed: " + progressObj.bytesPerSecond;
      log_message = log_message + ' - Downloaded ' + progressObj.percent + '%';
      log_message = log_message + ' (' + progressObj.transferred + "/" + progressObj.total + ')';
      this.sendStatusToWindow(log_message);
    });

    this.autoUpdater.on('update-downloaded', (info) => {
      this.sendStatusToWindow('Update downloaded');
      this.autoUpdater.quitAndInstall();
    });
  }

  async checkForUpdates() {
    try {
      const result = await this.autoUpdater.checkForUpdates();
      const serverVersion = result.updateInfo.version;
      const currentVersion = this.autoUpdater.currentVersion.version;

      if (semver.compare(serverVersion, currentVersion) !== 0) {
        // Version is different, proceed with update
        await this.autoUpdater.downloadUpdate();
      }
    } catch (error) {
      console.error('Error checking for updates:', error);
    }
  }

  handleUpdateAvailable(info) {
    const serverVersion = info.version;
    const currentVersion = this.autoUpdater.currentVersion.version;

    if (semver.lt(serverVersion, currentVersion)) {
      this.sendStatusToWindow('Downgrade available. Proceeding with downgrade...');
    } else {
      this.sendStatusToWindow('Upgrade available. Proceeding with upgrade...');
    }
  }

  sendStatusToWindow(text) {
    console.log(text);
    if (this.win) {
      this.win.webContents.send('message', text);
    }
  }
}

module.exports = AppUpdater;



app.on('ready', function() {
  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  createDefaultWindow();
});
app.on('window-all-closed', () => {
  app.quit();
});

//
// CHOOSE one of the following options for Auto updates
//

//-------------------------------------------------------------------
// Auto updates - Option 1 - Simplest version
//
// This will immediately download an update, then install when the
// app quits.
//-------------------------------------------------------------------

app.on('ready', function()  {
  console.log('ready')
  new AppUpdater();
  //autoUpdater.checkForUpdatesAndNotify();
});

//-------------------------------------------------------------------
// Auto updates - Option 2 - More control
//
// For details about these events, see the Wiki:
// https://github.com/electron-userland/electron-builder/wiki/Auto-Update#events
//
// The app doesn't need to listen to any events except `update-downloaded`
//
// Uncomment any of the below events to listen for them.  Also,
// look in the previous section to see them being used.
//-------------------------------------------------------------------
// app.on('ready', function()  {
//   autoUpdater.checkForUpdates();
// });
// autoUpdater.on('checking-for-update', () => {
// })
// autoUpdater.on('update-available', (info) => {
// })
// autoUpdater.on('update-not-available', (info) => {
// })
// autoUpdater.on('error', (err) => {
// })
// autoUpdater.on('download-progress', (progressObj) => {
// })
// autoUpdater.on('update-downloaded', (info) => {
//   autoUpdater.quitAndInstall();  
// })
