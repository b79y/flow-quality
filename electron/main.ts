import { app, BrowserWindow, dialog, ipcMain, shell, protocol, net } from "electron";
import path from "node:path";
import fs from "node:fs";
import { createHash } from "node:crypto";
import { pathToFileURL } from "node:url";
import type { JobSpec, Pack, PreviewStage } from "../shared/types";
import { probeFile, runExport, renderPreview, renderFilePreview, resolveBinaries, getFfmpegStatus, getAiStatus, resolveHevcEncoder, encoderLabel, resolveGpuEncoder } from "./ffmpeg/index";
import { pipelineSummary, estimateOutputMB } from "./ffmpeg/pipeline";
import { store } from "./store";
import { activateLicense, deactivateLicense, deviceFingerprint, getLicense } from "./license";
import { initUpdater, checkForUpdates, quitAndInstall } from "./updater";

let mainWindow: BrowserWindow | null = null;
let currentRunner: { cancel: () => void } | null = null;
let currentJob: JobSpec | null = null;

const isDev = !!process.env.VITE_DEV_SERVER_URL;

protocol.registerSchemesAsPrivileged([
  { scheme: "media", privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1380,
    height: 860,
    minWidth: 1120,
    minHeight: 700,
    show: false,
    backgroundColor: "#0a0b11",
    title: "FLOW Quality",
    frame: false,
    titleBarStyle: "hidden",
    webPreferences: {
      preload: path.join(__dirname, "..", "..", "dist-electron", "electron", "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      spellcheck: false,
    },
  });

  mainWindow.on("ready-to-show", () => mainWindow?.show());

  if (isDev) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL as string);
    mainWindow.webContents.openDevTools({ mode: "detach" });
  } else {
    mainWindow.loadFile(path.join(__dirname, "..", "..", "dist", "index.html"));
  }

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function sendToRenderer(channel: string, payload?: unknown): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(channel, payload);
  }
}

