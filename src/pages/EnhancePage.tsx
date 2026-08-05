import { SlidersHorizontal, RotateCcw, Palette, Sparkles, ScanSearch, Cpu, BrainCircuit, Wand2 } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { Slider } from "@/components/ui/Slider"
import { Switch } from "@/components/ui/Switch"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { Separator } from "@/components/ui/Separator"
import { BeforeAfter } from "@/components/video/BeforeAfter"
import { cn } from "@/lib/cn"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { DEFAULT_ENHANCE } from "@/lib/constants"
import type { AiStatus, EnhanceOptions } from "@shared/types"
import { useEffect, useState } from "react"

export function EnhancePage() {
  const { t } = useI18n()
  const { enhance, setEnhance, lutFiles } = useWorkflow()
  const [aiStatus, setAiStatus] = useState<AiStatus | null>(null)

  useEffect(() => {
    window.api?.aiStatus().then(setAiStatus).catch(() => setAiStatus(null))
  }, [])

  const set = <K extends keyof EnhanceOptions>(key: K, value: EnhanceOptions[K]) =>
    setEnhance({ ...enhance, [key]: value })

  const label = (k: string) => (t.enhance.items as unknown as Record<string, string>)[k]
  const desc = (k: string) => (t.enhance.items as unknown as Record<string, string>)[k + "Desc"]

  const presets: Array<{ key: string; label: string; desc: string; apply: Partial<EnhanceOptions> }> = [
    {
      key: "auto",
      label: t.enhance.preset.auto,
      desc: t.enhance.preset.autoDesc,
      apply: { denoise: 35, deblock: 45, sharpen: 30, contrast: 8, saturation: 5, vibrance: 10, repairCompression: true },
    },
    {
      key: "clean",
      label: t.enhance.preset.clean,
      desc: t.enhance.preset.cleanDesc,
      apply: { denoise: 50, deblock: 60, sharpen: 40, repairCompression: true },
    },
    {
      key: "vivid",
      label: t.enhance.preset.vivid,
      desc: t.enhance.preset.vividDesc,
      apply: { contrast: 15, saturation: 30, vibrance: 35 },
    },
    {
      key: "soft",
      label: t.enhance.preset.soft,
      desc: t.enhance.preset.softDesc,
      apply: { denoise: 40, deblock: 25, sharpen: 15, vibrance: 8 },
    },
  ]

  const activePreset = (apply: Partial<EnhanceOptions>): boolean =>
    (Object.keys(apply) as Array<keyof EnhanceOptions>).every((k) => enhance[k] === apply[k])

  return (
    <div>
      <PageHeader
        title={t.enhance.title}
        subtitle={t.enhance.subtitle}
        icon={<SlidersHorizontal size={19} />}
      >
        <Button variant="ghost" size="sm" onClick={() => setEnhance({ ...DEFAULT_ENHANCE })}>
          <RotateCcw size={14} /> {t.enhance.resetAll}
        </Button>
      </PageHeader>

      <Card className="mb-4 p-4">
        <div className="mb-3 flex items-center gap-2">
          <Wand2 size={15} className="text-accent" />
          <span className="text-[12.5px] font-semibold text-ink">{t.enhance.presetsTitle}</span>
        </div>
        <div className="grid gap-2 sm:grid-cols-4">
          {presets.map((p) => (
            <button
              key={p.key}
              onClick={() => setEnhance({ ...enhance, ...p.apply })}
              className={cn(
                "rounded-2xl border p-3 text-start transition-colors",
                activePreset(p.apply)
                  ? "border-accent/60 bg-accent/10"
                  : "border-line bg-panel hover:border-accent/40 hover:bg-panel2",
              )}
            >
              <div className="text-[13px] font-semibold text-ink">{p.label}</div>
              <div className="mt-0.5 text-[11px] leading-relaxed text-ink-dim">{p.desc}</div>
            </button>
          ))}
        </div>
      </Card>

      <div className="mb-4">
        <BeforeAfter />
      </div>

      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles size={17} className="text-accent" />
            <h2 className="text-[15px] font-semibold text-ink">{t.enhance.ai}</h2>
            <span className="rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-semibold text-accent">{t.enhance.aiTag}</span>
          </div>
          <Switch
            checked={enhance.ai}
            onChange={(v) => set("ai", v)}
            label={enhance.ai ? t.common.on : t.common.off}
          />
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">{t.enhance.aiDesc}</p>
        {enhance.ai && (
          <>
            <Separator className="my-5" />
            <div className="grid gap-5 sm:grid-cols-2">
              <Slider
                label={t.enhance.aiStrength}
                hint={t.enhance.aiStrengthDesc}
                value={enhance.aiStrength}
                onChange={(v) => set("aiStrength", v)}
                min={0}
                max={100}
                step={5}
                unit="%"
              />
              <div>
                <div className="mb-2 flex items-center gap-2">
                  <ScanSearch size={14} className="text-accent2" />
                  <span className="text-[13px] font-medium text-ink">{t.enhance.aiUpscale}</span>
                </div>
                <Select
                  value={String(enhance.aiUpscale)}
                  onChange={(v) => set("aiUpscale", Number(v) as 1 | 1.5 | 2)}
                  options={[
                    { value: "1", label: t.enhance.aiUpscale1 },
                    { value: "1.5", label: t.enhance.aiUpscale15 },
                    { value: "2", label: t.enhance.aiUpscale2 },
                  ]}
                />
                <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">{t.enhance.aiUpscaleDesc}</p>
              </div>
            </div>

            <Separator className="my-5" />
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex items-center gap-2">
                <BrainCircuit size={16} className="text-good" />
                <h3 className="text-[13.5px] font-semibold text-ink">{t.enhance.aiReal}</h3>
                <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-semibold text-good">{t.enhance.aiRealTag}</span>
              </div>
              <Switch
                checked={enhance.aiReal}
                onChange={(v) => setEnhance({ ...enhance, aiReal: v, ai: v ? true : enhance.ai })}
                label={enhance.aiReal ? t.common.on : t.common.off}
              />
            </div>
            <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">{t.enhance.aiRealDesc}</p>
            {!aiStatus?.available && (
              <p className="mt-2 flex items-center gap-1.5 text-[11.5px] text-warn">
                <Cpu size={13} /> {t.enhance.aiRealUnavailable}
              </p>
            )}
            {enhance.aiReal && aiStatus?.available && (
              <>
                <Separator className="my-5" />
                <div>
                  <div className="mb-2 flex items-center gap-2">
                    <BrainCircuit size={14} className="text-good" />
                    <span className="text-[13px] font-medium text-ink">{t.enhance.aiModel}</span>
                  </div>
                  <Select
                    value={enhance.aiModel}
                    onChange={(v) => set("aiModel", v as "animevideo" | "x4plus")}
                    options={[
                      { value: "animevideo", label: t.enhance.aiModelFast },
                      { value: "x4plus", label: t.enhance.aiModelQuality },
                    ]}
                  />
                  <p className="mt-2 text-[11.5px] leading-relaxed text-ink-faint">{t.enhance.aiModelDesc}</p>
                  {aiStatus.gpu && (
                    <p className="mt-2 text-[11px] text-ink-faint">
                      GPU: <span className="text-ink">{aiStatus.gpu}</span> · {t.enhance.aiRealNote}
                    </p>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </Card>

      <Card className="mb-4 p-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-2">
            <Palette size={17} className="text-accent2" />
            <h2 className="text-[15px] font-semibold text-ink">{t.enhance.items.lut}</h2>
            {enhance.lut && (
              <button
                onClick={() => set("lut", "")}
                className="ml-1 text-[12px] text-accent hover:text-accent2"
              >
                {t.enhance.resetAll}
              </button>
            )}
          </div>
          <div className="w-64">
            <Select
              value={enhance.lut || ""}
              onChange={(v) => set("lut", v)}
              options={[
                { value: "", label: t.enhance.items.lutNone },
                ...lutFiles.map((l) => ({ value: l.path, label: l.name })),
              ]}
            />
          </div>
        </div>
        <p className="mt-3 text-[12px] leading-relaxed text-ink-faint">{t.enhance.items.lutDesc}</p>
      </Card>


      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <Slider label={label("denoise")} hint={desc("denoise")} value={enhance.denoise} onChange={(v) => set("denoise", v)} min={0} max={100} step={5} unit="%" />
          <Separator className="my-5" />
          <Slider label={label("deblock")} hint={desc("deblock")} value={enhance.deblock} onChange={(v) => set("deblock", v)} min={0} max={100} step={5} unit="%" />
          <Separator className="my-5" />
          <Slider label={label("sharpen")} hint={desc("sharpen")} value={enhance.sharpen} onChange={(v) => set("sharpen", v)} min={0} max={100} step={5} unit="%" />
        </Card>

        <Card className="p-5">
          <Slider label={label("contrast")} hint={desc("contrast")} value={enhance.contrast} onChange={(v) => set("contrast", v)} min={-100} max={100} step={5} unit="%" />
          <Separator className="my-5" />
          <Slider label={label("saturation")} hint={desc("saturation")} value={enhance.saturation} onChange={(v) => set("saturation", v)} min={-100} max={100} step={5} unit="%" />
          <Separator className="my-5" />
          <Slider label={label("vibrance")} hint={desc("vibrance")} value={enhance.vibrance} onChange={(v) => set("vibrance", v)} min={0} max={100} step={5} unit="%" />
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-3">
        {(["nightNoise", "textClarity", "repairCompression"] as const).map((k) => (
          <Card key={k} className="p-2">
            <Switch checked={enhance[k]} onChange={(v) => set(k, v)} label={label(k)} description={desc(k)} />
          </Card>
        ))}
      </div>
    </div>
  )
}
