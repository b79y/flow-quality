import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Palette, Download, FolderOpen, Check, Sparkles, Info } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { Tabs } from "@/components/ui/Tabs"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { cn } from "@/lib/cn"
import { DEFAULT_ENHANCE } from "@/lib/constants"
import type { Pack } from "@shared/types"

type TabKey = "lut" | "premiere" | "ae" | "resolve" | "capcut"

const LUT_SWATCHES: Array<[string, string, string]> = [
  ["Cinematic Vintage", "#d9a066", "#2c2033"],
  ["Cinematic Teal", "#4f6b78", "#12202b"],
  ["Cinematic Warm", "#c98a4b", "#241a12"],
  ["Orange Teal", "#3e7d7e", "#b0682f"],
  ["Bleach Bypass", "#8c9aa0", "#22262a"],
  ["Teal Shadow", "#4c8a92", "#1b2a33"],
  ["Mobile Cinematic", "#b98a5a", "#23241f"],
  ["Mobile Vibrant", "#e88a5a", "#1f2740"],
  ["Mobile Warm", "#d9a04a", "#2a2014"],
]

export function PresetsPage() {
  const { t, tx } = useI18n()
  const nav = useNavigate()
  const { packs, installPack, openPacksFolder, lutFiles, enhance, setEnhance } = useWorkflow()
  const [tab, setTab] = useState<TabKey>("lut")

  const lutPacks = packs.filter((p) => p.category === "lut")

  const applyLut = (name: string, path: string) => {
    setEnhance({ ...enhance, lut: path })
    nav("/enhance")
  }

  const editorSteps = (t.presets.steps as unknown as Record<string, string[]>)[tab]

  return (
    <div>
      <PageHeader title={t.presets.title} subtitle={t.presets.subtitle} />

      <Tabs<TabKey>
        value={tab}
        onChange={setTab}
        items={[
          { value: "lut", label: t.presets.tabs.lut },
          { value: "premiere", label: t.presets.tabs.premiere },
          { value: "ae", label: t.presets.tabs.ae },
          { value: "resolve", label: t.presets.tabs.resolve },
          { value: "capcut", label: t.presets.tabs.capcut },
        ]}
        className="mb-5"
      />

      {tab === "lut" ? (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            {lutPacks.map((pack) => {
              const installed = pack.installed
              return (
                <Card key={pack.id} className="p-5">
                  <CardHeader
                    icon={<Palette size={17} className="text-accent2" />}
                    title={pack.name}
                    action={
                      installed ? <Badge tone="good">{t.presets.installed}</Badge> : null
                    }
                  />
                  <CardBody>
                    <p className="mb-4 text-[12.5px] leading-relaxed text-ink-dim">{pack.description}</p>
                    <div className="mb-4 flex items-center justify-between text-[12px] text-ink-faint">
                      <span>{pack.files.length} files</span>
                      <span>{tx(t.presets.size, { size: String(pack.sizeMB) })}</span>
                    </div>
                    {installed ? (
                      <Button variant="outline" size="sm" onClick={openPacksFolder}>
                        <FolderOpen size={14} /> {t.common.openFolder}
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => installPack(pack.id)}>
                        <Download size={14} /> {t.presets.installLut}
                      </Button>
                    )}
                  </CardBody>
                </Card>
              )
            })}
            {lutPacks.length === 0 && (
              <Card className="p-5 text-[13px] text-ink-dim">—</Card>
            )}
          </div>

          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Sparkles size={16} className="text-accent" />
              <h3 className="text-[14px] font-semibold text-ink">{t.presets.howTo}</h3>
            </div>
            {lutFiles.length > 0 ? (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {lutFiles.map((lut) => {
                  const swatch = LUT_SWATCHES.find(([n]) => n === lut.name)
                  const [name, light, dark] = swatch ?? [lut.name, "#888", "#222"]
                  const active = enhance.lut === lut.path
                  return (
                    <button
                      key={lut.path}
                      onClick={() => applyLut(name, lut.path)}
                      className={cn(
                        "glass glass-hover flex items-center gap-3 rounded-xl p-3 text-start",
                        active && "border-accent/60 bg-accent/10",
                      )}
                    >
                      <span
                        className="h-10 w-10 shrink-0 rounded-lg border border-white/10"
                        style={{ background: `linear-gradient(135deg, ${light} 0%, ${dark} 100%)` }}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13px] font-medium text-ink">{name}</span>
                        <span className="block text-[11px] text-ink-faint">{t.presets.apply}</span>
                      </span>
                      {active && <Check size={15} className="shrink-0 text-good" />}
                    </button>
                  )
                })}
              </div>
            ) : (
              <div className="flex items-start gap-2 rounded-xl border border-line bg-panel p-3 text-[12.5px] text-ink-dim">
                <Info size={14} className="mt-0.5 shrink-0 text-accent2" />
                <span>{t.presets.note} {t.presets.editorHint}</span>
              </div>
            )}
          </Card>
        </div>
      ) : (
        <Card className="p-5">
          <h3 className="mb-4 text-[14px] font-semibold text-ink">
            {t.presets.howTo} · {(t.presets.tabs as unknown as Record<string, string>)[tab]}
          </h3>
          <ol className="space-y-3">
            {editorSteps.map((step, i) => (
              <li key={i} className="flex items-start gap-3 text-[13px] leading-relaxed text-ink-dim">
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[12px] font-semibold text-accent">
                  {i + 1}
                </span>
                {step}
              </li>
            ))}
          </ol>
          <div className="mt-5 flex items-start gap-2 rounded-xl border border-line bg-panel p-3 text-[12.5px] text-ink-dim">
            <Info size={14} className="mt-0.5 shrink-0 text-accent2" />
            <span>{t.presets.editorHint}</span>
          </div>
        </Card>
      )}
    </div>
  )
}
