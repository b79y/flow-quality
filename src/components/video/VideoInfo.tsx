import { Film, Monitor, AudioLines, Clock, HardDrive, Gauge } from "lucide-react"
import { Card } from "@/components/ui/Card"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { formatBytes, formatDuration, formatResolution } from "@/lib/format"

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 rounded-xl bg-panel px-3 py-2.5">
      <span className="text-ink-faint">{icon}</span>
      <div className="min-w-0 leading-tight">
        <div className="text-[10px] uppercase tracking-wide text-ink-faint">{label}</div>
        <div className="truncate text-[13px] font-medium tabular-nums text-ink">{value}</div>
      </div>
    </div>
  )
}

export function VideoInfo() {
  const { t } = useI18n()
  const { media } = useWorkflow()
  if (!media) return null

  const src = "file:///" + encodeURI(media.path.replace(/\\/g, "/"))

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-5 p-5 md:flex-row">
        <div className="relative aspect-[9/16] w-40 shrink-0 overflow-hidden rounded-2xl bg-black ring-1 ring-line">
          {media.audioCodec !== "none" ? (
            <video src={src} muted autoPlay loop playsInline className="h-full w-full object-contain" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-ink-faint">
              <Film size={28} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[15px] font-semibold text-ink">{media.name}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-3">
            <Stat icon={<Monitor size={15} />} label={t.import.resolution} value={formatResolution(media.width, media.height)} />
            <Stat icon={<Gauge size={15} />} label={t.import.framerate} value={`${media.fps.toFixed(2)} fps`} />
            <Stat icon={<Film size={15} />} label={t.import.codec} value={media.codec} />
            <Stat icon={<Clock size={15} />} label={t.import.duration} value={formatDuration(media.durationSec)} />
            <Stat icon={<HardDrive size={15} />} label={t.import.size} value={formatBytes(media.sizeBytes)} />
            <Stat icon={<AudioLines size={15} />} label={t.import.audio} value={media.audioCodec} />
          </div>
          <div className="mt-3 text-[12px] text-ink-faint">
            {t.import.bitrate}: {media.bitrateKbps} kbps · {t.import.fileInfo}
          </div>
        </div>
      </div>
    </Card>
  )
}
