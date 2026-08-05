import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}

export function EmptyState({ icon, title, subtitle, action }: EmptyStateProps) {
  return (
    <motion.div
      className="glass flex flex-col items-center justify-center rounded-3xl px-8 py-14 text-center"
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-accent/25 to-accent2/25 text-accent2">
        {icon}
      </div>
      <h3 className="text-lg font-bold text-ink">{title}</h3>
      {subtitle && <p className="mt-1.5 max-w-sm text-[13px] text-ink-dim">{subtitle}</p>}
      {action && <div className="mt-5">{action}</div>}
    </motion.div>
  );
}
