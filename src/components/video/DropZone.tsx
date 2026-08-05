import { useRef, useState, type DragEvent } from "react"
import { UploadCloud, Loader2, FolderOpen, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/cn"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"

export function DropZone() {
  const { t } = useI18n()
  const { probeFile, probing, probeError, media } = useWorkflow()
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files?.[0]
    if (!file) return
    const path = window.api?.getPathForFile(file)
    if (path) await probeFile(path)
  }

  const handleBrowse = async () => {
    if (!window.api) return
    const path = await window.api.openVideo()
    if (path) await probeFile(path)
  }

  const handlePick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const path = window.api?.getPathForFile(file)
    if (path) await probeFile(path)
    e.target.value = ""
  }

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "group relative flex cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-all duration-200",
          dragging
            ? "border-accent/70 bg-accent/10 shadow-glow"
            : "border-line2 bg-panel hover:border-accent/40 hover:bg-panel2",
        )}
      >
        <input ref={inputRef} type="file" accept="video/*,.mp4,.mov,.mkv,.webm,.avi,.m4v,.mts,.m2ts" className="hidden" onChange={handlePick} />
        {probing ? (
          <Loader2 size={30} className="mb-3 animate-spin text-accent" />
        ) : (
          <div className={cn("mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/12 text-accent transition-transform", dragging ? "scale-110" : "group-hover:scale-105")}>
            <UploadCloud size={26} />
          </div>
        )}
        <p className="text-[15px] font-semibold text-ink">{probing ? t.common.processing : t.import.dropTitle}</p>
        <p className="mt-1 max-w-sm text-[12.5px] text-ink-dim">{t.import.dropSubtitle}</p>
        <div className="mt-4 flex items-center gap-3">
          <span className="flex items-center gap-2 text-xs text-ink-faint">
            <FolderOpen size={13} /> {t.import.or}
          </span>
          <span className="rounded-lg bg-accent/15 px-3 py-1.5 text-xs font-medium text-white ring-1 ring-accent/30 transition group-hover:bg-accent/25">
            {t.common.browse}
          </span>
        </div>
      </div>
      {probeError && !media ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-bad/30 bg-bad/10 px-4 py-2.5 text-[12.5px] text-bad">
          <AlertTriangle size={14} />
          <span>{probeError}</span>
        </div>
      ) : null}
    </div>
  )
}
