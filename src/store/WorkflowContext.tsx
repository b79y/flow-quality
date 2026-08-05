import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type {
  EnhanceOptions,
  ExportProgress,
  ExportResult,
  ExportStartPayload,
  FpsOptions,
  JobSpec,
  MediaInfo,
  MotionBlurOptions,
  OutputProfile,
  Pack,
  Platform,
  QuickQualityOptions,
  StoreShape,
  UpdateProgress,
  FpsMode,
  Language,
  Theme,
} from "@shared/types"
import { analyzeSource, buildProfile, DEFAULT_BLUR, DEFAULT_ENHANCE, DEFAULT_FPS } from "../lib/constants"

export function sanitizeFilename(name: string): string {
  return name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/[. ]+$/g, "")
    .trim()
}

export type ExportStatus = "idle" | "running" | "done" | "error" | "busy"

export interface Toast {
  id: number
  message: string
  kind: "info" | "success" | "error"
}

export interface UpdateState {
  status: string
  progress: UpdateProgress | null
  downloadedVersion: string | null
  availableVersion: string | null
}

interface WorkflowContextValue {
  store: StoreShape | null
  media: MediaInfo | null
  probing: boolean
  probeError: string | null
  platform: Platform
  setPlatform: (p: Platform) => void
  level: FpsMode
  setLevel: (m: FpsMode) => void
  fps: FpsOptions
  setFps: (f: FpsOptions) => void
  blur: MotionBlurOptions
  setBlur: (b: MotionBlurOptions) => void
  enhance: EnhanceOptions
  setEnhance: (e: EnhanceOptions) => void
  resetOptions: () => void
  profile: OutputProfile
  setMedia: (m: MediaInfo | null) => void
  probeFile: (path: string) => Promise<void>
  setTheme: (t: Theme) => void
  setLanguage: (l: Language) => void
  exportState: ExportStatus
  exportProgress: ExportProgress | null
  exportStart: ExportStartPayload | null
  exportResult: ExportResult | null
  exportError: string
  estimatedMB: number
  startExport: () => Promise<void>
  startQuickExport: (opts?: Partial<QuickQualityOptions>) => Promise<void>
  cancelExport: () => Promise<void>
  packs: Array<Pack & { installed: boolean }>
  refreshPacks: () => Promise<void>
  installPack: (id: string) => Promise<void>
  openPacksFolder: () => void
  userData: string | null
  lutFiles: Array<{ name: string; path: string }>
  toasts: Toast[]
  toast: (message: string, kind?: Toast["kind"]) => void
  dismissToast: (id: number) => void
  update: UpdateState
  checkUpdates: () => void
  installUpdate: () => void
  analysis: ReturnType<typeof analyzeSource>
}

const WorkflowContext = createContext<WorkflowContextValue | null>(null)

let toastId = 0

