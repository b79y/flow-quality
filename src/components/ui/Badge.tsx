import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

type Tone = "default" | "accent" | "good" | "warn" | "bad" | "cyan"

const tones: Record<Tone, string> = {
  default: "bg-panel2 text-ink-dim border-line",
  accent: "bg-accent/12 text-[#b9a8ff] border-accent/30",
  good: "bg-good/12 text-good border-good/30",
  warn: "bg-warn/12 text-warn border-warn/30",
  bad: "bg-bad/12 text-bad border-bad/30",
  cyan: "bg-accent2/12 text-accent2 border-accent2/30",
}

export function Badge({ children, tone = "default", className }: { children: ReactNode; tone?: Tone; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[11px] font-medium", tones[tone], className)}>
      {children}
    </span>
  )
}
