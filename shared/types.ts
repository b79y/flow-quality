/** Shared types used by main, preload and renderer. */

export type Language = "en" | "ar";
export type Theme = "dark" | "light" | "bluered" | "redgraphite" | "bluegraphite" | "blueblack";
export type Platform = "tiktok" | "shorts" | "reels" | "generic";
export type FpsMode = "turbo" | "safe" | "studio";
export type InterpTechnique = "auto" | "duplicate" | "blend" | "motion" | "optical";
export type BlurDirection = "auto" | "horizontal" | "vertical" | "radial";
export type BlurPreset = "cinematic" | "light" | "strong" | "custom";
export type VideoCodec = "h264" | "hevc";

export interface MediaInfo {
  path: string;
  name: string;
  sizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  audioCodec: string;
  bitrateKbps: number;
  vframes: number;
}

export interface OutputProfile {
  name: string;
  platform: Platform;
  width: number;
  height: number;
  fps: number;
  codec: VideoCodec;
  crf: number;
  x264Preset: string;
  audioBitrate: string;
  maxSizeMB: number;
}

export interface FpsOptions {
  enabled: boolean;
  targetFps: number;
  mode: FpsMode;
  keepOriginal: boolean;
  technique: InterpTechnique;
}

export interface MotionBlurOptions {
  enabled: boolean;
  preset: BlurPreset;
  intensity: number; // 0-10
  trailLength: number; // 1-10
  samples: number; // 2-16
  direction: BlurDirection;
  smartSpeed: boolean;
}

export interface EnhanceOptions {
  denoise: number; // 0-100
  deblock: number; // 0-100
  sharpen: number; // 0-100
  contrast: number; // -100..100
  saturation: number; // -100..100
  vibrance: number; // 0-100
  nightNoise: boolean;
  textClarity: boolean;
  repairCompression: boolean;
  lut: string; // absolute path to a .cube LUT, "" = none
  ai: boolean; // AI Enhance master toggle
  aiStrength: number; // 0-100
  aiUpscale: 1 | 1.5 | 2; // resolution upscale factor
  aiReal: boolean; // use the Real-ESRGAN neural model (Vulkan GPU) instead of CPU filters
  aiModel: "animevideo" | "x4plus"; // which bundled neural model to run
}

export type PreviewStage = "original" | "fps" | "blur" | "enhance" | "final";

/** One-click "fastest quality" mode: 60 FPS + sharpen + HEVC hvc1 encode. */
export type HevcEncoder = "auto" | "nvenc" | "amf" | "qsv" | "mf" | "libx265";

/** Hardware vendor detected by a live encode probe (used for the regular export path). */
export type GpuEncoder = "nvenc" | "amf" | "qsv" | "mf";

export interface QuickQualityOptions {
  bitrateMbps: number; // 10
  sharpenAmount: number; // 0.4 (unsharp amount)
  fps60: boolean;
  encoder: HevcEncoder;
}

export interface JobSpec {
  inputPath: string;
  outputPath: string;
  profile: OutputProfile;
  fps?: FpsOptions;
  motionBlur?: MotionBlurOptions;
  enhance?: EnhanceOptions;
  quick?: QuickQualityOptions;
  /** Set by the main process: use this hardware encoder for the regular pipeline. */
  gpuEncoder?: GpuEncoder;
}

export interface ExportProgress {
  percent: number;
  timeSec: number;
  durationSec: number;
  etaSec: number;
  speedX: number;
  fps: number;
  sizeBytes: number;
  frame: number;
  totalFrames: number;
  active: boolean;
  phase?: "render" | "ai" | "encode";
}

export interface ExportResult {
  outputPath: string;
  outputSizeBytes: number;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
  encodingTimeSec: number;
}

export interface ExportStartPayload {
  summary: string[];
  estimatedMB: number;
  source: MediaInfo;
}

export interface FfmpegStatus {
  available: boolean;
  ffmpegPath: string;
  ffmpegVersion: string;
  ffprobePath: string;
  ffprobeVersion: string;
  source: "bundled" | "missing";
}

export interface AiStatus {
  available: boolean;
  exePath: string;
  model: "animevideo" | "x4plus" | "";
  gpu: string;
}

export interface LicenseStatus {
  activated: boolean;
  key: string;
  email: string;
  plan: "free" | "pro";
  deviceId: string;
  activatedAt: string;
}

export interface StoreShape {
  language: Language;
  theme: Theme;
  outputDir: string;
  defaultPlatform: Platform;
  defaultMode: FpsMode;
  recentExports: ExportResult[];
  installedPacks: string[];
  lastVersion: string;
  license: LicenseStatus;
}

export type PackCategory =
  | "lut"
  | "presetPremiere"
  | "presetAe"
  | "presetResolve"
  | "presetCapcut"
  | "motionBlur"
  | "exportGuide"
  | "template"
  | "overlay"
  | "soundfx";

export interface PackFile {
  path: string;
  name: string;
  sizeBytes: number;
}

export interface Pack {
  id: string;
  name: string;
  category: PackCategory;
  description: string;
  sizeMB: number;
  version: string;
  files: PackFile[];
}

export interface AppInfo {
  version: string;
  platform: string;
  isDev: boolean;
  userData: string;
}

export interface UpdateProgress {
  percent: number;
  transferred: number;
  total: number;
}