export function WorkflowProvider({ children }: { children: ReactNode }) {
  const [store, setStore] = useState<StoreShape | null>(null)
  const [media, setMediaState] = useState<MediaInfo | null>(null)
  const [probing, setProbing] = useState(false)
  const [probeError, setProbeError] = useState<string | null>(null)

  const [platform, setPlatform] = useState<Platform>("tiktok")
  const [level, setLevel] = useState<FpsMode>("safe")
  const [fps, setFps] = useState<FpsOptions>({ ...DEFAULT_FPS })
  const [blur, setBlur] = useState<MotionBlurOptions>({ ...DEFAULT_BLUR })
  const [enhance, setEnhance] = useState<EnhanceOptions>({ ...DEFAULT_ENHANCE })

  const [exportState, setExportState] = useState<ExportStatus>("idle")
  const [exportProgress, setExportProgress] = useState<ExportProgress | null>(null)
  const [exportStart, setExportStart] = useState<ExportStartPayload | null>(null)
  const [exportResult, setExportResult] = useState<ExportResult | null>(null)
  const [exportError, setExportError] = useState("")

  const [packs, setPacks] = useState<Array<Pack & { installed: boolean }>>([])
  const [userData, setUserData] = useState<string | null>(null)
  const [toasts, setToasts] = useState<Toast[]>([])
  const [update, setUpdate] = useState<UpdateState>({ status: "idle", progress: null, downloadedVersion: null, availableVersion: null })

  const runningRef = useRef(false)

  // ---------------- store bootstrap ----------------
  useEffect(() => {
    if (!window.api) return
    window.api.storeGetAll().then((s) => {
      setStore(s)
      setPlatform(s.defaultPlatform || "tiktok")
      setLevel(s.defaultMode || "safe")
    })
  }, [])

  useEffect(() => {
    if (store) {
      document.documentElement.setAttribute("data-theme", store.theme)
      if (store.outputDir) window.api?.storeSet("outputDir", store.outputDir)
    }
  }, [store])

  const setTheme = useCallback((t: Theme) => {
    setStore((prev) => (prev ? { ...prev, theme: t } : prev))
    document.documentElement.setAttribute("data-theme", t)
    window.api?.storeSet("theme", t)
  }, [])

  const setLanguage = useCallback((l: Language) => {
    setStore((prev) => (prev ? { ...prev, language: l } : prev))
    window.api?.storeSet("language", l)
  }, [])

  // ---------------- media ----------------
  const setMedia = useCallback((m: MediaInfo | null) => {
    setMediaState(m)
    setExportState("idle")
    setExportResult(null)
    setExportProgress(null)
    setExportStart(null)
  }, [])

  const probeFile = useCallback(async (path: string) => {
    if (!window.api) return
    setProbing(true)
    setProbeError(null)
    try {
      const info = await window.api.probe(path)
      setMediaState(info)
      setExportState("idle")
    } catch (e) {
      setProbeError(e instanceof Error ? e.message : String(e))
      setMediaState(null)
    } finally {
      setProbing(false)
    }
  }, [])

  const profile = useMemo(() => buildProfile(platform, media), [platform, media])
  const estimatedMB = useMemo(() => {
    if (!media) return 0
    const job: JobSpec = buildJob(media.path, "/tmp/out.mp4", platform, profile, fps, blur, enhance)
    return estimateMb(job, media.durationSec)
  }, [media, platform, profile, fps, blur, enhance])

  const resetOptions = useCallback(() => {
    setFps({ ...DEFAULT_FPS, mode: level })
    setBlur({ ...DEFAULT_BLUR })
    setEnhance({ ...DEFAULT_ENHANCE })
    toast("Settings reset", "info")
  }, [level])

  // ---------------- export ----------------
  const startExport = useCallback(async () => {
    if (!window.api || !media) return
    if (runningRef.current) {
      setExportState("busy")
      return
    }
    const base = sanitizeFilename(media.name.replace(/\.[^.]+$/, ""))
    const defaultName = (base || "video") + "-flow-quality.mp4"
    const outputPath = await window.api.saveOutput(defaultName)
    if (!outputPath) return
    const job = buildJob(media.path, outputPath, platform, profile, fps, blur, enhance)
    runningRef.current = true
    setExportState("running")
    setExportError("")
    setExportResult(null)
    const res = await window.api.exportVideo(job)
    runningRef.current = false
    if (!res.ok) {
      if (res.error === "busy") setExportState("busy")
      else {
        setExportState("error")
        setExportError(res.error || "Export failed")
      }
    }
  }, [media, platform, profile, fps, blur, enhance])

  const cancelExport = useCallback(async () => {
    if (!window.api) return
    runningRef.current = false
    await window.api.cancelExport()
  }, [])

  const startQuickExport = useCallback(async (opts: Partial<QuickQualityOptions> = {}) => {
    if (!window.api || !media) return
    if (runningRef.current) {
      setExportState("busy")
      return
    }
    const base = sanitizeFilename(media.name.replace(/\.[^.]+$/, ""))
    const defaultName = (base || "video") + "-quality.mp4"
    const outputPath = await window.api.saveOutput(defaultName)
    if (!outputPath) return
    const job = buildQuickJob(media.path, outputPath, platform, profile, opts)
    runningRef.current = true
    setExportState("running")
    setExportError("")
    setExportResult(null)
    const res = await window.api.exportVideo(job)
    runningRef.current = false
    if (!res.ok) {
      if (res.error === "busy") setExportState("busy")
      else {
        setExportState("error")
        setExportError(res.error || "Export failed")
      }
    }
  }, [media, platform, profile])

  // ---------------- export events ----------------
  useEffect(() => {
    if (!window.api) return
    const offStart = window.api.onExportStart((p) => {
      const payload = p as ExportStartPayload
      setExportStart(payload)
      setExportProgress(null)
      setExportState("running")
    })
    const offProgress = window.api.onExportProgress((p) => {
      setExportProgress(p)
      if (p.percent >= 100) setExportState("done")
    })
    const offDone = window.api.onExportDone((r) => {
      setExportResult(r)
      setExportState("done")
      setExportProgress((prev) => (prev ? { ...prev, percent: 100, active: false } : prev))
      setStore((s) => (s ? { ...s, recentExports: [r, ...(s.recentExports || [])].slice(0, 10) } : s))
    })
    const offError = window.api.onExportError((e) => {
      setExportState("error")
      setExportError(e)
      runningRef.current = false
    })
    return () => {
      offStart()
      offProgress()
      offDone()
      offError()
    }
  }, [])

  // ---------------- packs ----------------
  const refreshPacks = useCallback(async () => {
    if (!window.api) return
    const list = await window.api.packsList()
    setPacks(list)
  }, [])

  useEffect(() => {
    refreshPacks()
    window.api?.appInfo().then((i) => setUserData(i.userData))
  }, [refreshPacks])

  const installPack = useCallback(
    async (id: string) => {
      if (!window.api) return
      const res = await window.api.packsInstall(id)
      if (res.ok) {
        toast("Pack installed", "success")
        await refreshPacks()
      } else {
        toast(res.error || "Install failed", "error")
      }
    },
    [refreshPacks],
  )

  const openPacksFolder = useCallback(() => {
    window.api?.packsOpenFolder()
  }, [])

  const lutFiles = useMemo(() => {
    if (!userData) return []
    const out: Array<{ name: string; path: string }> = []
    for (const pack of packs) {
      if (!pack.installed || pack.category !== "lut") continue
      for (const f of pack.files) {
        if (f.path.toLowerCase().endsWith(".cube")) {
          out.push({
            name: f.name.replace(/\.cube$/i, ""),
            path: `${userData}\\packs\\${pack.id}\\${f.path.replace(/\//g, "\\")}`,
          })
        }
      }
    }
    return out
  }, [packs, userData])

  // ---------------- toasts ----------------
  const toast = useCallback((message: string, kind: Toast["kind"] = "info") => {
    const id = ++toastId
    setToasts((t) => [...t, { id, message, kind }])
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 3200)
  }, [])

  const dismissToast = useCallback((id: number) => {
    setToasts((t) => t.filter((x) => x.id !== id))
  }, [])

  // ---------------- updates ----------------
  useEffect(() => {
    if (!window.api) return
    const offStatus = window.api.onUpdateStatus((s) => setUpdate((u) => ({ ...u, status: s })))
    const offAvailable = window.api.onUpdateAvailable((p) => setUpdate((u) => ({ ...u, availableVersion: p.version, status: "available" })))
    const offProgress = window.api.onUpdateProgress((p) => setUpdate((u) => ({ ...u, status: "downloading", progress: p })))
    const offDownloaded = window.api.onUpdateDownloaded((p) => setUpdate((u) => ({ ...u, status: "ready", downloadedVersion: p.version })))
    return () => {
      offStatus()
      offAvailable()
      offProgress()
      offDownloaded()
    }
  }, [])

  const checkUpdates = useCallback(() => {
    window.api?.updateCheck()
  }, [])
  const installUpdate = useCallback(() => {
    window.api?.updateInstall()
  }, [])

  const analysis = useMemo(() => analyzeSource(media?.fps || 0), [media])

  const value: WorkflowContextValue = {
    store,
    media,
    probing,
    probeError,
    platform,
    setPlatform,
    level,
    setLevel,
    fps,
    setFps,
    blur,
    setBlur,
    enhance,
    setEnhance,
    resetOptions,
    profile,
    setMedia,
    probeFile,
    setTheme,
    setLanguage,
    exportState,
    exportProgress,
    exportStart,
    exportResult,
    exportError,
    estimatedMB,
    startExport,
    startQuickExport,
    cancelExport,
    packs,
    refreshPacks,
    installPack,
    openPacksFolder,
    userData,
    lutFiles,
    toasts,
    toast,
    dismissToast,
    update,
    checkUpdates,
    installUpdate,
    analysis,
  }

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}

