import { motion } from "framer-motion"
import { Zap, ShieldCheck, Gem, Check } from "lucide-react"
import { cn } from "@/lib/cn"
import { useI18n } from "@/i18n"
import { MODE_LIST, MODE_META } from "@/lib/constants"
import type { FpsMode } from "@shared/types"

const ICONS: Record<FpsMode, typeof Zap> = {
  turbo: Zap,
  safe: ShieldCheck,
  studio: Gem,
}

export function LevelCards({ value, onChange, disabled }: { value: FpsMode; onChange: (m: FpsMode) => void; disabled?: boolean }) {
  const { t } = useI18n()
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {MODE_LIST.map((mode) => {
        const meta = MODE_META[mode]
        const Icon = ICONS[mode]
        const name = (t.fps as unknown as Record<string, { name: string; desc: string; tag: string }>)[mode]
        const selected = value === mode
        return (
          <motion.button
            key={mode}
            type="button"
            disabled={disabled}
            whileHover={disabled ? undefined : { y: -3 }}
            whileTap={disabled ? undefined : { scale: 0.98 }}
            onClick={() => onChange(mode)}
            className={cn(
              "relative flex flex-col items-start gap-3 rounded-2xl border p-4 text-start transition-colors",
              selected ? "border-accent/60 bg-accent/10 shadow-glow" : "glass glass-hover",
              disabled && "cursor-not-allowed opacity-50",
            )}
          >
            {selected && (
              <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-accent text-white">
                <Check size={12} strokeWidth={3} />
              </span>
            )}
            <div
              className="flex h-10 w-10 items-center justify-center rounded-xl"
              style={{ background: `${meta.accent}1f`, color: meta.accent }}
            >
              <Icon size={19} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[15px] font-semibold text-ink">{name.name}</span>
                {meta.recommended && (
                  <span className="rounded-full bg-good/15 px-2 py-0.5 text-[10px] font-medium text-good ring-1 ring-good/30">
                    {t.fps.safe.tag}
                  </span>
                )}
              </div>
              <p className="mt-1 text-[12px] leading-relaxed text-ink-dim">{name.desc}</p>
              <span className="mt-1.5 inline-block rounded-full bg-panel2 px-2 py-0.5 text-[10.5px] text-ink-faint">{name.tag}</span>
            </div>
            <div className="mt-auto w-full space-y-2 pt-1">
              <div className="flex items-center justify-between text-[10.5px] text-ink-faint">
                <span>{t.fps.speedLabel}</span>
                <span className="font-medium" style={{ color: meta.accent }}>
                  {meta.speed}/10
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
                <div className="h-full rounded-full" style={{ width: `${meta.speed * 10}%`, background: meta.accent }} />
              </div>
              <div className="flex items-center justify-between text-[10.5px] text-ink-faint">
                <span>{t.fps.qualityLabel}</span>
                <span className="font-medium" style={{ color: meta.accent }}>
                  {meta.quality}/10
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-panel2">
                <div className="h-full rounded-full" style={{ width: `${meta.quality * 10}%`, background: meta.accent }} />
              </div>
            </div>
          </motion.button>
        )
      })}
    </div>
  )
}
