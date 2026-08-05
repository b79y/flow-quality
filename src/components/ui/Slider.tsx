import { useId, type ReactNode } from "react"
import { cn } from "@/lib/cn"
import { clamp } from "@/lib/format"

interface SliderProps {
  label?: ReactNode
  value: number
  onChange: (v: number) => void
  min: number
  max: number
  step?: number
  unit?: string
  display?: string
  hint?: string
  disabled?: boolean
}

export function Slider({ label, value, onChange, min, max, step = 1, unit, display, hint, disabled }: SliderProps) {
  const id = useId()
  const pct = ((clamp(value, min, max) - min) / (max - min)) * 100
  return (
    <div className={cn("space-y-2", disabled && "opacity-40")}>
      {label || display ? (
        <div className="flex items-center justify-between text-[13px]">
          <label htmlFor={id} className="text-ink-dim">
            {label}
          </label>
          <span className="font-medium tabular-nums text-ink">
            {display ?? `${value}${unit ?? ""}`}
          </span>
        </div>
      ) : null}
      <input
        id={id}
        type="range"
        className="ff-range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        style={{ ["--fill" as string]: `${pct}%` }}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      {hint ? <p className="text-xs text-ink-faint">{hint}</p> : null}
    </div>
  )
}
