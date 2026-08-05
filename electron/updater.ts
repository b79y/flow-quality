import { app, BrowserWindow } from "electron";
import { autoUpdater } from "electron-updater";
import { store } from "./store";

autoUpdater.autoDownload = true;
autoUpdater.autoInstallOnAppQuit = true;

function send(event: string, payload?: unknown) {
  const win = BrowserWindow.getAllWindows()[0];
  if (win && !win.isDestroyed()) {
    win.webContents.send(event, payload);
  }
}

export function initUpdater(): void {
  if (!app.isPackaged) return;

  autoUpdater.on("checking-for-update", () => send("update:status", "checking"));
  autoUpdater.on("update-available", (info) => {
    store.set("lastVersion", info.version);
    send("update:status", "available");
    send("update:available", { version: info.version });
  });
  autoUpdater.on("update-not-available", () => send("update:status", "up-to-date"));
  autoUpdater.on("download-progress", (p) =>
    send("update:progress", { percent: p.percent, transferred: p.transferred, total: p.total }),
  );
  autoUpdater.on("update-downloaded", (info) => send("update:downloaded", { version: info.version }));
  autoUpdater.on("error", (err) => send("update:status", `error:${err.message}`));

  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch(() => {
      /* no feed configured -> fail silently */
    });
  }, 8000);
}

export function checkForUpdates(): void {
  autoUpdater.checkForUpdates().catch(() => {
    send("update:status", "error:no-feed");
  });
}

export function quitAndInstall(): void {
  autoUpdater.quitAndInstall(false, true);
}
