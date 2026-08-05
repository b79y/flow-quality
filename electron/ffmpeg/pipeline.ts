import type { EnhanceOptions, FpsOptions, HevcEncoder, JobSpec, MotionBlurOptions, PreviewStage } from "../../shared/types";

export interface BuiltCommand {
  args: string[];
  filterComplex: boolean;
}

export interface PreviewSpec {
  outputPath: string;
  startSec: number;
  durationSec: number;
  maxHeight: number;
  targetFps: number;
}

function interpFilter(fps: FpsOptions, sourceFps: number): string[] {
  const out: string[] = [];
  const target = fps.targetFps;

  // Already at/near target and keepOriginal -> do not interpolate at all.
  if (fps.keepOriginal && sourceFps >= target - 1) {
    return out;
  }

  // Down-sampling / non-interpolated path uses plain fps.
  if (target <= sourceFps) {
    out.push(`fps=${target}`);
    return out;
  }

  const technique = fps.technique === "auto" ? modeTechnique(fps.mode) : fps.technique;

  switch (technique) {
    case "duplicate":
      out.push(`fps=${target}`);
      break;
    case "blend":
      out.push(`minterpolate=fps=${target}:mi_mode=blend`);
      break;
    case "motion":
      out.push(`minterpolate=fps=${target}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=0:me=epzs`);
      break;
    case "optical":
      out.push(`minterpolate=fps=${target}:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1:me=hexbs:mb_size=16:search_param=16`);
      break;
    default:
      out.push(`fps=${target}`);
  }
  return out;
}

function modeTechnique(mode: FpsOptions["mode"]): FpsOptions["technique"] {
  switch (mode) {
    case "turbo":
      return "duplicate";
    case "safe":
      return "motion";
    case "studio":
      return "optical";
  }
}

function gaussian(i: number, c: number, sigma: number): number {
  return Math.exp(-((i - c) * (i - c)) / (2 * sigma * sigma));
}

/**
 * Motion blur via temporal upsampling + weighted tmix blending.
 * Real temporal motion-blur: the interpolator builds smooth motion,
 * tmix smears it across the trailing frames.
 */
function motionBlurFilter(blur: MotionBlurOptions): string[] {
  const out: string[] = [];
  const F = Math.min(
    24,
    Math.max(2, Math.round(1 + (blur.trailLength * blur.samples) / 12)),
  );
  const spread = Math.min(1, Math.max(0, blur.intensity / 10));
  const center = (F - 1) / 2;
  const sigma = Math.max(0.6, F / 3.2);

  const weights: number[] = [];
  for (let i = 0; i < F; i++) {
    const g = gaussian(i, center, sigma);
    const w = (1 - spread) * g + spread * (1 / F);
    weights.push(Math.max(0.01, w));
  }
  const sum = weights.reduce((a, b) => a + b, 0);
  const norm = weights.map((w) => w / sum).map((w) => w.toFixed(4)).join(" ");

  // Pre-mix: temporally double/interpolate to make the smear smooth when
  // the source is low-fps. tmix frames samples across time.
  out.push(`tmix=frames=${F}:weights='${norm}'`);
  return out;
}

