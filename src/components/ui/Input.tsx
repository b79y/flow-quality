import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/cn"

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  icon?: ReactNode
  rightSlot?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, icon, rightSlot, ...props }, ref) {
  return (
    <div className="relative">
      {icon ? <span className="pointer-events-none absolute top-1/2 -translate-y-1/2 text-ink-faint ltr:left-3 rtl:right-3">{icon}</span> : null}
      <input
        ref={ref}
        className={cn(
          "h-10 w-full rounded-xl border border-line bg-panel2 px-3 text-sm text-ink outline-none transition-colors",
          "placeholder:text-ink-faint hover:border-line2 focus:border-accent/50",
          icon && "ltr:pl-9 rtl:pr-9",
          rightSlot && "ltr:pr-20 rtl:pl-20",
          className,
        )}
        {...props}
      />
      {rightSlot ? <span className="absolute top-1/2 -translate-y-1/2 ltr:right-2 rtl:left-2">{rightSlot}</span> : null}
    </div>
  )
})
