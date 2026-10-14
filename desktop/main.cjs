const { app, BrowserWindow, Menu, session, shell } = require('electron');
const path = require('node:path');
const HOME = 'https://kasiman69.github.io/Password-app/';
function allowed(value) {
  try { const u = new URL(value); return u.origin === 'https://kasiman69.github.io' && u.pathname.startsWith('/Password-app/'); } catch { return false; }
}
function external(value) {
  try { const u = new URL(value); if (u.protocol === 'https:' || u.protocol === 'http:') void shell.openExternal(value); } catch {}
}
let window;
function createWindow() {
  window = new BrowserWindow({ width: 1150, height: 820, minWidth: 380, minHeight: 540,
    title: 'Pöhner Passwords', backgroundColor: '#fff1f7', icon: path.join(__dirname, 'icon.png'),
    webPreferences: { nodeIntegration: false, contextIsolation: true, sandbox: true, webSecurity: true, devTools: !app.isPackaged, partition: 'pohner-vault' }
  });
  const contents = window.webContents;
  contents.setWindowOpenHandler(({ url }) => { external(url); return { action: 'deny' }; });
  contents.on('will-navigate', (event, url) => { if (!allowed(url)) { event.preventDefault(); external(url); } });
  contents.on('will-redirect', (event, url) => { if (!allowed(url)) event.preventDefault(); });
  contents.on('will-attach-webview', event => event.preventDefault());
  const load = () => contents.loadURL(HOME).catch(() => { if (!contents.isDestroyed()) void window.loadFile(path.join(__dirname, 'offline.html')); });
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { label: 'App', submenu: [{ label: 'Reload / reconnect', click: load }, { type: 'separator' }, { role: 'quit' }] },
    { label: 'Edit', submenu: [{ role: 'undo' }, { role: 'redo' }, { type: 'separator' }, { role: 'cut' }, { role: 'copy' }, { role: 'paste' }, { role: 'selectAll' }] },
    { label: 'View', submenu: [{ role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { role: 'togglefullscreen' }] }
  ]));
  load();
}
if (!app.requestSingleInstanceLock()) app.quit();
else {
  app.on('second-instance', () => { if (window) { if (window.isMinimized()) window.restore(); window.focus(); } });
  app.whenReady().then(() => {
    const vaultSession = session.fromPartition('pohner-vault');
    vaultSession.setPermissionRequestHandler((_contents, _permission, callback) => callback(false));
    vaultSession.setPermissionCheckHandler(() => false);
    createWindow();
  });
  app.on('window-all-closed', () => app.quit());
}