function enhanceFilters(e: EnhanceOptions): string[] {
  const out: string[] = [];

  if (e.ai && !e.aiReal) {
    // AI Enhance (CPU filters): deep temporal/spatial denoise + deblock +
    // contrast-aware sharpening + gentle color lift. Used when the Real-ESRGAN
    // neural pass (aiReal) is unavailable or disabled.
    const s = Math.max(0, Math.min(1, e.aiStrength / 100));
    if (e.aiUpscale > 1) {
      out.push(`scale=iw*${e.aiUpscale}:ih*${e.aiUpscale}:flags=lanczos`);
    }
    out.push(`hqdn3d=${(2 + 5 * s).toFixed(2)}:${(1.5 + 4 * s).toFixed(2)}:${(6 + 6 * s).toFixed(1)}:${(4 + 5 * s).toFixed(1)}`);
    out.push(`deblock=strong`);
    out.push(`cas=${(0.35 + 0.5 * s).toFixed(2)}`);
    out.push(`eq=saturation=${(1.03 + 0.08 * s).toFixed(3)}:contrast=${(1 + 0.04 * s).toFixed(3)}`);
  }

  if (e.nightNoise) {
    out.push(`hqdn3d=2.5:2.5:8:8`);
  }

  if (e.denoise > 0) {
    const sigma = (e.denoise / 100) * 6;
    if (e.denoise >= 70) {
      // strong denoise: nlmeans is slow but much better
      out.push(`nlmeans=s=${(sigma * 0.5).toFixed(2)}:p=7:pw=7`);
    } else {
      out.push(`hqdn3d=${sigma.toFixed(2)}:${sigma.toFixed(2)}:${(sigma * 3).toFixed(1)}:${(sigma * 3).toFixed(1)}`);
    }
  }

  if (e.deblock > 0 || e.repairCompression) {
    const strength = e.repairCompression ? "strong" : "strong";
    out.push(`deblock=${strength}`);
  }

  if (e.repairCompression) {
    out.push(`hqdn3d=1:1:4:4`);
  }

  if (e.contrast !== 0 || e.saturation !== 0) {
    const c = 1 + e.contrast / 100;
    const s = e.saturation >= 0 ? 1 + e.saturation / 100 : 1 / (1 - e.saturation / 100);
    out.push(`eq=contrast=${c.toFixed(3)}:saturation=${s.toFixed(3)}`);
  }

  if (e.vibrance > 0) {
    const amount = (e.vibrance / 100) * 0.7;
    out.push(`vibrance=amount=${amount.toFixed(3)}`);
  }

  if (e.sharpen > 0 || e.textClarity) {
    const amount = ((e.sharpen / 100) * 0.9 + (e.textClarity ? 0.35 : 0)).toFixed(3);
    if (parseFloat(amount) > 0) {
      out.push(`unsharp=5:5:${amount}:5:5:0`);
    }
    if (e.textClarity) {
      out.push(`cas=0.55`);
    }
  }

  if (e.lut) {
    out.push(`lut3d=file='${e.lut.replace(/\\/g, "/")}'`);
  }

  return out;
}

/**
 * Build the full ffmpeg argument list for a JobSpec.
 * Everything is produced by the main process and spawned with execFile
 * (no shell), so argument injection is not possible.
 */
export function buildCommand(job: JobSpec, sourceFps: number): BuiltCommand {
  if (job.quick) return buildQuickCommand(job);
  const filters: string[] = [];

  if (job.fps?.enabled) {
    filters.push(...interpFilter(job.fps, sourceFps));
  }
  if (job.motionBlur?.enabled) {
    filters.push(...motionBlurFilter(job.motionBlur));
  }
  if (job.enhance && enhanceEnabled(job.enhance)) {
    filters.push(...enhanceFilters(job.enhance));
  }

  filters.push(
    `scale=${job.profile.width}:${job.profile.height}:flags=lanczos`,
    `setsar=1`,
    `fps=${job.profile.fps}`,
    `format=yuv420p`,
  );

  const codec = job.profile.codec === "hevc" ? "libx265" : "libx264";

  // Performance: pick the x264 preset from the FPS engine the user chose.
  let preset = job.profile.x264Preset;
  if (job.fps?.enabled) {
    if (job.fps.mode === "turbo") preset = "veryfast";
    else if (job.fps.mode === "safe") preset = "medium";
  }

  const gpuArgs = gpuEncodeArgs(job);

  const args = [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-i", job.inputPath,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", filters.join(","),
    "-r", String(job.profile.fps),
    ...(gpuArgs ?? ["-c:v", codec, "-preset", preset, "-crf", String(job.profile.crf)]),
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", job.profile.audioBitrate,
    "-ar", "48000",
    "-movflags", "+faststart",
    "-threads", "0",
    "-progress", "pipe:1",
    "-nostats",
    job.outputPath,
  ];

  return { args, filterComplex: false };
}

/**
 * One-click "fastest quality" encode: optional 60 FPS + unsharp sharpen + HEVC hvc1
 * at a fixed bitrate. Uses the fastest available encoder (hardware GPU when present,
 * libx265 CPU as fallback).
 */
