import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
  Zap,
  Loader2,
  CheckCircle2,
  FolderOpen,
  ExternalLink,
  Ban,
  AlertTriangle,
  Monitor,
  Gauge,
  Film,
  ListChecks,
  Sparkles,
  HardDrive,
  Cpu,
  SlidersHorizontal,
  GitBranch,
  ChevronRight,
  ChevronDown,
} from "lucide-react"
import { cn } from "@/lib/cn"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Progress } from "@/components/ui/Progress"
import { EmptyState } from "@/components/ui/EmptyState"
import { Slider } from "@/components/ui/Slider"
import { Switch } from "@/components/ui/Switch"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { formatBytes, formatDuration, formatEta, formatClock } from "@/lib/format"

export function QuickQualityPage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const {
    media,
    platform,
    exportState,
    exportProgress,
    exportStart,
    exportResult,
    exportError,
    startQuickExport,
    cancelExport,
  } = useWorkflow()

  const [hevc, setHevc] = useState<{ encoder: string; label: string } | null>(null)
  const [bitrate, setBitrate] = useState(10)
  const [sharpen, setSharpen] = useState(0.4)
  const [fps60, setFps60] = useState(true)

  useEffect(() => {
    window.api?.hevcEncoder().then(setHevc).catch(() => setHevc(null))
  }, [])

  const running = exportState === "running"
  const done = exportState === "done"
  const error = exportState === "error"
  const busy = exportState === "busy"
  const progress = exportProgress
  const platformLabel = t.import.platform[platform]
  const gpuEncoder = !!hevc?.label.includes("(GPU)")
  const estMB = media ? Math.max(1, Math.round((bitrate * media.durationSec) / 8)) : 0

  const go = () => startQuickExport({ bitrateMbps: bitrate, sharpenAmount: sharpen, fps60, encoder: "auto" })

  if (!media) {
    return (
      <div>
        <PageHeader title={t.quick.title} subtitle={t.quick.subtitle} icon={<Zap size={19} />} />
        <EmptyState
          icon={<Zap size={26} />}
          title={t.import.needVideo}
          subtitle={t.import.subtitle}
          action={
            <Button size="md" onClick={() => navigate("/import")}>
              {t.import.browseBtn}
            </Button>
          }
        />
      </div>
    )
  }

  return (
    <div>
      <PageHeader title={t.quick.title} subtitle={t.quick.subtitle} icon={<Zap size={19} />} />

      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <SlidersHorizontal size={15} className="text-accent" />
            {t.quick.estTime}
          </div>
          <Badge tone={gpuEncoder ? "good" : "warn"}>
            {hevc ? hevc.label : t.quick.encoderAuto}
          </Badge>
        </div>
        <div className="grid gap-5 p-5 sm:grid-cols-2">
          <Slider
            label={t.quick.bitrate}
            value={bitrate}
            onChange={setBitrate}
            min={5}
            max={15}
            step={0.5}
            unit=" Mbps"
            hint={t.quick.bitrateHint}
          />
          <Slider
            label={t.quick.sharpen}
            value={sharpen}
            onChange={setSharpen}
            min={0}
            max={0.6}
            step={0.1}
            display={
              sharpen === 0
                ? t.quick.sharpenOff
                : sharpen <= 0.2
                  ? t.quick.sharpenLight
                  : sharpen <= 0.4
                    ? t.quick.sharpenMedium
                    : t.quick.sharpenStrong
            }
          />
        </div>
        <div className="grid gap-4 border-t border-line px-5 py-3 sm:grid-cols-2">
          <Switch
            checked={fps60}
            onChange={setFps60}
            label={t.quick.fps60}
            description={fps60 ? "60 fps" : t.import.platform[platform]}
          />
          <div className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5">
            <span className="flex items-center gap-2 text-sm font-medium text-ink">
              <HardDrive size={15} className="text-ink-faint" />
              {t.quick.estSize}
            </span>
            <span className="font-semibold tabular-nums text-ink">{formatBytes(estMB * 1024 * 1024)}</span>
          </div>
        </div>
      </Card>

      <Card className="mb-4">
        <div className="border-b border-line px-5 py-3.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold text-ink">
            <GitBranch size={15} className="text-accent" />
            {t.quick.flow.title}
          </div>
          <p className="mt-0.5 text-[11.5px] text-ink-dim">{t.quick.flow.subtitle}</p>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row sm:items-stretch sm:gap-0">
          <FlowNode icon={<Film size={16} />} title={t.quick.flow.source} detail={`${media.width}×${media.height}`} highlight />
          <FlowArrow />
          <FlowNode icon={<Monitor size={16} />} title={t.quick.flow.detect} detail={`${formatDuration(media.durationSec)} · ${media.fps.toFixed(0)} fps`} />
          <FlowArrow />
          <FlowNode icon={<Sparkles size={16} />} title={t.quick.flow.quality} detail={qualityDetail()} highlight={sharpen > 0 || fps60} />
          <FlowArrow />
          <FlowNode icon={<Cpu size={16} />} title={t.quick.flow.encoder} detail={hevc?.label ?? t.quick.encoderAuto} highlight={!!gpuEncoder} />
          <FlowArrow />
          <FlowNode icon={<FolderOpen size={16} />} title={t.quick.flow.output} detail={formatBytes(estMB * 1024 * 1024)} />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <div className="border-b border-line bg-gradient-to-br from-good/10 via-transparent to-accent/5 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-good/15 text-good">
                <Zap size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">{t.quick.title}</span>
                  <Badge tone="good">{t.quick.tag}</Badge>
                </div>
                <p className="mt-0.5 text-[12px] text-ink-dim">{t.quick.tagline} · {platformLabel}</p>
              </div>
            </div>
            <Button size="lg" onClick={go} disabled={running || done}>
              {running ? (
                <>
                  <Loader2 size={16} className="animate-spin" /> {t.common.processing}
                </>
              ) : done ? (
                <>{t.export.done} ✓</>
              ) : (
                <>
                  <Zap size={16} /> {t.quick.start}
                </>
              )}
            </Button>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2">
          <div className="space-y-2.5 rounded-2xl bg-panel p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{t.quick.stepsTitle}</div>
            <ul className="space-y-2">
              {t.quick.steps.map((s, i) => (
                <li key={i} className="flex items-center gap-2.5 text-[12.5px] text-ink-dim">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-good/15 text-[10.5px] font-bold text-good">
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ul>
          </div>
          <div className="space-y-2.5 rounded-2xl bg-panel p-4">
            <div className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{t.export.profileTitle}</div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <Spec icon={<Monitor size={14} />} label={t.export.resolution} value={t.quick.keepRes} />
              <Spec icon={<Gauge size={14} />} label={t.export.fps} value={fps60 ? "60 fps" : t.quick.sourceFps} />
              <Spec icon={<Film size={14} />} label={t.export.codec} value={`HEVC · ${hevc?.encoder ?? "auto"}`} />
              <Spec icon={<ListChecks size={14} />} label={t.export.jobSummary} value={summary()} />
            </div>
            <div className="space-y-1.5 pt-1 text-[11.5px] text-ink-faint">
              <div className="flex items-center gap-2">
                <HardDrive size={13} />
                {t.export.sourceSize}: {formatBytes(media.sizeBytes)} · {formatDuration(media.durationSec)}
              </div>
              <div className="flex items-center gap-2">
                <Cpu size={13} />
                {gpuEncoder ? t.quick.encoderGpu : t.quick.encoderCpu}
              </div>
            </div>
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
                        <Sparkles size={12} className="text-good" />
                        {progress.phase === "ai" ? t.export.phaseAi : progress.phase === "render" ? t.export.phaseRender : t.export.phaseEncode}
                      </div>
                    )}
                  </div>
                  <div className="text-end text-[12px] text-ink-dim">
                    <div>{t.export.timeElapsed}: {formatClock(progress.timeSec)}</div>
                    <div>{t.export.eta}: {formatEta(progress.etaSec)}</div>
                  </div>
                </div>
                <Progress value={progress.percent} className="mt-2.5" tone="good" />
                <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2 text-[12px] text-ink-dim">
                  <span>{t.export.speed}: <span className="tabular-nums text-ink">{progress.speedX.toFixed(1)}×</span></span>
                  <span>{t.export.fps}: <span className="tabular-nums text-ink">{progress.fps.toFixed(0)}</span></span>
                  <span>{t.export.progress}: <span className="tabular-nums text-ink">{formatBytes(progress.sizeBytes)}</span></span>
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
                    <div className="text-[14px] font-semibold text-ink">{t.quick.ready}</div>
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
                    <ExternalLink size={14} /> {t.export.uploadPlatform.replace("{{platform}}", platformLabel)}
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
                <Button variant="danger" size="sm" onClick={go}>
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
    </div>
  )

  function summary(): string {
    const items = exportStart?.summary || [
      fps60 ? "60 FPS" : "Source FPS",
      sharpen > 0 ? "Sharpen" : "No sharpen",
      "HEVC hvc1",
    ]
    return items.join(" + ")
  }

  function qualityDetail(): string {
    const fps = fps60 ? "60 FPS" : t.quick.sourceFps
    const shp =
      sharpen === 0
        ? t.quick.sharpenOff
        : sharpen <= 0.2
          ? t.quick.sharpenLight
          : sharpen <= 0.4
            ? t.quick.sharpenMedium
            : t.quick.sharpenStrong
    return `${fps} · ${t.quick.sharpen}: ${shp}`
  }
}

function FlowNode({ icon, title, detail, highlight }: { icon: React.ReactNode; title: string; detail: string; highlight?: boolean }) {
  return (
    <div
      className={cn(
        "relative flex-1 rounded-xl border p-3 text-center transition-colors",
        highlight ? "border-accent/40 bg-accent/5" : "border-line bg-panel",
      )}
    >
      <div
        className={cn(
          "mx-auto flex h-9 w-9 items-center justify-center rounded-full",
          highlight ? "bg-accent/15 text-accent" : "bg-panel2 text-ink-dim",
        )}
      >
        {icon}
      </div>
      <div className="mt-2 text-[11px] font-semibold text-ink">{title}</div>
      <div className="mt-0.5 truncate text-[10.5px] text-ink-dim">{detail}</div>
    </div>
  )
}

function FlowArrow() {
  return (
    <>
      <div className="hidden items-center justify-center px-1 text-ink-faint sm:flex">
        <ChevronRight size={18} />
      </div>
      <div className="flex justify-center text-ink-faint sm:hidden">
        <ChevronDown size={18} />
      </div>
    </>
  )
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
