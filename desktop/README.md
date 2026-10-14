# Pöhner Passwords for Windows

This desktop client opens https://kasiman69.github.io/Password-app/ in an isolated Electron window. Internet access is required. Use your existing email, account password, and vault passphrase. Website updates appear automatically; Electron runtime updates require rebuilding and reinstalling the desktop client.

Install with `installers/Pohner-Passwords-Setup-1.0.0.exe` from the repository root. This is an unsigned x64 installer; Windows may display an unknown publisher warning. Account email confirmation and reset links still open the website in your default browser.

Rebuild from the repository root:

```powershell
npm ci --prefix desktop
npm run build --prefix desktop
```

The renderer has no Node.js access or preload bridge, uses sandboxing and context isolation, and cannot navigate outside the app. External HTTP(S) links open in the default browser. Session storage is in memory. Closing the app requires signing in again.
