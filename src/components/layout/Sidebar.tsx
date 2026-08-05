import { NavLink } from "react-router-dom"
import { motion } from "framer-motion"
import {
  Home,
  Upload,
  Zap,
  Sparkles,
  SlidersHorizontal,
  Palette,
  BookOpen,
  HelpCircle,
  Download,
  Settings,
  KeyRound,
  Cpu,
  BadgeCheck,
  Wand2,
} from "lucide-react"
import { useI18n, type Translation } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { cn } from "@/lib/cn"

interface NavItem {
  to: string
  key: keyof Translation["nav"]
  icon: typeof Home
  end?: boolean
}

const NAV: NavItem[] = [
  { to: "/home", key: "home", icon: Home, end: true },
  { to: "/import", key: "import", icon: Upload },
  { to: "/fps", key: "fps", icon: Zap },
  { to: "/motion-blur", key: "motionBlur", icon: Sparkles },
  { to: "/enhance", key: "enhance", icon: SlidersHorizontal },
  { to: "/quick-quality", key: "quickQuality", icon: Wand2 },
  { to: "/presets", key: "presets", icon: Palette },
  { to: "/export-guides", key: "exportGuides", icon: BookOpen },
  { to: "/help", key: "helpCenter", icon: HelpCircle },
  { to: "/downloads", key: "downloads", icon: Download },
  { to: "/settings", key: "settings", icon: Settings },
  { to: "/license", key: "license", icon: KeyRound },
]

export function Sidebar() {
  const { t, lang } = useI18n()
  const { store, update } = useWorkflow()
  const isAr = lang === "ar"

  return (
    <aside className="flex h-full w-[218px] shrink-0 flex-col border-e border-line bg-surface/40">
      <div className="flex items-center gap-2.5 px-5 pb-2 pt-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--color-accent)] via-[var(--color-accent2)] to-[var(--color-accent3)] shadow-glow">
          <Zap size={17} className="text-white" />
        </div>
        <div className="leading-tight">
          <div className="font-display text-[13px] font-bold tracking-tight text-ink">FLOW Quality</div>
          <div className="text-[10px] text-ink-faint">{t.app.tagline}</div>
        </div>
      </div>

      <nav className="mt-3 flex-1 space-y-0.5 overflow-y-auto px-2.5">
        {NAV.map((item) => {
          const Icon = item.icon
          const label = t.nav[item.key]
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                cn(
                  "group relative flex h-9 items-center gap-2.5 rounded-xl px-3 text-[13px] font-medium transition-colors",
                  isActive ? "text-white" : "text-ink-dim hover:bg-panel2 hover:text-ink",
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <motion.span
                      layoutId="nav-active"
                      className="absolute inset-0 rounded-xl bg-accent/15 ring-1 ring-accent/30"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <Icon size={16} className={cn("relative z-10", isActive ? "text-accent" : "")} />
                  <span className="relative z-10">{label}</span>
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      <div className="space-y-2 p-3">
        <div className="glass flex items-center gap-2.5 rounded-xl p-3">
          <Cpu size={15} className="shrink-0 text-ink-dim" />
          <div className="min-w-0 leading-tight">
            <div className="flex items-center gap-1.5 text-[11px] font-medium text-ink">
              {store?.license?.activated ? t.license.statusActive : t.license.statusFree}
              {store?.license?.activated && <BadgeCheck size={12} className="text-good" />}
            </div>
            <div className="text-[10px] text-ink-faint">
              {update.status === "ready" ? t.update.ready : "FFmpeg · local"}
            </div>
          </div>
        </div>
        <div className="px-1 text-center text-[10px] leading-relaxed text-ink-faint">
          {isAr ? "كل شيء يعمل محليًا على جهازك" : "Everything runs locally on your device"}
        </div>
      </div>
    </aside>
  )
}
