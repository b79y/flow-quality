export function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return "0 MB"
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  const mb = bytes / (1024 * 1024)
  if (mb < 1024) return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`
  return `${(mb / 1024).toFixed(2)} GB`
}

export function formatDuration(sec: number): string {
  if (!sec || sec < 0) return "0:00"
  const m = Math.floor(sec / 60)
  const s = Math.floor(sec % 60)
  return `${m}:${s.toString().padStart(2, "0")}`
}

export function formatClock(sec: number): string {
  if (!sec || sec < 0) return "00:00"
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  const s = Math.floor(sec % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
}

export function formatEta(sec: number): string {
  if (!sec || sec <= 0) return "–"
  if (sec < 60) return `${Math.ceil(sec)}s`
  const m = Math.floor(sec / 60)
  const s = Math.ceil(sec % 60)
  return `${m}m ${s}s`
}

export function formatResolution(w: number, h: number): string {
  if (!w || !h) return "–"
  return `${w}×${h}`
}

export function clamp(v: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, v))
}

export function interpolate(template: string, params: Record<string, string | number>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_m, key: string) =>
    params[key] !== undefined ? String(params[key]) : "",
  )
}
