import { Sparkles, Wind, Flame, SlidersHorizontal, Activity } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Slider } from "@/components/ui/Slider"
import { Switch } from "@/components/ui/Switch"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { BLUR_PRESETS } from "@/lib/constants"
import { cn } from "@/lib/cn"
import type { BlurDirection, BlurPreset } from "@shared/types"

const PRESET_KEYS: BlurPreset[] = ["cinematic", "light", "strong", "custom"]
const PRESET_ICONS: Record<BlurPreset, typeof Sparkles> = {
  cinematic: Sparkles,
  light: Wind,
  strong: Flame,
  custom: SlidersHorizontal,
}

export function MotionBlurPage() {
  const { t } = useI18n()
  const { blur, setBlur, media } = useWorkflow()

  const applyPreset = (key: BlurPreset) => {
    const meta = BLUR_PRESETS[key]
    setBlur({
      ...blur,
      preset: key,
      intensity: meta.intensity,
      trailLength: meta.trailLength,
      samples: meta.samples,
      direction: meta.direction,
      smartSpeed: meta.smartSpeed,
    })
  }

  const tune = (patch: Partial<typeof blur>) => {
    setBlur({ ...blur, ...patch, preset: "custom" })
  }

  const presetLabel = (k: BlurPreset) => (t.motionBlur.presets as unknown as Record<string, string>)[k]

  return (
    <div>
      <PageHeader title={t.motionBlur.title} subtitle={t.motionBlur.subtitle} />

      <div className="space-y-6">
        <section>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">{t.motionBlur.presetsTitle}</h2>
            <Badge tone="accent">{t.common.recommended}</Badge>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {PRESET_KEYS.map((key) => {
              const Icon = PRESET_ICONS[key]
              const active = blur.preset === key
              return (
                <button
                  key={key}
                  onClick={() => applyPreset(key)}
                  className={cn(
                    "glass glass-hover flex flex-col items-start gap-2.5 rounded-2xl p-4 text-start",
                    active && "border-accent/60 bg-accent/10 shadow-glow",
                  )}
                >
                  <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl", active ? "bg-accent/15 text-accent" : "bg-panel2 text-ink-dim")}>
                    <Icon size={16} />
                  </div>
                  <span className="text-[14px] font-semibold text-ink">{presetLabel(key)}</span>
                  <span className="text-[11.5px] leading-relaxed text-ink-dim">
                    {(t.motionBlur.presets as unknown as Record<string, string>)[key + "Desc"]}
                  </span>
                </button>
              )
            })}
          </div>
        </section>

        <Card>
          <CardHeader icon={<Activity size={17} />} title={t.motionBlur.title} />
          <CardBody className="space-y-5">
            <Slider
              label={t.motionBlur.intensity}
              value={blur.intensity}
              onChange={(v) => tune({ intensity: v })}
              min={0}
              max={10}
              step={1}
              unit="/10"
            />
            <Slider
              label={t.motionBlur.trail}
              value={blur.trailLength}
              onChange={(v) => tune({ trailLength: v })}
              min={1}
              max={10}
              step={1}
              unit="/10"
            />
            <Slider
              label={t.motionBlur.samples}
              value={blur.samples}
              onChange={(v) => tune({ samples: v })}
              min={2}
              max={16}
              step={1}
              unit=""
            />
            <div className="grid gap-4 pt-1 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[13px] text-ink-dim">{t.motionBlur.direction}</label>
                <Select<BlurDirection>
                  value={blur.direction}
                  onChange={(v) => tune({ direction: v })}
                  options={[
                    { value: "auto", label: t.motionBlur.directions.auto },
                    { value: "horizontal", label: t.motionBlur.directions.horizontal },
                    { value: "vertical", label: t.motionBlur.directions.vertical },
                    { value: "radial", label: t.motionBlur.directions.radial },
                  ]}
                />
                <p className="text-[11px] text-ink-faint">{t.motionBlur.previewHint}</p>
              </div>
              <div className="flex items-center">
                <Switch
                  checked={blur.smartSpeed}
                  onChange={(v) => tune({ smartSpeed: v })}
                  label={t.motionBlur.smartSpeed}
                  description={t.motionBlur.smartSpeedDesc}
                />
              </div>
            </div>
          </CardBody>
        </Card>

        <div className="flex flex-wrap items-center gap-3">
          <Badge tone="cyan">{t.motionBlur.bestFor}</Badge>
          {!media && <span className="text-[12px] text-ink-faint">{t.import.needVideo}</span>}
        </div>
      </div>
    </div>
  )
}
