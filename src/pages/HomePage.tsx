import { useNavigate } from "react-router-dom"
import { motion, type Variants } from "framer-motion"
import { ArrowRight, Film, Sparkles, SlidersHorizontal, BookOpen, Zap, Upload, FolderOpen, ExternalLink, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/Button"
import { Card } from "@/components/ui/Card"
import { Badge } from "@/components/ui/Badge"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import { formatBytes, formatDuration, interpolate } from "@/lib/format"

const container: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { staggerChildren: 0.07 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
}

export function HomePage() {
  const { t } = useI18n()
  const navigate = useNavigate()
  const { media, store } = useWorkflow()

  const steps = [
    { icon: Upload, title: t.home.steps.s1, desc: t.home.stepDescs.s1 },
    { icon: Zap, title: t.home.steps.s2, desc: t.home.stepDescs.s2 },
    { icon: Sparkles, title: t.home.steps.s3, desc: t.home.stepDescs.s3 },
    { icon: TrendingUp, title: t.home.steps.s4, desc: t.home.stepDescs.s4 },
  ]

  const features = [
    { icon: Zap, title: t.home.features.fpsTitle, desc: t.home.features.fpsDesc },
    { icon: Sparkles, title: t.home.features.blurTitle, desc: t.home.features.blurDesc },
    { icon: SlidersHorizontal, title: t.home.features.enhanceTitle, desc: t.home.features.enhanceDesc },
    { icon: BookOpen, title: t.home.features.guidesTitle, desc: t.home.features.guidesDesc },
  ]

  const recent = store?.recentExports || []

  return (
    <div>
      <motion.section variants={container} initial="hidden" animate="show" className="mb-10">
        <motion.div variants={item} className="mb-2 flex items-center gap-2 text-[13px] text-ink-dim">
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-good pulse-dot" />
          {t.home.greeting}
        </motion.div>
        <motion.h1 variants={item} className="font-display text-4xl font-semibold leading-tight tracking-tight text-ink">
          {t.home.hero}{" "}
          <span className="text-gradient">{t.home.heroAccent}</span>
        </motion.h1>
        <motion.p variants={item} className="mt-3 max-w-2xl text-[14.5px] leading-relaxed text-ink-dim">
          {t.home.subtitle}
        </motion.p>
        <motion.div variants={item} className="mt-6 flex flex-wrap items-center gap-3">
          <Button size="lg" onClick={() => navigate("/import")}>
            <Upload size={17} /> {t.home.start}
          </Button>
          {media && (
            <Button size="lg" variant="secondary" onClick={() => navigate("/fps")}>
              <Film size={16} /> {t.home.continueWork}
            </Button>
          )}
        </motion.div>
      </motion.section>

      <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mb-10">
        <motion.h2 variants={item} className="mb-4 text-lg font-semibold text-ink">
          {t.home.stepsTitle}
        </motion.h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {steps.map((s, i) => (
            <motion.div key={i} variants={item}>
              <Card hover className="relative h-full p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/12 text-accent">
                    <s.icon size={17} />
                  </div>
                  <span className="text-[11px] font-semibold text-ink-faint">0{i + 1}</span>
                </div>
                <div className="text-[14px] font-semibold text-ink">{s.title}</div>
                <p className="mt-1 text-[12px] leading-relaxed text-ink-dim">{s.desc}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      </motion.section>

      <motion.section variants={container} initial="hidden" whileInView="show" viewport={{ once: true, margin: "-60px" }} className="mb-10">
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <motion.h2 variants={item} className="mb-4 text-lg font-semibold text-ink">
              {t.home.recentTitle}
            </motion.h2>
            {recent.length === 0 ? (
              <Card className="p-5 text-[13px] text-ink-dim">{t.home.noExports}</Card>
            ) : (
              <div className="space-y-2">
                {recent.map((r, i) => (
                  <Card key={i} hover className="flex items-center justify-between gap-3 p-3.5">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-good/12 text-good">
                        <Film size={16} />
                      </div>
                      <div className="min-w-0 leading-tight">
                        <div className="truncate text-[13px] font-medium text-ink">{r.outputPath.split(/[\\/]/).pop()}</div>
                        <div className="text-[11px] text-ink-faint">
                          {formatBytes(r.outputSizeBytes)} · {r.width}×{r.height} · {formatDuration(r.encodingTimeSec)}
                        </div>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1.5">
                      <button
                        onClick={() => window.api?.revealInFolder(r.outputPath)}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition hover:bg-panel2 hover:text-ink"
                        title={t.common.openFolder}
                      >
                        <FolderOpen size={15} />
                      </button>
                      <button
                        onClick={() => window.api?.openExternal("https://www.tiktok.com/upload")}
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-dim transition hover:bg-panel2 hover:text-ink"
                        title={t.common.openFolder}
                      >
                        <ExternalLink size={15} />
                      </button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
          <div>
            <motion.h2 variants={item} className="mb-4 text-lg font-semibold text-ink">
              {t.home.featuresTitle}
            </motion.h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {features.map((f, i) => (
                <motion.div key={i} variants={item}>
                  <Card hover className="h-full p-4">
                    <div className="mb-2.5 flex h-9 w-9 items-center justify-center rounded-xl bg-accent2/10 text-accent2">
                      <f.icon size={17} />
                    </div>
                    <div className="text-[13.5px] font-semibold text-ink">{f.title}</div>
                    <p className="mt-1 text-[12px] leading-relaxed text-ink-dim">{f.desc}</p>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  )
}
