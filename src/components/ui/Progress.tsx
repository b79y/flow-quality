import { cn } from "@/lib/cn"

interface ProgressProps {
  value: number
  className?: string
  tone?: "accent" | "good"
}

export function Progress({ value, className, tone = "accent" }: ProgressProps) {
  const v = Math.min(100, Math.max(0, value))
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-panel2", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-[width] duration-200 ease-out",
          tone === "accent"
            ? "bg-gradient-to-r from-[#7c5cff] via-[#22d3ee] to-[#f0abfc]"
            : "bg-good",
        )}
        style={{ width: `${v}%` }}
      />
    </div>
  )
}
