import { useState } from "react"
import { Search, BookOpen, Zap, FileQuestion, Wrench, X } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card } from "@/components/ui/Card"
import { useI18n } from "@/i18n"
import { FAQS, TOOL_DOCS, QUICKSTART } from "@/lib/constants"

export function HelpCenterPage() {
  const { t } = useI18n()
  const [query, setQuery] = useState("")
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  const q = query.trim().toLowerCase()
  const filteredFaqs = FAQS.filter(
    (f) => !q || f.q.toLowerCase().includes(q) || f.a.toLowerCase().includes(q),
  )
  const filteredTools = TOOL_DOCS.filter((d) => !q || d.tool.toLowerCase().includes(q))

  return (
    <div>
      <PageHeader title={t.helpCenter.title} subtitle={t.helpCenter.subtitle} />

      <div className="relative mb-6 max-w-xl">
        <Search size={16} className="pointer-events-none absolute start-3.5 top-1/2 -translate-y-1/2 text-ink-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t.helpCenter.search}
          className="h-10 w-full rounded-xl border border-line bg-panel px-10 text-[13px] text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent/50"
        />
        {query && (
          <button
            onClick={() => setQuery("")}
            className="absolute end-3 top-1/2 -translate-y-1/2 text-ink-faint hover:text-ink"
          >
            <X size={15} />
          </button>
        )}
      </div>

      {q && filteredFaqs.length === 0 && filteredTools.length === 0 ? (
        <Card className="p-6 text-center text-[13px] text-ink-dim">
          {t.helpCenter.noResults.replace("{{query}}", query)}
        </Card>
      ) : (
        <div className="space-y-6">
          {!q && (
            <Card className="p-5">
              <div className="mb-3 flex items-center gap-2">
                <Zap size={16} className="text-accent" />
                <h3 className="text-[14px] font-semibold text-ink">{t.helpCenter.quickstart}</h3>
              </div>
              <p className="mb-3 text-[12.5px] text-ink-dim">{t.helpCenter.quickstartText}</p>
              <ol className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {QUICKSTART.map((step, i) => (
                  <li key={i} className="flex items-start gap-2 rounded-xl bg-panel p-3 text-[12.5px] leading-relaxed text-ink-dim">
                    <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent/15 text-[10px] font-bold text-accent">
                      {i + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </Card>
          )}

          <section>
            <div className="mb-3 flex items-center gap-2">
              <FileQuestion size={16} className="text-accent2" />
              <h3 className="text-[14px] font-semibold text-ink">{t.helpCenter.faqsTitle}</h3>
            </div>
            <div className="space-y-2">
              {filteredFaqs.map((faq, i) => {
                const open = openFaq === i
                return (
                  <Card key={i} className="overflow-hidden p-0">
                    <button
                      onClick={() => setOpenFaq(open ? null : i)}
                      className="flex w-full items-center justify-between gap-3 px-4 py-3 text-start"
                    >
                      <span className="text-[13.5px] font-medium text-ink">{faq.q}</span>
                      <span className={`shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}>
                        <BookOpen size={15} />
                      </span>
                    </button>
                    {open && (
                      <div className="border-t border-line bg-panel/50 px-4 py-3 text-[13px] leading-relaxed text-ink-dim">
                        {faq.a}
                      </div>
                    )}
                  </Card>
                )
              })}
            </div>
          </section>

          <section>
            <div className="mb-3 flex items-center gap-2">
              <Wrench size={16} className="text-accent" />
              <h3 className="text-[14px] font-semibold text-ink">{t.helpCenter.toolDocsTitle}</h3>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {filteredTools.map((doc) => (
                <Card key={doc.tool} className="p-5">
                  <h4 className="mb-3 text-[13.5px] font-semibold text-ink">{doc.tool}</h4>
                  <ol className="space-y-1.5">
                    {doc.steps.map((step, i) => (
                      <li key={i} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-ink-dim">
                        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-panel2 text-[10px] font-semibold text-ink-faint">
                          {i + 1}
                        </span>
                        {step}
                      </li>
                    ))}
                  </ol>
                </Card>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
