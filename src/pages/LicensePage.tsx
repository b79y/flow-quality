import { useEffect, useState } from "react"
import { ShieldCheck, KeyRound, Copy, Check, LogOut, Crown, CheckCircle2 } from "lucide-react"
import { PageHeader } from "@/components/ui/PageHeader"
import { Card, CardHeader, CardBody } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { Input } from "@/components/ui/Input"
import { Badge } from "@/components/ui/Badge"
import { useI18n } from "@/i18n"
import { useWorkflow } from "@/store/WorkflowContext"
import type { LicenseStatus } from "@shared/types"

export function LicensePage() {
  const { t } = useI18n()
  const { toast } = useWorkflow()
  const [license, setLicense] = useState<LicenseStatus | null>(null)
  const [key, setKey] = useState("")
  const [email, setEmail] = useState("")
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState(false)

  const load = () => window.api?.licenseGet().then(setLicense)
  useEffect(() => {
    load()
  }, [])

  const activate = async () => {
    setError("")
    if (!key.trim()) {
      setError(t.license.missingKey)
      return
    }
    setBusy(true)
    const res = await window.api?.licenseActivate(key.trim(), email.trim())
    setBusy(false)
    if (res?.ok) {
      toast(t.license.statusActive, "success")
      load()
    } else {
      setError(res?.error || t.license.invalidKey)
    }
  }

  const deactivate = async () => {
    await window.api?.licenseDeactivate()
    load()
  }

  const copyDevice = () => {
    if (!license) return
    navigator.clipboard?.writeText(license.deviceId)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div>
      <PageHeader title={t.license.title} subtitle={t.license.subtitle} />

      <div className="grid gap-4 lg:grid-cols-5">
        <Card className="lg:col-span-2">
          <CardHeader
            icon={<ShieldCheck size={18} className={license?.activated ? "text-good" : "text-ink-faint"} />}
            title={
              license?.activated ? (
                <span className="flex items-center gap-2">
                  {t.license.statusActive} <Badge tone="good">{t.license.planPro}</Badge>
                </span>
              ) : (
                t.license.statusFree
              )
            }
          />
          <CardBody>
            {license ? (
              <dl className="space-y-3 text-[13px]">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-dim">{t.license.plan}</dt>
                  <dd className="font-medium text-ink">{license.activated ? t.license.planPro : t.license.statusFree}</dd>
                </div>
                {license.activated && license.activatedAt ? (
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-ink-dim">{t.license.activatedOn}</dt>
                    <dd className="font-medium text-ink">{new Date(license.activatedAt).toLocaleDateString()}</dd>
                  </div>
                ) : null}
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-ink-dim">{t.license.deviceId}</dt>
                  <dd className="flex min-w-0 items-center gap-1.5">
                    <span className="truncate font-mono text-[11.5px] text-ink">{license.deviceId}</span>
                    <button onClick={copyDevice} className="text-ink-faint hover:text-ink">
                      {copied ? <Check size={13} className="text-good" /> : <Copy size={13} />}
                    </button>
                  </dd>
                </div>
              </dl>
            ) : (
              <p className="text-[12.5px] text-ink-dim">—</p>
            )}

            {license?.activated && (
              <Button size="sm" variant="danger" className="mt-5 w-full" onClick={deactivate}>
                <LogOut size={14} /> {t.license.deactivate}
              </Button>
            )}

            <p className="mt-4 text-[11.5px] leading-relaxed text-ink-faint">{t.license.terms}</p>
          </CardBody>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader icon={<KeyRound size={18} className="text-accent" />} title={t.license.enterKey} />
          <CardBody>
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-[12.5px] text-ink-dim">{t.license.keyLabel}</label>
                <Input
                  value={key}
                  onChange={(e) => setKey(e.target.value)}
                  placeholder={t.license.keyPlaceholder}
                  dir="ltr"
                  spellCheck={false}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[12.5px] text-ink-dim">{t.license.emailLabel}</label>
                <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" dir="ltr" />
              </div>
              {error && <p className="text-[12.5px] text-[#ff6b6b]">{error}</p>}
              <Button loading={busy} onClick={activate}>
                <Crown size={15} /> {t.license.activate}
              </Button>
            </div>
          </CardBody>
        </Card>
      </div>

      <Card className="mt-4">
        <CardHeader icon={<CheckCircle2 size={16} className="text-good" />} title={t.license.viewFeatures} />
        <CardBody>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {(t.license.features as unknown as string[]).map((f) => (
              <li key={f} className="flex items-center gap-2 rounded-lg bg-panel px-3 py-2 text-[12.5px] text-ink-dim">
                <Check size={13} className="shrink-0 text-good" />
                {f}
              </li>
            ))}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}
