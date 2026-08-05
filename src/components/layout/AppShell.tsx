import { Outlet } from "react-router-dom"
import { AnimatePresence, motion } from "framer-motion"
import { CheckCircle2, AlertCircle, Info } from "lucide-react"
import { TitleBar } from "./TitleBar"
import { Sidebar } from "./Sidebar"
import { useWorkflow } from "@/store/WorkflowContext"

const toastIcons = {
  success: <CheckCircle2 size={16} className="text-good" />,
  error: <AlertCircle size={16} className="text-bad" />,
  info: <Info size={16} className="text-accent2" />,
}

export function AppShell() {
  const { toasts, dismissToast } = useWorkflow()

  return (
    <div className="relative flex h-screen w-screen overflow-hidden">
      <div className="bg-ambient" />
      <Sidebar />
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <TitleBar />
        <main className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1100px] px-7 py-6">
            <Outlet />
          </div>
        </main>
      </div>

      <div className="pointer-events-none fixed bottom-5 left-1/2 z-50 flex -translate-x-1/2 flex-col items-center gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.button
              key={t.id}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              onClick={() => dismissToast(t.id)}
              className="glass-strong pointer-events-auto flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-[13px] text-ink shadow-card"
            >
              {toastIcons[t.kind]}
              <span>{t.message}</span>
            </motion.button>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
