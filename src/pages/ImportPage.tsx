import { Smartphone, Monitor, Clapperboard, Globe } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Button } from "@/components/ui/Button"
import { cn } from "@/lib/cn"
import { DropZone } from "@/components/video/DropZone"
import { VideoInfo } from "@/components/video/VideoInfo"
import { BeforeAfter } from "@/components/video/BeforeAfter"
import { ExportPanel } from "@/components/video/ExportPanel"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { PLATFORMS } from "@/lib/constants"
import type { Platform } from "@shared/types"

const PLATFORM_ICON: Record<Platform, typeof Smartphone> = {
  tiktok: Smartphone,
  shorts: Clapperboard,
  reels: Monitor,
  generic: Globe,
}

export function ImportPage() {
  const { t } = useI18n()
  const { media, platform, setPlatform, probeFile } = useWorkflow()

  return (
    <div>
      <PageHeader title={t.import.title} subtitle={t.import.subtitle} />
      <DropZone />

      {media ? (
        <div className="mt-6 space-y-6">
          <VideoInfo />

          <section>
            <h2 className="mb-3 text-[15px] font-semibold text-ink">{t.import.targetTitle}</h2>
            <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
              {PLATFORMS.map((p) => {
                const Icon = PLATFORM_ICON[p]
                const active = platform === p
                return (
                  <button
                    key={p}
                    onClick={() => setPlatform(p)}
                    className={cn(
                      "glass glass-hover flex items-start gap-3 rounded-2xl p-3.5 text-start",
                      active && "border-accent/60 bg-accent/10 shadow-glow",
                    )}
                  >
                    <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", active ? "bg-accent/15 text-accent" : "bg-panel2 text-ink-dim")}>
                      <Icon size={17} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold text-ink">{t.import.platform[p]}</div>
                      <div className="mt-0.5 text-[11.5px] text-ink-dim">{t.import.platformDesc[p]}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          </section>

          <BeforeAfter />
          <ExportPanel />
        </div>
      ) : (
        <div className="mt-4 text-center text-[13px] text-ink-faint">{t.import.needVideo}</div>
      )}
    </div>
  )
}
