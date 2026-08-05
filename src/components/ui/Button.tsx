import { forwardRef, type ButtonHTMLAttributes } from "react"
import { cn } from "@/lib/cn"

type Variant = "primary" | "secondary" | "ghost" | "outline" | "danger" | "subtle"
type Size = "sm" | "md" | "lg" | "icon" | "icon-sm"

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
}

const variants: Record<Variant, string> = {
  primary:
    "bg-accent text-white hover:brightness-110 shadow-glow border border-white/10",
  secondary:
    "bg-panel2 text-ink hover:bg-[rgba(255,255,255,0.12)] border border-line",
  outline: "border border-line2 text-ink hover:bg-panel2",
  ghost: "text-ink-dim hover:text-ink hover:bg-panel2",
  subtle: "text-ink-dim hover:text-ink",
  danger: "bg-bad/15 text-[#ffb3c0] border border-bad/25 hover:bg-bad/25",
}

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-xl gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-6 text-[15px] rounded-2xl gap-2",
  icon: "h-10 w-10 rounded-xl",
  "icon-sm": "h-8 w-8 rounded-lg",
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant = "primary", size = "md", loading, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        "inline-flex select-none items-center justify-center font-medium transition-all duration-150 outline-none",
        "focus-visible:ring-2 focus-visible:ring-accent/50 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
})