function registerIpc(): void {
  ipcMain.handle("app:info", () => ({
    version: app.getVersion(),
    platform: process.platform,
    isDev,
    userData: app.getPath("userData"),
  }));

  ipcMain.handle("app:minimize", () => mainWindow?.minimize());
  ipcMain.handle("app:maximize", () => {
    if (!mainWindow) return false;
    if (mainWindow.isMaximized()) mainWindow.unmaximize();
    else mainWindow.maximize();
    return mainWindow.isMaximized();
  });
  ipcMain.handle("app:close", () => mainWindow?.close());

  ipcMain.handle("dialog:open-video", async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      title: "Select a video",
      properties: ["openFile"],
      filters: [
        { name: "Video", extensions: ["mp4", "mov", "mkv", "webm", "avi", "m4v", "mts", "m2ts"] },
        { name: "All files", extensions: ["*"] },
      ],
    });
    return res.canceled ? null : res.filePaths[0];
  });

  ipcMain.handle("dialog:save-output", async (_e, defaultName: string) => {
    const res = await dialog.showSaveDialog(mainWindow!, {
      title: "Export video",
      defaultPath: path.join(store.get("outputDir") || app.getPath("videos"), defaultName),
      filters: [{ name: "MP4", extensions: ["mp4"] }],
    });
    return res.canceled ? null : res.filePath;
  });

  ipcMain.handle("dialog:pick-folder", async () => {
    const res = await dialog.showOpenDialog(mainWindow!, {
      properties: ["openDirectory", "createDirectory"],
      defaultPath: store.get("outputDir") || app.getPath("videos"),
    });
    return res.canceled || res.filePaths.length === 0 ? null : res.filePaths[0];
  });

  ipcMain.handle("shell:reveal", (_e, filePath: string) => {
    if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
  });

  ipcMain.handle("shell:open", (_e, url: string) => {
    shell.openExternal(url);
  });

  ipcMain.handle("upload:open-page", (_e, platform: string, filePath: string) => {
    const urls: Record<string, string> = {
      tiktok: "https://www.tiktok.com/upload",
      shorts: "https://studio.youtube.com/channel/upload",
      reels: "https://www.facebook.com/reels/create/",
    };
    shell.openExternal(urls[platform] || urls.tiktok);
    if (filePath && fs.existsSync(filePath)) shell.showItemInFolder(filePath);
  });

  // ---------------- store ----------------
  ipcMain.handle("store:get-all", () => store.getAll());
  ipcMain.handle("store:set", (_e, key: string, value: unknown) => {
    (store as unknown as { set: (k: string, v: unknown) => void }).set(key as never, value as never);
  });
  ipcMain.handle("store:reset", () => {
    store.reset();
  });

  // ---------------- ffmpeg ----------------
  ipcMain.handle("ffmpeg:status", () => getFfmpegStatus());
  ipcMain.handle("ai:status", () => getAiStatus());
  ipcMain.handle("ffmpeg:probe", (_e, filePath: string) => probeFile(filePath));
  ipcMain.handle("ffmpeg:hevc-encoder", async () => {
    const encoder = await resolveHevcEncoder();
    return { encoder, label: encoderLabel(encoder) };
  });

  ipcMain.handle("ffmpeg:export", async (_e, job: JobSpec) => {
    if (!job || !job.inputPath) return { ok: false, error: "no input" };
    if (currentRunner) {
      return { ok: false, error: "busy" };
    }
    job.outputPath = safeOutputPath(job.outputPath);
    try {
      const source = await probeFile(job.inputPath);
      if (job.quick?.encoder === "auto") {
        job.quick.encoder = await resolveHevcEncoder();
      } else if (!job.quick) {
        job.gpuEncoder = (await resolveGpuEncoder()) ?? undefined;
      }
      currentJob = job;
      sendToRenderer("export:start", { summary: pipelineSummary(job), estimatedMB: estimateOutputMB(job, source.durationSec), source });
      const runner = runExport(
        job,
        source,
        (p) => sendToRenderer("export:progress", p),
        (err) => sendToRenderer("export:error", err),
      );
      currentRunner = runner;
      const result = await runner.done;
      const recent = store.get("recentExports");
      store.set("recentExports", [result, ...recent].slice(0, 10));
      sendToRenderer("export:done", result);
      currentRunner = null;
      currentJob = null;
      return { ok: true, result };
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      sendToRenderer("export:error", `${job.outputPath}\n${message}`);
      currentRunner = null;
      currentJob = null;
      return { ok: false, error: message };
    }
  });

  ipcMain.handle("ffmpeg:cancel", () => {
    currentRunner?.cancel();
    currentRunner = null;
    return { ok: true };
  });

  // Render a short stage-preview clip (Original / 60 FPS / Blur / Enhance / Final).
  ipcMain.handle("ffmpeg:preview", async (_e, payload: { job: JobSpec; stage: PreviewStage; maxHeight?: number; durationSec?: number }) => {
    try {
      const { job, stage, maxHeight = 480, durationSec = 3 } = payload || {};
      if (!job?.inputPath) return { ok: false, error: "no input" };
      const source = await probeFile(job.inputPath);
      if (!source || !source.durationSec) return { ok: false, error: "cannot probe source" };
      const start = Math.max(0, Math.min(source.durationSec - durationSec, source.durationSec * 0.35));
      const cacheKey = createHash("sha1").update(JSON.stringify({ input: job.inputPath, stage, job })).digest("hex").slice(0, 16);
      const dir = path.join(app.getPath("temp"), "flowquality-preview");
      fs.mkdirSync(dir, { recursive: true });
      const out = path.join(dir, `${stage}-${cacheKey}.mp4`);
      if (fs.existsSync(out)) return { ok: true, path: out };
      const finalPath = await renderPreview(job, source.fps, stage, { outputPath: out, startSec: start, durationSec, maxHeight, targetFps: 30 });
      return { ok: true, path: finalPath };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // Render a short, low-res preview clip straight from a finished file (cheap transcode only).
  ipcMain.handle("ffmpeg:preview-file", async (_e, payload: { path: string; maxHeight?: number; durationSec?: number }) => {
    try {
      const { path: src, maxHeight = 480, durationSec = 3 } = payload || {};
      if (!src) return { ok: false, error: "no input" };
      const source = await probeFile(src);
      if (!source || !source.durationSec) return { ok: false, error: "cannot probe source" };
      const start = Math.max(0, Math.min(source.durationSec - durationSec, source.durationSec * 0.35));
      const cacheKey = createHash("sha1").update(JSON.stringify({ input: src, maxHeight, durationSec })).digest("hex").slice(0, 16);
      const dir = path.join(app.getPath("temp"), "flowquality-preview");
      fs.mkdirSync(dir, { recursive: true });
      const out = path.join(dir, `file-${cacheKey}.mp4`);
      if (fs.existsSync(out)) return { ok: true, path: out };
      const finalPath = await renderFilePreview(src, { outputPath: out, startSec: start, durationSec, maxHeight, targetFps: 30 });
      return { ok: true, path: finalPath };
    } catch (err) {
      return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
  });

  // ---------------- license ----------------
  ipcMain.handle("license:get", () => getLicense());
  ipcMain.handle("license:activate", (_e, key: string, email: string) => activateLicense(key, email));
  ipcMain.handle("license:deactivate", () => {
    deactivateLicense();
    return { ok: true };
  });
  ipcMain.handle("license:device", () => deviceFingerprint());

  // ---------------- update ----------------
  ipcMain.handle("update:check", () => {
    checkForUpdates();
    return { ok: true };
  });
  ipcMain.handle("update:install", () => {
    quitAndInstall();
    return { ok: true };
  });

  // ---------------- packs (in-app downloads) ----------------
  ipcMain.handle("packs:list", () => listPacks());
  ipcMain.handle("packs:install", (_e, id: string) => installPack(id));
  ipcMain.handle("packs:open-folder", () => {
    const dir = path.join(app.getPath("userData"), "packs");
    fs.mkdirSync(dir, { recursive: true });
    shell.openPath(dir);
  });
}

function packsRoot(): string {
  const base = app.isPackaged ? process.resourcesPath : path.join(app.getAppPath(), "resources");
  return path.join(base, "content", "packs");
}

/** Strip characters Windows/ffmpeg cannot open, and fall back to Videos if unusable. */
function safeOutputPath(outputPath: string): string {
  const INVALID = /[<>:"/\\|?*\u0000-\u001f]/g;
  const cleanBase = (name: string): string => {
    const cleaned = path
      .basename(name || "export.mp4")
      .replace(INVALID, "_")
      .replace(/[. ]+$/g, "")
      .trim();
    return cleaned || "export.mp4";
  };
  try {
    const parent = path.dirname(outputPath);
    fs.mkdirSync(parent, { recursive: true });
    if (fs.existsSync(parent)) {
      let name = cleanBase(path.basename(outputPath));
      if (!/\.mp4$/i.test(name)) name += ".mp4";
      return path.join(parent, name);
    }
  } catch {
    /* fall through to Videos */
  }
  const fallback = path.join(app.getPath("videos"));
  try {
    fs.mkdirSync(fallback, { recursive: true });
  } catch {
    /* ignore */
  }
  let name = cleanBase(path.basename(outputPath));
  if (!/\.mp4$/i.test(name)) name += ".mp4";
  return path.join(fallback, name);
}

function listPacks() {
  try {
    const root = packsRoot();
    const jsonPath = path.join(root, "packs.json");
    if (!fs.existsSync(jsonPath)) return [];
    const packs = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Pack[];
    const installed = store.get("installedPacks");
    return packs.map((p) => ({ ...p, installed: installed.includes(p.id) }));
  } catch {
    return [];
  }
}

function installPack(id: string): { ok: boolean; error?: string } {
  try {
    const root = packsRoot();
    const jsonPath = path.join(root, "packs.json");
    const packs = JSON.parse(fs.readFileSync(jsonPath, "utf8")) as Pack[];
    const pack = packs.find((p) => p.id === id);
    if (!pack) return { ok: false, error: "not-found" };
    const srcRoot = path.join(root, id);
    const destRoot = path.join(app.getPath("userData"), "packs", id);
    fs.rmSync(destRoot, { recursive: true, force: true });
    fs.mkdirSync(destRoot, { recursive: true });
    for (const f of pack.files) {
      const src = path.join(srcRoot, f.path);
      const dest = path.join(destRoot, f.path);
      if (!fs.existsSync(src)) continue;
      fs.mkdirSync(path.dirname(dest), { recursive: true });
      fs.copyFileSync(src, dest);
    }
    const installed = store.get("installedPacks");
    if (!installed.includes(id)) store.set("installedPacks", [...installed, id]);
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

app.whenReady().then(async () => {
  protocol.handle("media", (request) => {
    const u = new URL(request.url);
    const filePath = u.searchParams.get("path");
    if (!filePath) return new Response("missing path", { status: 400 });
    return net.fetch(pathToFileURL(filePath).toString());
  });

  await resolveBinaries().catch(() => undefined);
  registerIpc();
  createWindow();
  initUpdater();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

app.on("before-quit", () => {
  currentRunner?.cancel();
});
