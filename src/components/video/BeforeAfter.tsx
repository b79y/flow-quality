import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Loader2, AlertCircle, Film, Columns2, MoveHorizontal } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { cn } from "@/lib/cn"
import { useI18n } from "@/i18n"
import { buildJob, useWorkflow } from "@/store/WorkflowContext"
import type { PreviewStage } from "@shared/types"

export function BeforeAfter() {
  const { t } = useI18n()
  const { media, exportResult, platform, profile, fps, blur, enhance } = useWorkflow()
  const videoRef = useRef<HTMLVideoElement>(null)
  const areaRef = useRef<HTMLDivElement>(null)

  const stages = useMemo(() => {
    const list: Array<{ key: PreviewStage; label: string }> = [{ key: "original", label: t.import.stage.original }]
    if (fps.enabled) list.push({ key: "fps", label: t.import.stage.fps })
    if (blur.enabled) list.push({ key: "blur", label: t.import.stage.blur })
    if (enhanceEnabled()) list.push({ key: "enhance", label: t.import.stage.enhance })
    list.push({ key: "final", label: t.import.stage.final })
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t, fps.enabled, blur.enabled, enhance, platform, profile])

  const [active, setActive] = useState<PreviewStage>("original")
  const [clips, setClips] = useState<Partial<Record<PreviewStage, string>>>({})
  const [loading, setLoading] = useState<PreviewStage | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [compare, setCompare] = useState(false)
  const [compareMode, setCompareMode] = useState<"split" | "slider">("split")
  const [percent, setPercent] = useState(50)
  const [visible, setVisible] = useState(typeof document !== "undefined" ? !document.hidden : true)
  const draggingRef = useRef(false)

  const job = useMemo(() => {
    if (!media) return null
    return buildJob(media.path, "preview.mp4", platform, profile, fps, blur, enhance)
  }, [media, platform, profile, fps, blur, enhance])

  const srcFor = (stage: PreviewStage): string => clips[stage] ?? ""

  const toFileUrl = (p: string) => "file:///" + encodeURI(p.replace(/\\/g, "/"))

  const load = useCallback(
    async (stage: PreviewStage) => {
      if (clips[stage] || loading) return
      if (!window.api || !media) return
      setLoading(stage)
      setError(null)
      try {
        let res: { ok: boolean; path?: string; error?: string }
        if (stage === "final" && exportResult) {
          // Light transcode preview of the finished file — not the full-res original.
          res = await window.api.previewFile({ path: exportResult.outputPath, maxHeight: 540, durationSec: 4 })
        } else {
          if (!job) return
          res = await window.api.previewClip({ job, stage, maxHeight: 540, durationSec: 4 })
        }
        if (res.ok && res.path) {
          setClips((c) => ({ ...c, [stage]: toFileUrl(res.path!) }))
        } else {
          setError(res.error || t.import.previewError)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e))
      } finally {
        setLoading(null)
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clips, loading, job, media, exportResult, t],
  )

  // Settings fingerprint: any change to source, fps/blur/enhance or the export
  // clears the preview cache (debounced) and re-renders the active stage, so the
  // live preview always matches the current settings.
  const settingsKey = useMemo(() => {
    const json = (v: unknown) => JSON.stringify(v ?? null)
    return [
      media?.path,
      fps.enabled,
      fps.targetFps,
      fps.mode,
      blur.enabled,
      blur.preset,
      blur.intensity,
      blur.trailLength,
      blur.samples,
      blur.direction,
      blur.smartSpeed,
      json(enhance),
      exportResult?.outputPath,
    ].join("|")
  }, [media, fps, blur, enhance, exportResult])

  const lastKey = useRef<string | null>(null)
  useEffect(() => {
    const key = settingsKey
    if (!key || lastKey.current === key) return
    lastKey.current = key
    const id = setTimeout(() => {
      setClips({})
      setError(null)
      load(active)
      if (compare && active !== "original") load("original")
    }, 700)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settingsKey, active, compare, load])

  // Pause all videos when the window is hidden/minimized to stop the heavy decoding.
  useEffect(() => {
    const onVis = () => setVisible(!document.hidden)
    document.addEventListener("visibilitychange", onVis)
    return () => document.removeEventListener("visibilitychange", onVis)
  }, [])

  useEffect(() => {
    if (!visible) document.querySelectorAll("video").forEach((v) => v.pause())
  }, [visible])

  useEffect(() => {
    if (!stages.some((s) => s.key === active)) {
      setActive(stages[stages.length - 1].key)
    }
  }, [stages, active])

  useEffect(() => {
    load(active)
  }, [active, load])

  useEffect(() => {
    if (compare && active !== "original") load("original")
  }, [compare, active, load])

  const src = srcFor(active)
  const busy = loading === active && !src

  useEffect(() => {
    const v = videoRef.current
    if (v && src && !busy && visible) {
      v.currentTime = 0
      v.play().catch(() => {})
    }
  }, [active, src, busy, visible])

  const compareEnabled = compare && active !== "original"
  const sliderMode = compareEnabled && compareMode === "slider"
  const compareBefore = compareEnabled ? clips["original"] ?? "" : ""
  const compareAfter = compareEnabled ? src : ""
  const compareReady = compareEnabled && !!compareBefore && !!compareAfter

  const updatePercent = (clientX: number) => {
    const el = areaRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const p = ((clientX - rect.left) / rect.width) * 100
    setPercent(Math.min(96, Math.max(4, p)))
  }

  const startDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = true
    ;(e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId)
    updatePercent(e.clientX)
  }

  const onDragMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (draggingRef.current) updatePercent(e.clientX)
  }

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    draggingRef.current = false
    ;(e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId)
  }

  if (!media) return null

  // Fixed layout: "Before" is always on the LEFT, "After" always on the RIGHT.
  // clipPath clips the "before" layer from the LEFT side so it is visible on the left.
  const beforeClip = `inset(0 ${100 - percent}% 0 0)`

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line p-4">
        <div>
          <div className="text-[13px] font-semibold text-ink">{t.import.preview}</div>
          <div className="mt-0.5 text-[11px] text-ink-faint">{t.import.previewHint}</div>
        </div>
        {exportResult && (
          <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10.5px] font-medium text-accent">{t.export.done} ✓</span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 border-b border-line bg-panel/40 px-4 py-3">
        {stages.map((s) => {
          const isActive = s.key === active
          const hasClip = !!srcFor(s.key)
          return (
            <button
              key={s.key}
              onClick={() => setActive(s.key)}
              className={cn(
                "rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors",
                isActive ? "bg-accent text-white shadow-glow" : "bg-panel2 text-ink-dim hover:text-ink",
              )}
            >
              {s.label}
              {hasClip && <span className="ml-1.5 text-[10px] opacity-70">●</span>}
            </button>
          )
        })}

        <div className="ml-auto flex items-center gap-1.5">
          {compareEnabled && (
            <div className="flex items-center gap-0.5 rounded-full bg-panel2 p-0.5">
              <button
                onClick={() => setCompareMode("split")}
                title={t.import.compareSplit}
                className={cn(
                  "rounded-full p-1.5 transition-colors",
                  compareMode === "split" ? "bg-accent text-white shadow-glow" : "text-ink-dim hover:text-ink",
                )}
              >
                <Columns2 size={13} />
              </button>
              <button
                onClick={() => setCompareMode("slider")}
                title={t.import.compareSlider}
                className={cn(
                  "rounded-full p-1.5 transition-colors",
                  compareMode === "slider" ? "bg-accent text-white shadow-glow" : "text-ink-dim hover:text-ink",
                )}
              >
                <MoveHorizontal size={13} />
              </button>
            </div>
          )}
          <button
            onClick={() => setCompare((c) => !c)}
            disabled={active === "original"}
            title={active === "original" ? t.import.previewError : t.import.beforeAfter}
            className={cn(
              "flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-40",
              compareEnabled ? "bg-accent text-white shadow-glow" : "bg-panel2 text-ink-dim hover:text-ink",
            )}
          >
            <Columns2 size={13} />
            {t.import.beforeAfter}
          </button>
        </div>
      </div>

      {compareEnabled && compareMode === "split" ? (
        <div dir="ltr" className="grid gap-3 border-t border-line p-3 sm:grid-cols-2">
          <ComparePanel
            label={t.import.before}
            tone="before"
            src={compareBefore}
            loading={loading === "original" && !compareBefore}
            error={error}
            onRetry={() => load("original")}
          />
          <ComparePanel
            label={t.import.after}
            tone="after"
            src={compareAfter}
            loading={loading === active && !compareAfter}
            error={error}
            onRetry={() => load(active)}
          />
        </div>
      ) : (
      <div
        ref={areaRef}
        onPointerDown={sliderMode ? startDrag : undefined}
        onPointerMove={sliderMode ? onDragMove : undefined}
        onPointerUp={sliderMode ? endDrag : undefined}
        onPointerCancel={sliderMode ? endDrag : undefined}
        className={cn(
          "relative aspect-video w-full select-none overflow-hidden bg-black",
          sliderMode && "touch-none cursor-ew-resize",
        )}
      >
        {compareEnabled ? (
          compareReady ? (
              <>
                {/* Bottom layer: the "after" video (full area) */}
                <video
                  key="cmp-after"
                  src={compareAfter}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  className="absolute inset-0 h-full w-full object-contain"
                />
                {/* Top layer: the "before" video, clipped to one side */}
                <video
                  key="cmp-before"
                  src={compareBefore}
                  muted
                  autoPlay
                  loop
                  playsInline
                  preload="metadata"
                  disablePictureInPicture
                  className="absolute inset-0 h-full w-full object-contain"
                  style={{ clipPath: beforeClip }}
                />

                {/* Divider line */}
                <div
                  className="absolute inset-y-0 w-[3px] bg-white shadow-[0_0_12px_rgba(0,0,0,0.8)]"
                  style={{ left: `${percent}%`, transform: "translateX(-50%)" }}
                >
                  {/* Drag handle circle */}
                  <div className="absolute left-1/2 top-1/2 flex h-10 w-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 border-white bg-black/60 shadow-lg backdrop-blur-sm">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m8 7-5 5 5 5" />
                      <path d="m16 7 5 5-5 5" />
                    </svg>
                  </div>
                </div>

                {/* Before label — always on the LEFT */}
                <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold shadow-lg bg-black/70 text-white border border-white/20">
                  {t.import.before}
                  <span className="text-[14px]">▶</span>
                </div>

                {/* After label — always on the RIGHT */}
                <div className="pointer-events-none absolute top-3 right-3 z-10 flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold shadow-lg bg-accent text-white border border-accent/50">
                  <span className="text-[14px]">◀</span>
                  {t.import.after}
                </div>

                {/* Bottom hint */}
                <div className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 rounded-lg bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white/80 backdrop-blur-sm border border-white/10">
                  {t.import.compareDragHint}
                </div>
              </>
          ) : error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
              <AlertCircle size={22} className="text-warn" />
              <span className="text-[12px] text-ink-dim">{error}</span>
              <button
                onClick={() => load(active)}
                className="mt-1 rounded-full bg-panel2 px-3 py-1 text-[11.5px] font-medium text-ink hover:text-accent"
              >
                {t.common.retry}
              </button>
            </div>
          ) : (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-faint">
              <Loader2 size={26} className="animate-spin text-accent" />
              <span className="text-[12px]">{t.import.previewGenerating}</span>
            </div>
          )
        ) : busy ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-faint">
            <Loader2 size={26} className="animate-spin text-accent" />
            <span className="text-[12px]">{t.import.previewGenerating}</span>
          </div>
        ) : src ? (
          <video
            key={active}
            ref={videoRef}
            src={src}
            muted
            autoPlay
            loop
            playsInline
            preload="metadata"
            disablePictureInPicture
            className="h-full w-full object-contain"
          />
        ) : error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
            <AlertCircle size={22} className="text-warn" />
            <span className="text-[12px] text-ink-dim">{error}</span>
            <button
              onClick={() => load(active)}
              className="mt-1 rounded-full bg-panel2 px-3 py-1 text-[11.5px] font-medium text-ink hover:text-accent"
            >
              {t.common.retry}
            </button>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-ink-faint">
            <Film size={26} />
          </div>
        )}

        {!compareEnabled && (
          <div className="pointer-events-none absolute bottom-3 left-1/2 -translate-x-1/2 rounded-lg bg-black/60 px-2.5 py-1 text-[11px] font-medium text-white/90 backdrop-blur-sm">
            {stages.find((s) => s.key === active)?.label}
          </div>
        )}
      </div>
      )}

      <div className="flex flex-wrap gap-x-4 gap-y-1 border-t border-line px-4 py-2.5 text-[11px] text-ink-faint">
        <span>{t.fps.title}: {fps.enabled ? `${fps.targetFps} fps` : t.common.off}</span>
        <span>{t.motionBlur.title}: {blur.enabled ? blur.preset : t.common.off}</span>
        <span>{t.enhance.title}: {enhanceEnabled() ? t.common.on : t.common.off}</span>
      </div>
    </Card>
  )

  function enhanceEnabled(): boolean {
    return (
      enhance.ai ||
      enhance.denoise > 0 ||
      enhance.deblock > 0 ||
      enhance.sharpen > 0 ||
      enhance.contrast !== 0 ||
      enhance.saturation !== 0 ||
      enhance.vibrance > 0 ||
      enhance.nightNoise ||
      enhance.textClarity ||
      enhance.repairCompression ||
      !!enhance.lut
    )
  }
}