function buildQuickCommand(job: JobSpec): BuiltCommand {
  const q = job.quick!;
  const bitrate = `${q.bitrateMbps}M`;
  const amt = q.sharpenAmount.toFixed(2);
  const filters = [
    `scale=trunc(iw/2)*2:trunc(ih/2)*2:flags=lanczos`,
    `setsar=1`,
    ...(q.fps60 ? [`fps=60`] : []),
    ...(q.sharpenAmount > 0 ? [`unsharp=3:3:${amt}:3:3:${amt}`] : []),
    `format=yuv420p`,
  ];

  const args = [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-i", job.inputPath,
    "-map", "0:v:0",
    "-map", "0:a:0?",
    "-vf", filters.join(","),
    ...(q.fps60 ? ["-r", "60"] : []),
    ...quickEncoderArgs(q.encoder, q.bitrateMbps),
    "-color_primaries", "bt709",
    "-color_trc", "bt709",
    "-colorspace", "bt709",
    "-tag:v", "hvc1",
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", job.profile.audioBitrate,
    "-ar", "48000",
    "-movflags", "+faststart",
    "-write_tmcd", "0",
    "-threads", "0",
    "-progress", "pipe:1",
    "-nostats",
    job.outputPath,
  ];

  return { args, filterComplex: false };
}

function quickEncoderArgs(encoder: HevcEncoder, mbps: number): string[] {
  const bitrate = `${mbps}M`;
  const bufsize = `${mbps * 2}M`;
  const common = ["-b:v", bitrate, "-maxrate", bitrate, "-bufsize", bufsize, "-g", "60"];
  switch (encoder) {
    case "nvenc":
      return ["-c:v", "hevc_nvenc", ...common];
    case "amf":
      return ["-c:v", "hevc_amf", ...common];
    case "qsv":
      return ["-c:v", "hevc_qsv", ...common];
    case "mf":
      return ["-c:v", "hevc_mf", "-b:v", bitrate];
    default:
      return ["-c:v", "libx265", ...common, "-keyint_min", "60", "-preset", "fast"];
  }
}

function enhanceEnabled(e: EnhanceOptions): boolean {
  return (
    e.ai ||
    e.denoise > 0 ||
    e.deblock > 0 ||
    e.sharpen > 0 ||
    e.contrast !== 0 ||
    e.saturation !== 0 ||
    e.vibrance > 0 ||
    e.nightNoise ||
    e.textClarity ||
    e.repairCompression ||
    !!e.lut
  );
}

/**
 * Build a short, low-res preview clip for a single pipeline stage so the
 * user can inspect each step (Original / 60 FPS / Blur / Enhance / Final)
 * independently before committing to a full export.
 */
export function buildPreviewCommand(job: JobSpec, sourceFps: number, stage: PreviewStage, spec: PreviewSpec): string[] {
  const filters = previewFilters(job, sourceFps, stage, spec);

  return [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-ss", String(spec.startSec),
    "-t", String(spec.durationSec),
    "-i", job.inputPath,
    "-map", "0:v:0",
    "-vf", filters.join(","),
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-an",
    "-movflags", "+faststart",
    spec.outputPath,
  ];
}

/** Same stage preview, but rendered to a PNG frame sequence (input for Real-ESRGAN). */
export function buildPreviewFrameCommand(job: JobSpec, sourceFps: number, stage: PreviewStage, spec: PreviewSpec, framesPattern: string): string[] {
  const filters = previewFilters(job, sourceFps, stage, spec);
  return [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-ss", String(spec.startSec),
    "-t", String(spec.durationSec),
    "-i", job.inputPath,
    "-map", "0:v:0",
    "-vf", filters.join(","),
    "-c:v", "png",
    "-start_number", "1",
    framesPattern,
  ];
}

