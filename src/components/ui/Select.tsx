import { useId, type ReactNode } from "react"
import { ChevronDown } from "lucide-react"
import { cn } from "@/lib/cn"

interface SelectProps<T extends string> {
  value: T
  onChange: (v: T) => void
  options: Array<{ value: T; label: ReactNode }>
  disabled?: boolean
  className?: string
}

export function Select<T extends string>({ value, onChange, options, disabled, className }: SelectProps<T>) {
  const id = useId()
  return (
    <div className={cn("relative", className)}>
      <select
        id={id}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value as T)}
        className={cn(
          "h-10 w-full cursor-pointer appearance-none rounded-xl border border-line bg-panel2 px-3 pe-9 text-sm text-ink outline-none",
          "transition-colors hover:border-line2 focus:border-accent/50 disabled:cursor-not-allowed disabled:opacity-40",
        )}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-surface text-ink">
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-dim ltr:right-3 rtl:left-3" size={15} />
    </div>
  )
}
