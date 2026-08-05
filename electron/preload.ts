import { contextBridge, ipcRenderer, webUtils } from "electron";
import type { AiStatus, ExportProgress, ExportResult, JobSpec, LicenseStatus, MediaInfo, FfmpegStatus, StoreShape, Pack, PreviewStage } from "../shared/types";

const api = {
  appInfo: (): Promise<{ version: string; platform: string; isDev: boolean; userData: string }> =>
    ipcRenderer.invoke("app:info"),
  getPathForFile: (file: File): string => webUtils.getPathForFile(file),
  minimize: (): Promise<void> => ipcRenderer.invoke("app:minimize"),
  maximize: (): Promise<boolean> => ipcRenderer.invoke("app:maximize"),
  close: (): Promise<void> => ipcRenderer.invoke("app:close"),

  openVideo: (): Promise<string | null> => ipcRenderer.invoke("dialog:open-video"),
  saveOutput: (defaultName: string): Promise<string | null> => ipcRenderer.invoke("dialog:save-output", defaultName),
  pickOutputFolder: (): Promise<string | null> => ipcRenderer.invoke("dialog:pick-folder"),
  revealInFolder: (filePath: string): Promise<void> => ipcRenderer.invoke("shell:reveal", filePath),
  openExternal: (url: string): Promise<void> => ipcRenderer.invoke("shell:open", url),
  openUploadPage: (platform: string, filePath: string): Promise<void> =>
    ipcRenderer.invoke("upload:open-page", platform, filePath),

  storeGetAll: (): Promise<StoreShape> => ipcRenderer.invoke("store:get-all"),
  storeSet: <K extends keyof StoreShape>(key: K, value: StoreShape[K]): Promise<void> =>
    ipcRenderer.invoke("store:set", key, value),
  storeReset: (): Promise<void> => ipcRenderer.invoke("store:reset"),

  ffmpegStatus: (): Promise<FfmpegStatus> => ipcRenderer.invoke("ffmpeg:status"),
  aiStatus: (): Promise<AiStatus> => ipcRenderer.invoke("ai:status"),
  probe: (filePath: string): Promise<MediaInfo> => ipcRenderer.invoke("ffmpeg:probe", filePath),
  hevcEncoder: (): Promise<{ encoder: string; label: string }> => ipcRenderer.invoke("ffmpeg:hevc-encoder"),
  exportVideo: (job: JobSpec): Promise<{ ok: boolean; error?: string; result?: ExportResult }> =>
    ipcRenderer.invoke("ffmpeg:export", job),
  cancelExport: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("ffmpeg:cancel"),
  previewClip: (
    payload: { job: JobSpec; stage: PreviewStage; maxHeight?: number; durationSec?: number },
  ): Promise<{ ok: boolean; path?: string; error?: string }> => ipcRenderer.invoke("ffmpeg:preview", payload),
  previewFile: (
    payload: { path: string; maxHeight?: number; durationSec?: number },
  ): Promise<{ ok: boolean; path?: string; error?: string }> => ipcRenderer.invoke("ffmpeg:preview-file", payload),

  licenseGet: (): Promise<LicenseStatus> => ipcRenderer.invoke("license:get"),
  licenseActivate: (key: string, email: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("license:activate", key, email),
  licenseDeactivate: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("license:deactivate"),
  licenseDevice: (): Promise<string> => ipcRenderer.invoke("license:device"),

  updateCheck: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("update:check"),
  updateInstall: (): Promise<{ ok: boolean }> => ipcRenderer.invoke("update:install"),

  packsList: (): Promise<Array<Pack & { installed: boolean }>> => ipcRenderer.invoke("packs:list"),
  packsInstall: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke("packs:install", id),
  packsOpenFolder: (): Promise<void> => ipcRenderer.invoke("packs:open-folder"),

  onExportStart: (cb: (p: unknown) => void) => {
    const listener = (_e: unknown, p: unknown) => cb(p);
    ipcRenderer.on("export:start", listener);
    return () => ipcRenderer.removeListener("export:start", listener);
  },
  onExportProgress: (cb: (p: ExportProgress) => void) => {
    const listener = (_e: unknown, p: ExportProgress) => cb(p);
    ipcRenderer.on("export:progress", listener);
    return () => ipcRenderer.removeListener("export:progress", listener);
  },
  onExportDone: (cb: (r: ExportResult) => void) => {
    const listener = (_e: unknown, r: ExportResult) => cb(r);
    ipcRenderer.on("export:done", listener);
    return () => ipcRenderer.removeListener("export:done", listener);
  },
  onExportError: (cb: (e: string) => void) => {
    const listener = (_e: unknown, e: string) => cb(e);
    ipcRenderer.on("export:error", listener);
    return () => ipcRenderer.removeListener("export:error", listener);
  },

  onUpdateStatus: (cb: (s: string) => void) => {
    const listener = (_e: unknown, s: string) => cb(s);
    ipcRenderer.on("update:status", listener);
    return () => ipcRenderer.removeListener("update:status", listener);
  },
  onUpdateAvailable: (cb: (p: { version: string }) => void) => {
    const listener = (_e: unknown, p: { version: string }) => cb(p);
    ipcRenderer.on("update:available", listener);
    return () => ipcRenderer.removeListener("update:available", listener);
  },
  onUpdateProgress: (cb: (p: { percent: number; transferred: number; total: number }) => void) => {
    const listener = (_e: unknown, p: { percent: number; transferred: number; total: number }) => cb(p);
    ipcRenderer.on("update:progress", listener);
    return () => ipcRenderer.removeListener("update:progress", listener);
  },
  onUpdateDownloaded: (cb: (p: { version: string }) => void) => {
    const listener = (_e: unknown, p: { version: string }) => cb(p);
    ipcRenderer.on("update:downloaded", listener);
    return () => ipcRenderer.removeListener("update:downloaded", listener);
  },
};

export type AppApi = typeof api;

contextBridge.exposeInMainWorld("api", api);
