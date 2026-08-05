import { motion, AnimatePresence } from "framer-motion"
import {
  Rocket,
  Loader2,
  CheckCircle2,
  FolderOpen,
  ExternalLink,
  Ban,
  AlertTriangle,
  HardDrive,
  Monitor,
  Film,
  Gauge,
  ListChecks,
  Sparkles,
} from "lucide-react"
import { Card } from "@/components/ui/Card"
import { Progress } from "@/components/ui/Progress"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { formatBytes, formatDuration, formatEta, formatClock, interpolate } from "@/lib/format"


export function ExportPanel() {
  const { t, tx } = useI18n()
  const {
    media,
    profile,
    estimatedMB,
    exportState,
    exportProgress,
    exportStart,
    exportResult,
    exportError,
    startExport,
    cancelExport,
    platform,
  } = useWorkflow()

  if (!media) return null

  const running = exportState === "running"
  const done = exportState === "done"
  const error = exportState === "error"
  const busy = exportState === "busy"
  const progress = exportProgress
  const platformLabel = t.import.platform[platform]

  return (
    <Card className="overflow-hidden">
      <div className="border-b border-line bg-gradient-to-br from-accent/10 via-transparent to-accent2/5 p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15 text-accent">
              <Rocket size={18} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-ink">{t.export.profileTitle}</span>
                <Badge tone="accent">{t.export.profileAuto}</Badge>
              </div>
              <p className="mt-0.5 text-[12px] text-ink-dim">
                {interpolate(t.export.profileAutoDesc, { size: "50" })} · {platformLabel}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="primary" size="md" onClick={startExport} disabled={running || done}>
              {running ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> {t.common.processing}
                </>
              ) : done ? (
                <>{t.export.done} ✓</>
              ) : (
                <>{t.common.export}</>
              )}
            </Button>
          </div>
        </div>
        <p className="mt-2.5 text-[11.5px] text-ink-faint">{t.export.profileInfo}</p>
      </div>

      <div className="grid gap-4 p-5 sm:grid-cols-2">
        <div className="space-y-2.5 rounded-2xl bg-panel p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{t.export.profileTitle}</div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2">
            <Spec icon={<Monitor size={14} />} label={t.export.resolution} value={`${profile.width}×${profile.height}`} />
            <Spec icon={<Gauge size={14} />} label={t.export.fps} value={`${profile.fps} fps`} />
            <Spec icon={<Film size={14} />} label={t.export.codec} value={profile.codec.toUpperCase()} />
            <Spec icon={<ListChecks size={14} />} label={t.export.jobSummary} value={summary() || "–"} />
          </div>
        </div>
        <div className="space-y-2.5 rounded-2xl bg-panel p-4">
          <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{t.export.profileAutoHint}</div>
          <Spec icon={<HardDrive size={14} />} label={t.export.sourceSize} value={formatBytes(media.sizeBytes)} />
          <Spec icon={<HardDrive size={14} />} label={t.export.outputSize} value={`≈ ${estimatedMB.toFixed(0)} MB`} />
          <Spec icon={<Film size={14} />} label={t.export.resolution} value={formatDuration(media.durationSec)} />
        </div>
      </div>

      <AnimatePresence>
        {running && progress ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line p-5">
              <div className="flex items-end justify-between">
                <div>
                  <div className="text-3xl font-semibold tabular-nums text-ink">{progress.percent.toFixed(0)}%</div>
                  {progress.phase && (
                    <div className="mt-1 flex items-center gap-1.5 text-[11.5px] text-ink-dim">
                      {progress.phase === "ai" ? <Sparkles size={12} className="text-good" /> : <Loader2 size={12} className="animate-spin text-accent" />}
                      {progress.phase === "render" ? t.export.phaseRender : progress.phase === "ai" ? t.export.phaseAi : t.export.phaseEncode}
                    </div>
                  )}
                </div>
                <div className="text-end text-[12px] text-ink-dim">
                  <div>
                    {t.export.timeElapsed}: {formatClock(progress.timeSec)}
                  </div>
                  <div>
                    {t.export.eta}: {formatEta(progress.etaSec)}
                  </div>
                </div>
              </div>
              <Progress value={progress.percent} className="mt-2.5" />
              <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-dim">
                <span>
                  {t.export.speed}: <span className="tabular-nums text-ink">{progress.speedX.toFixed(1)}×</span>
                </span>
                <span>
                  {t.export.fps}: <span className="tabular-nums text-ink">{progress.fps.toFixed(0)}</span>
                </span>
                <span>
                  {t.export.progress}: <span className="tabular-nums text-ink">{formatBytes(progress.sizeBytes)}</span>
                </span>
                <Button variant="ghost" size="sm" onClick={cancelExport} className="text-bad hover:bg-bad/10 hover:text-[#ffb3c0]">
                  <Ban size={13} /> {t.export.cancel}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {done && exportResult ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-good/8 p-5">
              <div className="flex items-center gap-3">
                <CheckCircle2 size={24} className="text-good" />
                <div>
                  <div className="text-[14px] font-semibold text-ink">{t.export.done}</div>
                  <div className="text-[12px] text-ink-dim">
                    {t.export.fileReady}: {formatBytes(exportResult.outputSizeBytes)} · {exportResult.width}×{exportResult.height} ·{" "}
                    {exportResult.fps} fps · {formatDuration(exportResult.encodingTimeSec)}
                  </div>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secondary" size="sm" onClick={() => window.api?.revealInFolder(exportResult.outputPath)}>
                  <FolderOpen size={14} /> {t.export.reveal}
                </Button>
                <Button variant="primary" size="sm" onClick={() => window.api?.openUploadPage(platform, exportResult.outputPath)}>
                  <ExternalLink size={14} /> {interpolate(t.export.uploadPlatform, { platform: platformLabel })}
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}

        {error ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="flex items-center justify-between gap-3 border-t border-line bg-bad/8 p-5">
              <div className="flex items-center gap-3">
                <AlertTriangle size={20} className="text-bad" />
                <div>
                  <div className="text-[14px] font-semibold text-ink">{t.export.errorTitle}</div>
                  <div className="max-w-md break-words text-[12px] text-ink-dim">{exportError || t.common.retry}</div>
                </div>
              </div>
              <Button variant="danger" size="sm" onClick={startExport}>
                {t.common.retry}
              </Button>
            </div>
          </motion.div>
        ) : null}

        {busy ? (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-line bg-warn/8 p-5 text-[13px] text-warn">{t.export.busy}</div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </Card>
  )

  function summary(): string {
    const items = exportStart?.summary || []
    return items.join(" + ")
  }
}

function Spec({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-ink-faint">{icon}</span>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] text-ink-faint">{label}</div>
        <div className="truncate text-[12.5px] font-medium text-ink">{value}</div>
      </div>
    </div>
  )
}
