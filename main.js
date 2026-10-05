const { app, BrowserWindow, shell, Menu } = require('electron');
const path = require('path');
if (!app.requestSingleInstanceLock()) { app.quit(); }
let win;
function create() {
  Menu.setApplicationMenu(null);
  win = new BrowserWindow({ icon: path.join(__dirname, 'icon.png'),
    width: 1400, height: 850, minWidth: 1000, minHeight: 600,
    title: 'Booking Admin', autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  win.maximize();
  win.loadFile(path.join(__dirname, 'app', 'admin.html'));
  // WhatsApp / Google Sheet links open in the normal browser
  win.webContents.setWindowOpenHandler(({ url }) => { shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); } });
}
app.on('second-instance', () => { if (win) { if (win.isMinimized()) win.restore(); win.focus(); } });
app.whenReady().then(create);
app.on('window-all-closed', () => app.quit());
