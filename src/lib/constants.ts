import type {
  EnhanceOptions,
  FpsMode,
  FpsOptions,
  MediaInfo,
  MotionBlurOptions,
  OutputProfile,
  Platform,
  BlurPreset,
} from "@shared/types"

export const PLATFORMS: Platform[] = ["tiktok", "shorts", "reels", "generic"]

export interface ModeMeta {
  key: FpsMode
  speed: number // 0-10
  quality: number // 0-10
  accent: string
  recommended?: boolean
}

export const MODE_META: Record<FpsMode, ModeMeta> = {
  turbo: { key: "turbo", speed: 9.5, quality: 6, accent: "#22d3ee" },
  safe: { key: "safe", speed: 6, quality: 8, accent: "#7c5cff", recommended: true },
  studio: { key: "studio", speed: 2.5, quality: 9.5, accent: "#f0abfc" },
}

export const MODE_LIST: FpsMode[] = ["turbo", "safe", "studio"]

export interface BlurPresetMeta {
  key: BlurPreset
  intensity: number
  trailLength: number
  samples: number
  direction: "auto" | "horizontal" | "vertical" | "radial"
  smartSpeed: boolean
}

export const BLUR_PRESETS: Record<BlurPreset, BlurPresetMeta> = {
  cinematic: { key: "cinematic", intensity: 4, trailLength: 4, samples: 6, direction: "auto", smartSpeed: true },
  light: { key: "light", intensity: 2, trailLength: 2, samples: 3, direction: "auto", smartSpeed: true },
  strong: { key: "strong", intensity: 8, trailLength: 7, samples: 10, direction: "auto", smartSpeed: true },
  custom: { key: "custom", intensity: 6, trailLength: 5, samples: 8, direction: "horizontal", smartSpeed: true },
}

export const DEFAULT_FPS: FpsOptions = {
  enabled: true,
  targetFps: 60,
  mode: "safe",
  keepOriginal: true,
  technique: "auto",
}

export const DEFAULT_BLUR: MotionBlurOptions = {
  enabled: true,
  preset: "cinematic",
  intensity: 4,
  trailLength: 4,
  samples: 6,
  direction: "auto",
  smartSpeed: true,
}

export const DEFAULT_ENHANCE: EnhanceOptions = {
  denoise: 0,
  deblock: 0,
  sharpen: 0,
  contrast: 0,
  saturation: 0,
  vibrance: 0,
  nightNoise: false,
  textClarity: false,
  repairCompression: false,
  lut: "",
  ai: false,
  aiStrength: 60,
  aiUpscale: 1,
  aiReal: false,
  aiModel: "animevideo",
}

/** "1080p+ AUTO" profile: adapts resolution to the source, ~50MB target size. */
export function buildProfile(platform: Platform, source: MediaInfo | null): OutputProfile {
  const portrait = source ? source.height >= source.width : true
  const square = source ? Math.abs(source.width - source.height) < 80 : false
  let width = 1080
  let height = 1920
  if (source) {
    if (square) {
      width = 1080
      height = 1080
    } else if (!portrait) {
      width = 1920
      height = 1080
    }
  }
  return {
    name: "1080p+ AUTO",
    platform,
    width,
    height,
    fps: 60,
    codec: "h264",
    crf: 18,
    x264Preset: "slow",
    audioBitrate: "128k",
    maxSizeMB: 50,
  }
}

export interface SourceAnalysis {
  needsInterp: boolean
  keepOriginal: boolean
  engine: "motion" | "optical" | "blend" | "duplicate"
  reason: "blendRec" | "opticalRec" | "dupeRec"
}

export function analyzeSource(fps: number): SourceAnalysis {
  if (fps >= 58 && fps <= 62) {
    return { needsInterp: false, keepOriginal: true, engine: "duplicate", reason: "dupeRec" }
  }
  if (fps >= 45) {
    return { needsInterp: true, keepOriginal: false, engine: "duplicate", reason: "dupeRec" }
  }
  if (fps > 30) {
    return { needsInterp: true, keepOriginal: false, engine: "motion", reason: "blendRec" }
  }
  return { needsInterp: true, keepOriginal: false, engine: "optical", reason: "opticalRec" }
}

export const TECHNIQUE_ENGINE_LABEL: Record<"motion" | "optical" | "blend" | "duplicate", string> = {
  motion: "motion",
  optical: "optical",
  blend: "blend",
  duplicate: "duplicate",
}

// ----------------------------------------------------------------- guides
export interface GuideSetting {
  label: "resolution" | "fps" | "bitrate" | "codec" | "format" | "colorspace" | "audio" | "note"
  value: string
}