function previewFilters(job: JobSpec, sourceFps: number, stage: PreviewStage, spec: PreviewSpec): string[] {
  const filters: string[] = [];

  if (job.fps?.enabled && (stage === "fps" || stage === "final")) {
    filters.push(...interpFilter(job.fps, sourceFps));
  }
  if (job.motionBlur?.enabled && (stage === "blur" || stage === "final")) {
    filters.push(...motionBlurFilter(job.motionBlur));
  }
  if (stage === "enhance" || stage === "final") {
    const e: EnhanceOptions | undefined = job.enhance && enhanceEnabled(job.enhance) ? { ...job.enhance, aiUpscale: 1 } : undefined;
    if (e) filters.push(...enhanceFilters(e));
  }

  filters.push(
    `scale=-2:${spec.maxHeight}:flags=lanczos`,
    `setsar=1`,
    `fps=${spec.targetFps}`,
    `format=yuv420p`,
  );
  return filters;
}

/** Re-encode the neural-restored preview frames into the final preview clip. */
export function buildPreviewAiEncodeCommand(spec: PreviewSpec, framesPattern: string): string[] {
  return [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-start_number", "1",
    "-framerate", String(spec.targetFps),
    "-i", framesPattern,
    "-vf", `scale=-2:${spec.maxHeight}:flags=lanczos,setsar=1,fps=${spec.targetFps},format=yuv420p`,
    "-c:v", "libx264",
    "-preset", "veryfast",
    "-crf", "28",
    "-pix_fmt", "yuv420p",
    "-an",
    "-movflags", "+faststart",
    spec.outputPath,
  ];
}

/** True when the job should run through the Real-ESRGAN neural pass. */
export function usesRealEsrgan(job: JobSpec): boolean {
  return job.enhance?.aiReal === true;
}

/**
 * Stage 1 of the Real-ESRGAN export: render the full pipeline (everything
 * except the neural pass) to a lossless PNG frame sequence at the target
 * resolution. The neural model then restores each frame.
 */
export function buildFrameSequenceCommand(job: JobSpec, sourceFps: number, framesPattern: string): string[] {
  const filters: string[] = [];
  if (job.fps?.enabled) filters.push(...interpFilter(job.fps, sourceFps));
  if (job.motionBlur?.enabled) filters.push(...motionBlurFilter(job.motionBlur));
  if (job.enhance && enhanceEnabled(job.enhance)) filters.push(...enhanceFilters(job.enhance));
  filters.push(
    `scale=${job.profile.width}:${job.profile.height}:flags=lanczos`,
    `setsar=1`,
    `fps=${job.profile.fps}`,
    `format=yuv420p`,
  );
  return [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-i", job.inputPath,
    "-map", "0:v:0",
    "-vf", filters.join(","),
    "-c:v", "png",
    "-start_number", "1",
    "-progress", "pipe:1",
    "-nostats",
    framesPattern,
  ];
}

/**
 * Stage 3 of the Real-ESRGAN export: reassemble the restored frames (already
 * 2x upscaled by the model) back to the target resolution and encode the final
 * file with the requested profile, muxing the original audio back in.
 */
export function buildFinalEncodeCommand(job: JobSpec, framesPattern: string, audioInput: string): string[] {
  const codec = job.profile.codec === "hevc" ? "libx265" : "libx264";
  let preset = job.profile.x264Preset;
  if (job.fps?.enabled) {
    if (job.fps.mode === "turbo") preset = "veryfast";
    else if (job.fps.mode === "safe") preset = "medium";
  }
  const gpuArgs = gpuEncodeArgs(job);
  const filters = [
    `scale=${job.profile.width}:${job.profile.height}:flags=lanczos`,
    `setsar=1`,
    `fps=${job.profile.fps}`,
    `format=yuv420p`,
  ];
  return [
    "-y",
    "-hide_banner",
    "-loglevel", "error",
    "-nostdin",
    "-start_number", "1",
    "-framerate", String(job.profile.fps),
    "-i", framesPattern,
    "-i", audioInput,
    "-map", "0:v:0",
    "-map", "1:a:0?",
    "-vf", filters.join(","),
    "-r", String(job.profile.fps),
    ...(gpuArgs ?? ["-c:v", codec, "-preset", preset, "-crf", String(job.profile.crf)]),
    "-pix_fmt", "yuv420p",
    "-c:a", "aac",
    "-b:a", job.profile.audioBitrate,
    "-ar", "48000",
    "-movflags", "+faststart",
    "-threads", "0",
    "-progress", "pipe:1",
    "-nostats",
    job.outputPath,
  ];
}

