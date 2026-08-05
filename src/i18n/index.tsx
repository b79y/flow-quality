import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import { en, type Translation } from "./en"
import { ar } from "./ar"

export type Lang = "en" | "ar"
export type { Translation } from "./en"

const dicts: Record<Lang, Translation> = { en, ar }

interface I18nContextValue {
  t: Translation
  lang: Lang
  dir: "ltr" | "rtl"
  setLang: (lang: Lang) => void
  tx: (template: string, params?: Record<string, string | number>) => string
}

const I18nContext = createContext<I18nContextValue | null>(null)

function applyTemplate(template: string, params?: Record<string, string | number>): string {
  if (!params) return template
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    params[key] !== undefined ? String(params[key]) : "",
  )
}

export function I18nProvider({ lang, onLangChange, children }: { lang: Lang; onLangChange: (l: Lang) => void; children: ReactNode }) {
  const [current, setCurrent] = useState<Lang>(lang)

  useEffect(() => {
    setCurrent(lang)
  }, [lang])

  const setLang = useCallback(
    (l: Lang) => {
      setCurrent(l)
      onLangChange(l)
    },
    [onLangChange],
  )

  useEffect(() => {
    const root = document.documentElement
    root.lang = current
    root.dir = current === "ar" ? "rtl" : "ltr"
    root.setAttribute("data-lang", current)
  }, [current])

  const value = useMemo<I18nContextValue>(
    () => ({
      t: dicts[current],
      lang: current,
      dir: current === "ar" ? "rtl" : "ltr",
      setLang,
      tx: applyTemplate,
    }),
    [current, setLang],
  )

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error("useI18n must be used inside I18nProvider")
  return ctx
}