export interface GuideApp {
  id: string
  name: string
  description: string
  icon: string
  settings: GuideSetting[]
  platforms: {
    tiktok: string
    shorts: string
    reels: string
  }
  steps: string[]
}

export const EXPORT_GUIDES: GuideApp[] = [
  {
    id: "premiere",
    name: "Premiere Pro",
    description: "Best H.264 / H.265 export settings",
    icon: "film",
    settings: [
      { label: "resolution", value: "1080×1920 (9:16) · 1920×1080 (16:9)" },
      { label: "fps", value: "60 FPS" },
      { label: "bitrate", value: "8–12 Mbps VBR 2-pass" },
      { label: "codec", value: "H.264 · High profile" },
      { label: "format", value: "MP4 (.mp4)" },
      { label: "audio", value: "AAC 128–192 kbps · 48kHz" },
      { label: "note", value: "Match Sequence -> check 'Use Maximum Render Quality'." },
    ],
    platforms: {
      tiktok: "1080×1920 · 60fps · 8 Mbps · H.264",
      shorts: "1080×1920 · 60fps · 10 Mbps · H.264",
      reels: "1080×1920 · 60fps · 7 Mbps · H.264",
    },
    steps: [
      "File → Export → Media",
      "Format: H.264 · Preset: YouTube 1080p Full HD",
      "Video: 60 FPS, bitrate 8-12 Mbps, High profile",
      "Audio: AAC 192 kbps, 48kHz",
      "Check 'Use Maximum Render Quality' and export",
    ],
  },
  {
    id: "ae",
    name: "After Effects",
    description: "Render settings that keep motion smooth",
    icon: "layers",
    settings: [
      { label: "resolution", value: "1080×1920 · 1920×1080" },
      { label: "fps", value: "60 FPS (enable Motion Blur)" },
      { label: "bitrate", value: "8–12 Mbps VBR" },
      { label: "codec", value: "H.264 (Media Encoder)" },
      { label: "format", value: "MP4" },
      { label: "audio", value: "AAC 128 kbps" },
      { label: "note", value: "Pre-render heavy comps, then encode once." },
    ],
    platforms: {
      tiktok: "1080×1920 · 60fps · 8 Mbps",
      shorts: "1080×1920 · 60fps · 10 Mbps",
      reels: "1080×1920 · 60fps · 7 Mbps",
    },
    steps: [
      "Add to Render Queue → Output Module",
      "Format: H.264 · Channels: RGB",
      "Import into Adobe Media Encoder",
      "Set 60 FPS, 8-12 Mbps, High profile",
      "Render and inspect before upload",
    ],
  },
  {
    id: "resolve",
    name: "DaVinci Resolve",
    description: "Studio-grade delivery presets",
    icon: "wand",
    settings: [
      { label: "resolution", value: "1080×1920 · 1920×1080" },
      { label: "fps", value: "60 FPS" },
      { label: "bitrate", value: "8–12 Mbps" },
      { label: "codec", value: "H.264 · High profile" },
      { label: "format", value: "MP4" },
      { label: "colorspace", value: "Rec.709 · Output: Auto" },
      { label: "audio", value: "AAC 128 kbps" },
    ],
    platforms: {
      tiktok: "1080×1920 · 60fps · 8 Mbps",
      shorts: "1080×1920 · 60fps · 10 Mbps",
      reels: "1080×1920 · 60fps · 7 Mbps",
    },
    steps: [
      "Deliver page → Add to Render Queue",
      "Choose H.264 Master preset",
      "Resolution 1080×1920, 60 FPS",
      "Rate control: VBR · 8-12 Mbps",
      "Render and verify on phone",
    ],
  },
  {
    id: "capcut",
    name: "CapCut",
    description: "Export settings for your phone editor",
    icon: "smartphone",
    settings: [
      { label: "resolution", value: "1080p (9:16)" },
      { label: "fps", value: "60 FPS" },
      { label: "bitrate", value: "High / 60+ Mbps (best quality)" },
      { label: "codec", value: "H.264" },
      { label: "format", value: "MP4" },
      { label: "note", value: "CapCut re-encodes on export, start sharp." },
    ],
    platforms: {
      tiktok: "1080p · 60fps · High bitrate",
      shorts: "1080p · 60fps · High bitrate",
      reels: "1080p · 60fps · High bitrate",
    },
    steps: [
      "Export → 1080p",
      "Frame rate 60 FPS",
      "Bitrate: Highest (60+ Mbps)",
      "Save to device → upload",
    ],
  },
  {
    id: "obs",
    name: "OBS",
    description: "Record crisp clips with minimal file size",
    icon: "monitor",
    settings: [
      { label: "resolution", value: "1080×1920 (vertical) · 1080p base" },
      { label: "fps", value: "60 FPS" },
      { label: "bitrate", value: "9000–12000 Kbps CBR" },
      { label: "codec", value: "H.264 (x264 / NVENC / AMF)" },
      { label: "format", value: "MP4 or MKV (auto-remux)" },
      { label: "note", value: "Use NVENC/AMF on modern GPUs for zero CPU impact." },
    ],
    platforms: {
      tiktok: "1080×1920 · 60fps · 10 Mbps",
      shorts: "1080×1920 · 60fps · 10 Mbps",
      reels: "1080×1920 · 60fps · 9 Mbps",
    },
    steps: [
      "Settings → Output → Recording",
      "Encoder: NVENC/AMF/x264 · Rate control: CBR",
      "Bitrate 9000-12000 Kbps, 60 FPS",
      "Base/Output canvas 1080×1920 for vertical",
      "Remux MKV to MP4 after recording",
    ],
  },
  {
    id: "topaz",
    name: "Topaz Video AI",
    description: "Upscale and restore before optimizing",
    icon: "crystal",
    settings: [
      { label: "resolution", value: "1080p → export at 4:4:4 then grade" },
      { label: "fps", value: "Interpolate to 60 FPS (Chronos/Apollo)" },
      { label: "bitrate", value: "8–12 Mbps H.264 after upscale" },
      { label: "codec", value: "H.264 / ProRes for intermediate" },
      { label: "format", value: "MP4 for final" },
      { label: "note", value: "Upscale once, then run FLOW Quality's optimize pass." },
    ],
    platforms: {
      tiktok: "1080×1920 · 60fps · 8 Mbps",
      shorts: "1080×1920 · 60fps · 10 Mbps",
      reels: "1080×1920 · 60fps · 7 Mbps",
    },
    steps: [
      "Import clip → choose AI model",
      "Export at 4:4:4 / ProRes for max detail",
      "Feed the result into FLOW Quality",
      "Choose 60 FPS + Enhance, export at 1080p",
    ],
  },
]

