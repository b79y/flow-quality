import { Routes, Route, Navigate } from "react-router-dom"
import { I18nProvider } from "@/i18n"
import { WorkflowProvider, useWorkflow } from "@/store/WorkflowContext"
import { AppShell } from "@/components/layout/AppShell"
import { HomePage } from "@/pages/HomePage"
import { ImportPage } from "@/pages/ImportPage"
import { FpsPage } from "@/pages/FpsPage"
import { MotionBlurPage } from "@/pages/MotionBlurPage"
import { EnhancePage } from "@/pages/EnhancePage"
import { QuickQualityPage } from "@/pages/QuickQualityPage"
import { PresetsPage } from "@/pages/PresetsPage"
import { ExportGuidesPage } from "@/pages/ExportGuidesPage"
import { HelpCenterPage } from "@/pages/HelpCenterPage"
import { DownloadsPage } from "@/pages/DownloadsPage"
import { SettingsPage } from "@/pages/SettingsPage"
import { LicensePage } from "@/pages/LicensePage"

function RoutedApp() {
  const { store, setLanguage } = useWorkflow()

  return (
    <I18nProvider lang={store?.language ?? "en"} onLangChange={setLanguage}>
      <Routes>
        <Route element={<AppShell />}>
          <Route path="/" element={<Navigate to="/home" replace />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/import" element={<ImportPage />} />
          <Route path="/fps" element={<FpsPage />} />
          <Route path="/motion-blur" element={<MotionBlurPage />} />
          <Route path="/enhance" element={<EnhancePage />} />
          <Route path="/quick-quality" element={<QuickQualityPage />} />
          <Route path="/presets" element={<PresetsPage />} />
          <Route path="/export-guides" element={<ExportGuidesPage />} />
          <Route path="/help" element={<HelpCenterPage />} />
          <Route path="/downloads" element={<DownloadsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/license" element={<LicensePage />} />
          <Route path="*" element={<Navigate to="/home" replace />} />
        </Route>
      </Routes>
    </I18nProvider>
  )
}

export default function App() {
  return (
    <WorkflowProvider>
      <RoutedApp />
    </WorkflowProvider>
  )
}