export function useWorkflow(): WorkflowContextValue {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error("useWorkflow must be used inside WorkflowProvider")
  return ctx
}

// ------------------------------------------------------------------ job builder
export function buildJob(
  inputPath: string,
  outputPath: string,
  platform: Platform,
  profile: OutputProfile,
  fps: FpsOptions,
  blur: MotionBlurOptions,
  enhance: EnhanceOptions,
): JobSpec {
  return {
    inputPath,
    outputPath,
    profile: { ...profile, platform },
    fps: { ...fps, targetFps: profile.fps },
    motionBlur: blur.enabled ? { ...blur } : undefined,
    enhance: enhanceEnabled(enhance) ? { ...enhance } : undefined,
  }
}

export function buildQuickJob(
  inputPath: string,
  outputPath: string,
  platform: Platform,
  profile: OutputProfile,
  opts: Partial<QuickQualityOptions> = {},
): JobSpec {
  return {
    inputPath,
    outputPath,
    profile: { ...profile, codec: "hevc", platform },
    quick: {
      bitrateMbps: opts.bitrateMbps ?? 10,
      sharpenAmount: opts.sharpenAmount ?? 0.4,
      fps60: opts.fps60 ?? true,
      encoder: opts.encoder ?? "auto",
    },
  }
}

function enhanceEnabled(e: EnhanceOptions): boolean {
  return (
    e.ai ||
    e.denoise > 0 ||
    e.deblock > 0 ||
    e.sharpen > 0 ||
    e.contrast !== 0 ||
    e.saturation !== 0 ||
    e.vibrance > 0 ||
    e.nightNoise ||
    e.textClarity ||
    e.repairCompression ||
    !!e.lut
  )
}

function estimateMb(job: JobSpec, durationSec: number): number {
  const px = job.profile.width * job.profile.height
  const base = (px * job.profile.fps * 0.00008) / Math.pow(2, (job.profile.crf - 18) / 6)
  const motionFactor = job.fps?.enabled && job.fps.mode !== "turbo" ? 1.15 : 1
  const blurFactor = job.motionBlur?.enabled ? 1.08 : 1
  const kbps = Math.max(400, base * motionFactor * blurFactor)
  return Math.min(Math.max(1, (kbps * durationSec) / 8000), job.profile.maxSizeMB * 3)
}