// ----------------------------------------------------------------- help
export interface Faq {
  q: string
  a: string
}

export const FAQS: Faq[] = [
  {
    q: "Is my video uploaded anywhere?",
    a: "No. Everything runs locally on your machine using the bundled FFmpeg engine. Your clips never leave your device.",
  },
  {
    q: "What does '1080p+ AUTO' mean?",
    a: "It's the recommended starting profile. It keeps 1080p or higher, encodes with high quality H.264 and targets around 50MB — a great size for TikTok, Shorts and Reels. Final size still depends on your clip's motion and detail.",
  },
  {
    q: "Which 60 FPS level should I pick?",
    a: "Turbo for drafts, Safe for most projects and Studio (optical flow) for the clips that matter most. Studio is slower but produces the smoothest motion.",
  },
  {
    q: "Will the platform re-compress my video?",
      a: "Yes — TikTok, Shorts and Reels always re-encode. FLOW Quality prepares the best possible source file so that second compression stays clean.",
  },
  {
    q: "Does Motion Blur slow down my export a lot?",
    a: "It adds some processing time. The stronger the preset and the higher the source frame rate, the longer it takes. Light is nearly free.",
  },
  {
    q: "Can I cancel an export?",
    a: "Yes. The cancel button stops the encode and deletes the partial file.",
  },
]

export interface ToolDoc {
  tool: string
  steps: string[]
}

export const TOOL_DOCS: ToolDoc[] = [
  {
    tool: "60 FPS",
    steps: [
      "Import a video",
      "Pick Turbo, Safe or Studio",
      "Check the smart analysis suggestion",
      "Export — interpolation happens in the encode pass",
    ],
  },
  {
    tool: "Motion Blur",
    steps: [
      "Enable Motion Blur",
      "Choose a preset or tune Custom",
      "Higher samples = smoother, slower",
      "Smart motion-aware blur keeps static shots crisp",
    ],
  },
  {
    tool: "Enhance",
    steps: [
      "Drag sliders to taste — live approximation updates in the preview",
      "Night noise for low-light clips",
      "Text clarity for captions and UI overlays",
      "Everything is applied in one export pass",
    ],
  },
  {
    tool: "Presets & LUTs",
    steps: [
      "Open the LUT library",
      "Install a pack in Downloads",
      "Apply the look in the Enhance section before export",
      "LUTs are baked into the output file",
    ],
  },
]

export const QUICKSTART: string[] = [
  "Drag your clip into Import",
  "Choose the platform and 60 FPS level",
  "Tune Motion Blur and Enhance if you like",
  "Export and publish the finished file",
]
