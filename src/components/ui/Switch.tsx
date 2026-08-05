import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

interface SwitchProps {
  checked: boolean
  onChange: (v: boolean) => void
  label?: ReactNode
  description?: string
  disabled?: boolean
}

export function Switch({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        "group flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-start transition-colors",
        "hover:bg-panel2 disabled:cursor-not-allowed disabled:opacity-40",
      )}
    >
      <span className="min-w-0">
        {label ? <span className="block text-sm font-medium text-ink">{label}</span> : null}
        {description ? <span className="mt-0.5 block text-xs leading-relaxed text-ink-dim">{description}</span> : null}
      </span>
      <span
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full border transition-colors duration-200",
          checked ? "border-accent/50 bg-accent" : "border-line2 bg-panel2",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-4.5 w-4.5 rounded-full bg-white shadow transition-all duration-200",
            checked ? "ltr:left-[22px] rtl:right-[22px]" : "ltr:left-0.5 rtl:right-0.5",
          )}
        />
      </span>
    </button>
  )
}
