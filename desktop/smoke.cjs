const { app } = require('electron');
const assert = require('node:assert/strict');
const timeout = setTimeout(() => { console.error('Smoke test timed out'); app.exit(1); }, 45000);
app.on('browser-window-created', (_event, window) => {
  window.hide();
  window.webContents.once('did-finish-load', async () => {
    try {
      const prefs = window.webContents.getLastWebPreferences();
      assert.equal(prefs.nodeIntegration, false);
      assert.equal(prefs.contextIsolation, true);
      assert.equal(prefs.sandbox, true);
      assert.ok(window.webContents.getURL().startsWith('https://kasiman69.github.io/Password-app/'));
      await new Promise(resolve => setTimeout(resolve, 3000));
      const count = await window.webContents.executeJavaScript('document.querySelectorAll("input").length');
      assert.ok(count >= 2, 'Login inputs should render');
      console.log('PASS: live login renders in sandboxed desktop window');
      clearTimeout(timeout); app.exit(0);
    } catch (error) { console.error(error); clearTimeout(timeout); app.exit(1); }
  });
});
require('./main.cjs');