/**
 * Hardware-encode arguments for the regular pipeline. Returns null when no GPU
 * encoder is available so the classic libx264/libx265 path is used unchanged.
 */
function gpuEncodeArgs(job: JobSpec): string[] | null {
  const g = job.gpuEncoder;
  if (!g) return null;
  const hevc = job.profile.codec === "hevc";
  const codec =
    g === "nvenc"
      ? hevc ? "hevc_nvenc" : "h264_nvenc"
      : g === "amf"
        ? hevc ? "hevc_amf" : "h264_amf"
        : g === "qsv"
          ? hevc ? "hevc_qsv" : "h264_qsv"
          : hevc ? "hevc_mf" : "h264_mf";
  const tag = hevc ? "hvc1" : "avc1";
  const crf = job.profile.crf;
  switch (g) {
    case "nvenc":
      return ["-c:v", codec, "-rc", "vbr", "-cq", String(crf), "-b:v", "0", "-preset", "p5", "-tag:v", tag];
    case "qsv":
      return ["-c:v", codec, "-global_quality", String(crf), "-preset", "fast", "-tag:v", tag];
    case "amf":
      return ["-c:v", codec, "-rc", "cqp", "-qp_i", String(crf), "-qp_p", String(crf), "-tag:v", tag];
    case "mf":
      return ["-c:v", codec, "-b:v", String(Math.max(600, Math.round(job.profile.width * job.profile.height * job.profile.fps * 0.00008))) + "k", "-tag:v", tag];
  }
}

export function pipelineSummary(job: JobSpec): string[] {
  const items: string[] = [];
  if (job.quick) {
    items.push(job.quick.fps60 ? "60 FPS" : "Original FPS");
    items.push(job.quick.sharpenAmount > 0 ? "Sharpen" : "No sharpen");
    items.push(`HEVC hvc1 · ${encoderName(job.quick.encoder)}`);
    return items;
  }
  const codecName = job.profile.codec === "hevc" ? "HEVC" : "H.264";
  const engine = job.gpuEncoder ? `${codecName} · GPU (${job.gpuEncoder.toUpperCase()})` : codecName;
  if (job.fps?.enabled) items.push(`60 FPS · ${job.fps.mode}`);
  if (job.motionBlur?.enabled) items.push(`Motion Blur · ${job.motionBlur.preset}`);
  if (job.enhance && enhanceEnabled(job.enhance)) items.push("Enhance");
  if (!job.motionBlur?.enabled && !(job.enhance && enhanceEnabled(job.enhance)) && !job.fps?.enabled)
    items.push("Direct encode");
  items.push(engine);
  return items;
}

/** Rough output size estimate (MB) for the before/after panel. */
export function estimateOutputMB(job: JobSpec, durationSec: number): number {
  const px = job.profile.width * job.profile.height;
  // heuristic bitrate model tuned against typical x264 output
  const base =
    (px * job.profile.fps * 0.00008) /
    Math.pow(2, (job.profile.crf - 18) / 6);
  const motionFactor =
    job.fps?.enabled && job.fps.mode !== "turbo" ? 1.15 : 1;
  const blurFactor = job.motionBlur?.enabled ? 1.08 : 1;
  const kbps = Math.max(400, base * motionFactor * blurFactor);
  const mb = (kbps * durationSec) / 8000;
  return Math.min(Math.max(1, mb), job.profile.maxSizeMB * 3);
}

export function encoderName(encoder: HevcEncoder): string {
  switch (encoder) {
    case "nvenc":
      return "NVENC";
    case "amf":
      return "AMF";
    case "qsv":
      return "QSV";
    case "mf":
      return "MediaFoundation";
    default:
      return "libx265";
  }
}

/** Quick-quality output size estimate (MB) at a fixed video bitrate. */
export function estimateQuickMB(bitrateMbps: number, durationSec: number): number {
  if (!durationSec || durationSec <= 0) return 0;
  return Math.max(1, Math.round((bitrateMbps * durationSec) / 8));
}
