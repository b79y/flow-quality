import { BrainCircuit, Info } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Switch } from "@/components/ui/Switch"
import { Select } from "@/components/ui/Select"
import { Badge } from "@/components/ui/Badge"
import { LevelCards } from "@/components/video/LevelCards"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import type { InterpTechnique } from "@shared/types"

const REASON_KEY = { blendRec: "blendRec", opticalRec: "opticalRec", dupeRec: "dupeRec" } as const

export function FpsPage() {
  const { t, tx } = useI18n()
  const { media, level, setLevel, fps, setFps, analysis } = useWorkflow()

  const engineLabel = (() => {
    switch (analysis.engine) {
      case "motion":
        return t.fps.techniqueMotion
      case "optical":
        return t.fps.techniqueOptical
      case "blend":
        return t.fps.techniqueBlend
      case "duplicate":
        return t.fps.techniqueDuplicate
    }
  })()

  return (
    <div>
      <PageHeader title={t.fps.title} subtitle={t.fps.subtitle} />

      <div className="space-y-6">
        <section>
          <h2 className="mb-3 text-[15px] font-semibold text-ink">{t.fps.levelsTitle}</h2>
          <LevelCards value={level} onChange={(m) => { setLevel(m); setFps({ ...fps, mode: m }) }} />
        </section>

        {media && (
          <Card>
            <CardHeader
              icon={<BrainCircuit size={17} />}
              title={t.fps.analysisTitle}
              action={<Badge tone="accent">{t.common.recommended}</Badge>}
            />
            <CardBody>
              <div className="flex flex-wrap items-center gap-2 text-[13px]">
                <span className="text-ink-dim">{tx(t.fps.analysis.source, { fps: media.fps.toFixed(2) })}</span>
                {analysis.needsInterp ? (
                  <span className="text-warn">{t.fps.analysis.needsInterp}</span>
                ) : (
                  <span className="text-good">{t.fps.analysis.keeps}</span>
                )}
              </div>
              <div className="mt-2 rounded-xl border border-line bg-panel p-3 text-[13px] leading-relaxed text-ink-dim">
                <div className="mb-1 flex items-center gap-1.5 text-ink">
                  <Info size={13} className="text-accent2" />
                  {tx(t.fps.analysis.recEngine, { engine: engineLabel })}
                </div>
                {analysis.reason === "blendRec" && t.fps.analysis.blendRec}
                {analysis.reason === "opticalRec" && t.fps.analysis.opticalRec}
                {analysis.reason === "dupeRec" && t.fps.analysis.dupeRec}
                <div className="mt-1.5 text-[12px] text-ink-faint">{t.fps.analysis.speedNote}</div>
              </div>
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader title={t.fps.optionsTitle} />
          <CardBody className="space-y-5">
            <div className="flex items-center justify-between">
              <div className="w-full max-w-lg">
                <Switch
                  checked={fps.keepOriginal}
                  onChange={(v) => setFps({ ...fps, keepOriginal: v })}
                  label={t.fps.keepOriginal}
                  description={t.fps.keepOriginalDesc}
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-[13px] text-ink-dim">{t.fps.targetFps}</label>
                <Select
                  value={String(fps.targetFps)}
                  onChange={(v) => setFps({ ...fps, targetFps: Number(v) })}
                  options={[
                    { value: "30", label: "30 fps" },
                    { value: "48", label: "48 fps" },
                    { value: "60", label: "60 fps" },
                    { value: "120", label: "120 fps" },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[13px] text-ink-dim">{t.fps.technique}</label>
                <Select<InterpTechnique>
                  value={fps.technique}
                  onChange={(v) => setFps({ ...fps, technique: v })}
                  options={[
                    { value: "auto", label: t.fps.techniqueAuto },
                    { value: "motion", label: t.fps.techniqueMotion },
                    { value: "blend", label: t.fps.techniqueBlend },
                    { value: "optical", label: t.fps.techniqueOptical },
                    { value: "duplicate", label: t.fps.techniqueDuplicate },
                  ]}
                />
              </div>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  )
}
