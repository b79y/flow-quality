import { useMemo, useState } from "react"
import { Download, FolderOpen, Check, Package, HardDrive, Wrench, Film, Palette, Wand2, Layers, Smartphone, FileText, Image as ImageIcon, AudioLines, Sparkles } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Badge } from "@/components/ui/Badge"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import type { PackCategory } from "@shared/types"

const CATEGORY_ORDER: PackCategory[] = [
  "lut",
  "motionBlur",
  "presetPremiere",
  "presetAe",
  "presetResolve",
  "presetCapcut",
  "overlay",
  "soundfx",
  "template",
  "exportGuide",
]

const CATEGORY_ICONS: Record<PackCategory, typeof Palette> = {
  lut: Palette,
  motionBlur: Sparkles,
  presetPremiere: Film,
  presetAe: Layers,
  presetResolve: Wand2,
  presetCapcut: Smartphone,
  overlay: ImageIcon,
  soundfx: AudioLines,
  template: FileText,
  exportGuide: Wrench,
}

export function DownloadsPage() {
  const { t, tx } = useI18n()
  const { packs, installPack, openPacksFolder } = useWorkflow()
  const [filter, setFilter] = useState<PackCategory | "all">("all")

  const installedCount = packs.filter((p) => p.installed).length

  const catLabel = (c: PackCategory) =>
    (t.downloads.categories as unknown as Record<string, string>)[c]

  const groups = useMemo(() => {
    const visible = filter === "all" ? packs : packs.filter((p) => p.category === filter)
    const map = new Map<PackCategory, typeof packs>()
    for (const pack of visible) {
      const list = map.get(pack.category) ?? []
      list.push(pack)
      map.set(pack.category, list)
    }
    return CATEGORY_ORDER.filter((c) => map.has(c)).map((c) => ({ category: c, packs: map.get(c)! }))
  }, [packs, filter])

  return (
    <div>
      <PageHeader title={t.downloads.title} subtitle={t.downloads.subtitle}>
        <Button variant="ghost" size="sm" onClick={openPacksFolder}>
          <FolderOpen size={14} /> {t.common.openFolder}
        </Button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-1.5">
        <button
          onClick={() => setFilter("all")}
          className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
            filter === "all" ? "bg-accent/20 text-white ring-1 ring-accent/30" : "bg-panel2 text-ink-dim hover:text-ink"
          }`}
        >
          {t.downloads.all}
        </button>
        {CATEGORY_ORDER.filter((c) => packs.some((p) => p.category === c)).map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`rounded-lg px-3 py-1.5 text-[12.5px] font-medium capitalize transition-colors ${
              filter === c ? "bg-accent/20 text-white ring-1 ring-accent/30" : "bg-panel2 text-ink-dim hover:text-ink"
            }`}
          >
            {catLabel(c)}
          </button>
        ))}
      </div>

      <div className="mb-4 flex items-center gap-2 text-[12.5px] text-ink-dim">
        <HardDrive size={14} className="text-ink-faint" />
        {tx(t.downloads.installedCount, { count: String(installedCount) })}
      </div>

      <div className="space-y-7">
        {groups.map(({ category, packs: group }) => {
          const Icon = CATEGORY_ICONS[category]
          return (
            <section key={category}>
              <div className="mb-3 flex items-center gap-2">
                <Icon size={16} className="text-accent2" />
                <h2 className="text-[14px] font-semibold text-ink">{catLabel(category)}</h2>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {group.map((pack) => {
                  const installed = pack.installed
                  return (
                    <Card key={pack.id} className="flex flex-col p-4">
                      <CardHeader
                        icon={<Package size={15} className="text-accent" />}
                        title={pack.name}
                        description={pack.version ? `v${pack.version}` : undefined}
                        action={
                          installed ? <Badge tone="good">{t.presets.installed}</Badge> : null
                        }
                      />
                      <CardBody className="flex flex-1 flex-col">
                        <p className="mb-3 flex-1 text-[12px] leading-relaxed text-ink-dim">{pack.description}</p>
                        <div className="mb-3 flex items-center justify-between text-[11.5px] text-ink-faint">
                          <span>{pack.files.length} files</span>
                          <span>{tx(t.presets.size, { size: String(pack.sizeMB) })}</span>
                        </div>
                        {installed ? (
                          <div className="flex items-center gap-1.5 text-[12.5px] font-medium text-good">
                            <Check size={14} />
                          </div>
                        ) : (
                          <Button size="sm" onClick={() => installPack(pack.id)}>
                            <Download size={14} /> {t.presets.installLut}
                          </Button>
                        )}
                      </CardBody>
                    </Card>
                  )
                })}
              </div>
            </section>
          )
        })}
        {groups.length === 0 && (
          <Card className="p-6 text-center text-[13px] text-ink-dim">—</Card>
        )}
      </div>
    </div>
  )
}
