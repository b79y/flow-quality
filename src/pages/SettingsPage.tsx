import { useEffect, useState } from "react"
import { Folder, Globe, MonitorSmartphone, Cpu, RefreshCw, Info, RotateCcw, CheckCircle2, XCircle } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Select } from "@/components/ui/Select"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { cn } from "@/lib/cn"
import type { FfmpegStatus, Language, Theme } from "@shared/types"

export function SettingsPage() {
  const { t, lang, setLang } = useI18n()
  const { store, setTheme, checkUpdates, update, toast, setPlatform, setLevel } = useWorkflow()
  const [ffmpeg, setFfmpeg] = useState<FfmpegStatus | null>(null)
  const [version, setVersion] = useState("")

  useEffect(() => {
    window.api?.ffmpegStatus().then(setFfmpeg)
    window.api?.appInfo().then((i) => setVersion(i.version))
  }, [])

  const saveStore = <K extends keyof NonNullable<typeof store>>(key: K, value: NonNullable<typeof store>[K]) => {
    window.api?.storeSet(key, value as never)
  }

  const pickFolder = async () => {
    const dir = await window.api?.pickOutputFolder()
    if (dir) {
      saveStore("outputDir", dir)
      toast(dir, "success")
    }
  }

  const resetApp = async () => {
    await window.api?.storeReset()
    window.location.reload()
  }

  const themes: Array<{ key: Theme; label: string; c1: string; c2: string; c3: string; dark: boolean }> = [
    { key: "dark", label: t.settings.dark, c1: "#7c5cff", c2: "#22d3ee", c3: "#f0abfc", dark: true },
    { key: "bluered", label: t.settings.themeBluered, c1: "#3b82f6", c2: "#ef4444", c3: "#f97316", dark: true },
    { key: "redgraphite", label: t.settings.themeRedgraphite, c1: "#ef4444", c2: "#94a3b8", c3: "#f97316", dark: true },
    { key: "bluegraphite", label: t.settings.themeBluegraphite, c1: "#38bdf8", c2: "#64748b", c3: "#818cf8", dark: true },
    { key: "blueblack", label: t.settings.themeBlueblack, c1: "#2563eb", c2: "#38bdf8", c3: "#22d3ee", dark: true },
    { key: "light", label: t.settings.light, c1: "#7c5cff", c2: "#22d3ee", c3: "#f0abfc", dark: false },
  ]
  const langButtons: Array<{ key: Language; label: string }> = [
    { key: "en", label: "English" },
    { key: "ar", label: "العربية" },
  ]

  return (
    <div>
      <PageHeader title={t.settings.title} subtitle={t.settings.subtitle} />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader icon={<Globe size={16} className="text-accent" />} title={t.settings.language} description={t.settings.languageDesc} />
          <CardBody>
            <div className="flex gap-2">
              {langButtons.map((b) => (
                <button
                  key={b.key}
                  onClick={() => setLang(b.key)}
                  className={cn(
                    "flex-1 rounded-lg border px-3 py-2 text-[13px] font-medium transition-colors",
                    lang === b.key
                      ? "border-accent/50 bg-accent/15 text-white"
                      : "border-line bg-panel text-ink-dim hover:text-ink",
                  )}
                >
                  {b.label}
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<MonitorSmartphone size={16} className="text-accent" />} title={t.settings.theme} description={t.settings.themeDesc} />
          <CardBody>
            <div className="grid grid-cols-3 gap-2">
              {themes.map((b) => (
                <button
                  key={b.key}
                  onClick={() => {
                    setTheme(b.key)
                    saveStore("theme", b.key)
                  }}
                  className={cn(
                    "flex flex-col items-center gap-2 rounded-xl border p-3 transition-colors",
                    store?.theme === b.key
                      ? "border-accent/60 bg-accent/10"
                      : "border-line bg-panel hover:border-accent/40 hover:bg-panel2",
                  )}
                >
                  <span className="flex h-8 w-full items-center justify-center gap-1.5 rounded-lg border border-line2/40 p-1.5" style={{ background: b.dark ? "#0b0d14" : "#eef0f7" }}>
                    <span className="h-5 w-5 rounded-md" style={{ background: `linear-gradient(135deg, ${b.c1}, ${b.c2})` }} />
                    <span className="h-5 w-5 rounded-md" style={{ background: `linear-gradient(135deg, ${b.c2}, ${b.c3})` }} />
                  </span>
                  <span className="text-[11.5px] font-medium text-ink">{b.label}</span>
                </button>
              ))}
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Folder size={16} className="text-accent" />} title={t.settings.outputDir} description={t.settings.outputDirDesc} />
          <CardBody>
            <div className="flex items-center gap-2">
              <div className="min-w-0 flex-1 truncate rounded-lg border border-line bg-panel px-3 py-2 text-[12.5px] text-ink-dim">
                {store?.outputDir || ""}
              </div>
              <Button size="sm" variant="outline" onClick={pickFolder}>
                <Folder size={14} />
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Cpu size={16} className="text-accent" />} title={t.settings.engine} description={t.settings.engineDesc} />
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                {ffmpeg?.available ? (
                  <CheckCircle2 size={16} className="text-good" />
                ) : (
                  <XCircle size={16} className="text-warn" />
                )}
                <span className="text-[13px] font-medium text-ink">
                  {ffmpeg?.available ? t.settings.ffmpegOk : t.settings.ffmpegMissing}
                </span>
              </div>
              <span className="text-[11.5px] text-ink-faint">{ffmpeg?.ffmpegVersion || ""}</span>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<RefreshCw size={16} className="text-accent" />} title={t.settings.updates} description={t.settings.updatesDesc} />
          <CardBody>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[12.5px] text-ink-dim capitalize">
                {update.status === "available" && update.availableVersion
                  ? `v${update.availableVersion}`
                  : update.status === "ready"
                    ? `v${update.downloadedVersion}`
                    : "—"}
              </span>
              <Button size="sm" variant="outline" onClick={checkUpdates}>
                <RefreshCw size={14} /> {t.settings.checkUpdates}
              </Button>
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader icon={<Info size={16} className="text-accent" />} title={t.settings.about} />
          <CardBody>
            <div className="flex items-center justify-between text-[12.5px] text-ink-dim">
              <span>FLOW Quality</span>
              <span className="font-medium text-ink">v{version || "2.0.0"}</span>
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title={t.settings.defaultPlatform} description={t.settings.defaultPlatformDesc} />
          <CardBody>
            <Select
              value={store?.defaultPlatform ?? "tiktok"}
              onChange={(v) => {
                setPlatform(v as never)
                saveStore("defaultPlatform", v as never)
              }}
              options={["tiktok", "shorts", "reels"].map((p) => ({ value: p, label: p }))}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title={t.settings.defaultMode} description={t.settings.defaultModeDesc} />
          <CardBody>
            <Select
              value={store?.defaultMode ?? "safe"}
              onChange={(v) => {
                setLevel(v as never)
                saveStore("defaultMode", v as never)
              }}
              options={["turbo", "safe", "studio"].map((m) => ({ value: m, label: m }))}
            />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4 border-warn/30">
        <CardBody>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-[13.5px] font-semibold text-ink">{t.settings.resetApp}</p>
              <p className="mt-0.5 text-[12px] text-ink-dim">{t.settings.resetAppDesc}</p>
            </div>
            <Button size="sm" variant="danger" onClick={resetApp}>
              <RotateCcw size={14} /> {t.settings.resetApp}
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  )
}
