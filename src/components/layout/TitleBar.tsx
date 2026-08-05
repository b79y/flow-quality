import { Maximize2, Minus, X, Download, RefreshCw, CircleCheck } from "lucide-react"
import { useWorkflow } from "@/store/WorkflowContext"
import { useI18n } from "@/i18n"

export function TitleBar() {
  const { update, checkUpdates, installUpdate } = useWorkflow()
  const { t, tx } = useI18n()

  const updatePill = (() => {
    switch (update.status) {
      case "checking":
        return (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-dim">
            <RefreshCw size={11} className="animate-spin" /> {t.update.checking}
          </span>
        )
      case "available":
        return (
          <button
            onClick={installUpdate}
            className="flex items-center gap-1.5 rounded-full bg-accent/15 px-2.5 py-0.5 text-[11px] font-medium text-[#b9a8ff] ring-1 ring-accent/30 transition hover:bg-accent/25"
          >
            <Download size={11} /> {tx(t.update.downloading, { percent: 0 }).replace(" 0%", "")}
          </button>
        )
      case "downloading":
        return (
          <span className="flex items-center gap-1.5 text-[11px] text-ink-dim">
            <RefreshCw size={11} className="animate-spin" />
            {tx(t.update.downloading, { percent: Math.round(update.progress?.percent ?? 0) })}
          </span>
        )
      case "ready":
        return (
          <button
            onClick={installUpdate}
            className="flex items-center gap-1.5 rounded-full bg-good/15 px-2.5 py-0.5 text-[11px] font-medium text-good ring-1 ring-good/30 transition hover:bg-good/25"
          >
            <CircleCheck size={11} /> {t.update.install}
          </button>
        )
      default:
        return (
          <button
            onClick={checkUpdates}
            title={t.settings.checkUpdates}
            className="flex h-6 w-6 items-center justify-center rounded-md text-ink-faint transition hover:bg-panel2 hover:text-ink"
          >
            <RefreshCw size={12} />
          </button>
        )
    }
  })()

  return (
    <div className="drag flex h-11 shrink-0 items-center justify-between border-b border-line bg-surface/60 pe-2 ps-4 backdrop-blur-xl">
      <div className="flex items-center gap-2.5">
        <span className="font-display text-[13px] font-semibold tracking-tight text-ink">{t.app.name}</span>
        <span className="text-[11px] text-ink-faint">{t.app.version} 2.0</span>
      </div>
      <div className="no-drag flex items-center gap-3">
        {updatePill}
        <div className="flex items-center gap-0.5">
          <button
            onClick={() => window.api?.minimize()}
            className="flex h-8 w-9 items-center justify-center rounded-lg text-ink-dim transition hover:bg-panel2 hover:text-ink"
          >
            <Minus size={15} />
          </button>
          <button
            onClick={() => window.api?.maximize()}
            className="flex h-8 w-9 items-center justify-center rounded-lg text-ink-dim transition hover:bg-panel2 hover:text-ink"
          >
            <Maximize2 size={13} />
          </button>
          <button
            onClick={() => window.api?.close()}
            className="flex h-8 w-9 items-center justify-center rounded-lg text-ink-dim transition hover:bg-[#e5484d] hover:text-white"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  )
}
