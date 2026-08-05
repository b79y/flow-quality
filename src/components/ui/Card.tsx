import { type HTMLAttributes, type ReactNode } from "react"
import { cn } from "@/lib/cn"

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  hover?: boolean
  children: ReactNode
}

export function Card({ className, hover, children, ...props }: CardProps) {
  return (
    <div
      className={cn("glass rounded-2xl", hover && "glass-hover cursor-pointer", className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({ title, description, icon, action }: { title?: ReactNode; description?: ReactNode; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3 p-5 pb-0">
      <div className="flex items-start gap-3">
        {icon ? <div className="mt-0.5 text-ink-dim">{icon}</div> : null}
        <div>
          {title ? <h3 className="text-[15px] font-semibold text-ink">{title}</h3> : null}
          {description ? <p className="mt-0.5 text-[13px] leading-relaxed text-ink-dim">{description}</p> : null}
        </div>
      </div>
      {action}
    </div>
  )
}

export function CardBody({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn("p-5", className)}>{children}</div>
}
