import { motion } from "framer-motion"
import type { ReactNode } from "react"
import { cn } from "@/lib/cn"

export function PageHeader({ title, subtitle, icon, children }: { title: ReactNode; subtitle?: ReactNode; icon?: ReactNode; children?: ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="mb-6 flex flex-wrap items-end justify-between gap-4"
    >
      <div className="flex items-center gap-3.5">
        {icon ? (
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-line bg-panel2 text-accent">
            {icon}
          </div>
        ) : null}
        <div>
          <h1 className="font-display text-[22px] font-semibold tracking-tight text-ink">{title}</h1>
          {subtitle ? <p className={cn("mt-1 max-w-xl text-[13px] leading-relaxed text-ink-dim")}>{subtitle}</p> : null}
        </div>
      </div>
      {children ? <div className="flex items-center gap-2">{children}</div> : null}
    </motion.div>
  )
}
