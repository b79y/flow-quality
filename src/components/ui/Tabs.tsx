import { type ReactNode } from "react"
import { cn } from "@/lib/cn"

export interface TabItem<T extends string> {
  value: T
  label: ReactNode
}

interface TabsProps<T extends string> {
  value: T
  onChange: (v: T) => void
  items: Array<TabItem<T>>
  className?: string
}

export function Tabs<T extends string>({ value, onChange, items, className }: TabsProps<T>) {
  return (
    <div className={cn("flex flex-wrap items-center gap-1 rounded-xl bg-panel2 p-1", className)}>
      {items.map((item) => (
        <button
          key={item.value}
          type="button"
          onClick={() => onChange(item.value)}
          className={cn(
            "h-8 flex-1 whitespace-nowrap rounded-lg px-3 text-[13px] font-medium transition-all",
            value === item.value
              ? "bg-accent/20 text-white shadow-sm ring-1 ring-accent/30"
              : "text-ink-dim hover:text-ink",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  )
}
