import { useState } from "react"
import { Copy, Check, Film, Layers, Wand2, Smartphone, Cpu, X } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useI18n } from "@/i18n"
import { EXPORT_GUIDES } from "@/lib/constants"
import type { Platform } from "@shared/types"

type GuidePlatform = Exclude<Platform, "generic">

const APP_ICONS: Record<string, typeof Film> = {
  film: Film,
  layers: Layers,
  wand: Wand2,
  smartphone: Smartphone,
  crystal: Cpu,
  x: X,
}

const PLATFORM_KEYS: GuidePlatform[] = ["tiktok", "shorts", "reels"]

export function ExportGuidesPage() {
  const { t } = useI18n()
  const [platform, setPlatform] = useState<GuidePlatform>("tiktok")
  const [copied, setCopied] = useState(false)

  const copyAll = () => {
    const text = EXPORT_GUIDES.map((app) => `${app.name}: ${app.platforms[platform]}`).join("\n")
    const write = (): Promise<void> | void => {
      if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text)
      const ta = document.createElement("textarea")
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand("copy")
      document.body.removeChild(ta)
    }
    Promise.resolve(write()).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1600)
    })
  }

  return (
    <div>
      <PageHeader title={t.exportGuides.title} subtitle={t.exportGuides.subtitle} />

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[13px] text-ink-dim">{t.exportGuides.platform}:</span>
          {PLATFORM_KEYS.map((p) => (
            <button
              key={p}
              onClick={() => setPlatform(p)}
              className={`rounded-lg px-3 py-1.5 text-[13px] font-medium capitalize transition-colors ${
                platform === p
                  ? "bg-accent/20 text-white ring-1 ring-accent/30"
                  : "bg-panel2 text-ink-dim hover:text-ink"
              }`}
            >
              {p}
            </button>
          ))}
        </div>
        <button
          onClick={copyAll}
          className="flex items-center gap-1.5 rounded-lg bg-accent/15 px-3 py-1.5 text-[13px] font-medium text-accent hover:bg-accent/25"
        >
          {copied ? <Check size={14} /> : <Copy size={14} />}
          {copied ? "✓" : t.exportGuides.copyAll}
        </button>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {EXPORT_GUIDES.map((app) => {
          const Icon = APP_ICONS[app.icon] ?? Film
          return (
            <Card key={app.id}>
              <CardHeader
                icon={<Icon size={17} className="text-accent" />}
                title={app.name}
                description={app.description}
                action={<Badge tone="cyan">{app.platforms[platform]}</Badge>}
              />
              <CardBody>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  {t.exportGuides.settings}
                </p>
                <dl className="mb-4 grid grid-cols-[110px_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                  {app.settings.map((s) => (
                    <div key={s.label} className="contents">
                      <dt className="text-ink-dim">{(t.exportGuides.labels as unknown as Record<string, string>)[s.label]}</dt>
                      <dd className="text-ink">{s.value}</dd>
                    </div>
                  ))}
                </dl>
                <p className="mb-2 text-[12px] font-semibold uppercase tracking-wide text-ink-faint">
                  {t.exportGuides.stepsTitle}
                </p>
                <ol className="space-y-1.5">
                  {app.steps.map((step, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px] leading-relaxed text-ink-dim">
                      <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel2 text-[10px] font-semibold text-ink-faint">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </CardBody>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