function ComparePanel({ label, tone, src, loading, error, onRetry }: {
  label: string
  tone: "before" | "after"
  src: string
  loading: boolean
  error: string | null
  onRetry: () => void
}) {
  const { t } = useI18n()

  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-line bg-black">
      {src ? (
        <video
          key={tone}
          src={src}
          muted
          autoPlay
          loop
          playsInline
          preload="metadata"
          disablePictureInPicture
          className="h-full w-full object-contain"
        />
      ) : error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center">
          <AlertCircle size={22} className="text-warn" />
          <span className="text-[12px] text-ink-dim">{error}</span>
          <button
            onClick={onRetry}
            className="mt-1 rounded-full bg-panel2 px-3 py-1 text-[11.5px] font-medium text-ink hover:text-accent"
          >
            {t.common.retry}
          </button>
        </div>
      ) : loading ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-ink-faint">
          <Loader2 size={26} className="animate-spin text-accent" />
        </div>
      ) : (
        <div className="absolute inset-0 flex items-center justify-center text-ink-faint">
          <Film size={26} />
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-2">
        <span
          className={cn(
            "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-[12px] font-bold text-white shadow-lg",
            tone === "after" ? "bg-accent" : "border border-white/25 bg-black/75 backdrop-blur-sm",
          )}
        >
          {label}
        </span>
      </div>
    </div>
  )
}
