import { spawn, execFile } from "node:child_process";
import { app } from "electron";
import fs from "node:fs";
import path from "node:path";
import ffmpegStatic from "ffmpeg-static";
import ffprobeStatic from "ffprobe-static";
import type { AiStatus, ExportProgress, ExportResult, GpuEncoder, HevcEncoder, JobSpec, MediaInfo } from "../../shared/types";
import { buildCommand, buildFinalEncodeCommand, buildFrameSequenceCommand, buildPreviewAiEncodeCommand, buildPreviewCommand, buildPreviewFrameCommand, usesRealEsrgan } from "./pipeline";
import { probeVideo } from "./probe";

export interface FfmpegBinaries {
  ffmpeg: string;
  ffprobe: string;
  ffmpegVersion: string;
  ffprobeVersion: string;
  source: "bundled" | "system";
}

let cached: FfmpegBinaries | null = null;

function candidateList(exe: string): string[] {
  const list: string[] = [];
  const env = exe === "ffmpeg" ? process.env.FFMPEG_PATH : process.env.FFPROBE_PATH;
  if (env) list.push(env);
  // Bundled resources/bin — same location in dev and packaged builds.
  const resourcesRoot = app.isPackaged ? process.resourcesPath : path.resolve(__dirname, "../../../resources");
  list.push(path.join(resourcesRoot, "bin", exe === "ffmpeg" ? "ffmpeg.exe" : "ffprobe.exe"));
  if (app.isPackaged) {
    list.push(
      path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", exe === "ffmpeg" ? "ffmpeg-static" : "ffprobe-static", exe === "ffmpeg" ? "ffmpeg.exe" : "ffprobe.exe"),
    );
  }
  const mod = exe === "ffmpeg" ? ffmpegStatic : ffprobeStatic.path as unknown as string;
  if (mod && typeof mod === "string") list.push(mod);
  // @ffprobe-installer ships a real win32 binary (ffprobe-static does not).
  if (exe === "ffprobe") {
    try {
      const pkg = require("@ffprobe-installer/ffprobe") as { path: string };
      if (pkg && pkg.path) list.push(pkg.path);
    } catch {
      /* not installed */
    }
  }
  list.push(path.resolve(__dirname, "../../../node_modules", exe === "ffmpeg" ? "ffmpeg-static" : "ffprobe-static", exe === "ffmpeg" ? "ffmpeg.exe" : "ffprobe.exe"));
  return list;
}

function firstExisting(paths: string[]): string | null {
  for (const p of paths) {
    try {
      if (p && fs.existsSync(p)) return p;
    } catch {
      /* ignore */
    }
  }
  return null;
}

function version(bin: string): Promise<string> {
  return new Promise((resolve) => {
    try {
      execFile(bin, ["-version"], { windowsHide: true, timeout: 8000 }, (err, stdout) => {
        if (err) {
          resolve("");
          return;
        }
        const m = stdout.match(/ffmpeg version (\S+)/i);
        resolve(m ? m[1] : "ok");
      });
    } catch {
      resolve("");
    }
  });
}

export async function resolveBinaries(force = false): Promise<FfmpegBinaries | null> {
  if (cached && !force) return cached;
  const ffmpeg = firstExisting(candidateList("ffmpeg"));
  const ffprobe = firstExisting(candidateList("ffprobe"));
  if (!ffmpeg || !ffprobe) {
    cached = null;
    return null;
  }
  const [ffmpegVersion, ffprobeVersion] = await Promise.all([version(ffmpeg), version(ffprobe)]);
  if (!ffmpegVersion) {
    cached = null;
    return null;
  }
  cached = {
    ffmpeg,
    ffprobe,
    ffmpegVersion,
    ffprobeVersion,
    source: app.isPackaged ? "bundled" : "bundled",
  };
  return cached;
}

export function resolveFfprobe(): string | null {
  if (cached) return cached.ffprobe;
  return firstExisting(candidateList("ffprobe"));
}

export async function getFfmpegStatus() {
  const bins = await resolveBinaries();
  if (!bins) {
    return {
      available: false,
      ffmpegPath: "",
      ffmpegVersion: "",
      ffprobePath: "",
      ffprobeVersion: "",
      source: "missing" as const,
    };
  }
  return {
    available: true,
    ffmpegPath: bins.ffmpeg,
    ffmpegVersion: bins.ffmpegVersion,
    ffprobePath: bins.ffprobe,
    ffprobeVersion: bins.ffprobeVersion,
    source: "bundled" as const,
  };
}

// ---------------- Real-ESRGAN (neural enhance) ----------------

export interface AiBinary {
  exe: string;
  modelsDir: string;
  model: "animevideo" | "x4plus";
}

let aiCached: AiBinary | null = null;
let gpuName = "";

export function resolveRealesrgan(): AiBinary | null {
  if (aiCached) return aiCached;
  try {
    const root = app.isPackaged ? path.join(process.resourcesPath, "bin") : path.resolve(__dirname, "../../../resources/bin");
    const exe = path.join(root, "realesrgan-ncnn-vulkan.exe");
    if (!fs.existsSync(exe)) return null;
    const modelsDir = path.join(root, "models");
    const hasFast = fs.existsSync(path.join(modelsDir, "realesr-animevideov3-x2.param"));
    const hasX4 = fs.existsSync(path.join(modelsDir, "realesrgan-x4plus.param"));
    if (!hasFast && !hasX4) return null;
    aiCached = { exe, modelsDir, model: hasX4 ? "x4plus" : "animevideo" };
    return aiCached;
  } catch {
    return null;
  }
}

export function getAiStatus(): AiStatus {
  const ai = resolveRealesrgan();
  if (!ai) return { available: false, exePath: "", model: "", gpu: "" };
  return { available: true, exePath: ai.exe, model: ai.model, gpu: gpuName };
}

function parseTime(value: string): number {
  const parts = value.split(":");
  if (parts.length === 3) {
    return Number(parts[0]) * 3600 + Number(parts[1]) * 60 + Number(parts[2]);
  }
  return Number(value) || 0;
}

// ---------------- HEVC encoder detection ----------------
let gpuCached: Promise<GpuEncoder | null> | null = null;

/** Detect the fastest working hardware encoder family via a live encode probe. */
export function resolveGpuEncoder(): Promise<GpuEncoder | null> {
  if (!gpuCached) {
    gpuCached = detectGpuEncoder().catch(() => null);
  }
  return gpuCached;
}

export function resolveHevcEncoder(): Promise<HevcEncoder> {
  return resolveGpuEncoder().then((g) => g ?? "libx265");
}

async function detectGpuEncoder(): Promise<GpuEncoder | null> {
  const bins = cached;
  if (!bins) return null;
  for (const enc of ["nvenc", "amf", "qsv", "mf"] as GpuEncoder[]) {
    if (await probeEncoder(bins, enc)) return enc;
  }
  return null;
}

/** Real capability probe: encode a 0.5s tiny clip with the encoder. */
function probeEncoder(bins: FfmpegBinaries, encoder: GpuEncoder): Promise<boolean> {
  return new Promise((resolve) => {
    const codec =
      encoder === "nvenc" ? "hevc_nvenc" : encoder === "amf" ? "hevc_amf" : encoder === "qsv" ? "hevc_qsv" : "hevc_mf";
    const tmp = path.join(app.getPath("temp"), `sharpmotion-enc-${encoder}.mp4`);
    try {
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    } catch {
      /* ignore */
    }
    const args = [
      "-y", "-hide_banner", "-loglevel", "error",
      "-f", "lavfi", "-i", "testsrc2=duration=0.5:size=160x90:rate=24",
      "-c:v", codec, "-pix_fmt", "yuv420p", "-frames:v", "12",
      "-tag:v", "hvc1", tmp,
    ];
    execFile(bins.ffmpeg, args, { windowsHide: true }, () => {
      let ok = false;
      try {
        ok = fs.existsSync(tmp) && fs.statSync(tmp).size > 0;
      } catch {
        /* ignore */
      }
      try {
        if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
      } catch {
        /* ignore */
      }
      resolve(ok);
    });
  });
}

export function encoderLabel(encoder: HevcEncoder): string {
  switch (encoder) {
    case "nvenc":
      return "NVIDIA NVENC (GPU)";
    case "amf":
      return "AMD AMF (GPU)";
    case "qsv":
      return "Intel QSV (GPU)";
    case "mf":
      return "Windows MediaFoundation (GPU)";
    default:
      return "libx265 (CPU)";
  }
}


/** Copy the selected LUT to a stable temp path so filter parsing is safe. */
function prepareLut(job: JobSpec): void {
  if (!job.enhance?.lut) return;
  try {
    const src = job.enhance.lut;
    if (!src || !fs.existsSync(src)) {
      job.enhance.lut = "";
      return;
    }
    const dest = path.join(app.getPath("temp"), "sharpmotion-lut.cube");
    fs.copyFileSync(src, dest);
    job.enhance.lut = dest;
  } catch {
    job.enhance.lut = "";
  }
}

export interface ExportRunner {
  cancel: () => void;
  done: Promise<ExportResult>;
}

export function runExport(
  job: JobSpec,
  sourceInfo: MediaInfo,
  onProgress: (p: ExportProgress) => void,
  onError: (message: string) => void,
): ExportRunner {
  const bins = cached;
  if (usesRealEsrgan(job) && resolveRealesrgan()) {
    return runExportAI(job, sourceInfo, resolveRealesrgan()!, onProgress, onError);
  }
  if (job.enhance?.aiReal) {
    // Neural model unavailable on this machine — degrade to the CPU AI filters.
    job.enhance.aiReal = false;
  }
  let child: ReturnType<typeof spawn> | null = null;
  let cancelled = false;
  const startedAt = Date.now();

  const done = new Promise<ExportResult>((resolve, reject) => {
    if (!bins) {
      reject(new Error("FFmpeg binaries are not available"));
      return;
    }
    prepareLut(job);
    const built = buildCommand(job, sourceInfo.fps);
    const args = built.args;
    child = spawn(bins.ffmpeg, args, { windowsHide: true });    let stderrTail = "";
    let lastTime = 0;
    let lastSpeed = 0;
    let lastFps = 0;
    let lastFrame = 0;
    let lastSize = 0;

    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      const lines = chunk.split(/\r?\n/);
      for (const line of lines) {
        const idx = line.indexOf("=");
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        switch (key) {
          case "out_time_us":
            lastTime = Number(value) / 1_000_000;
            break;
          case "out_time_ms":
            lastTime = Number(value) / 1000;
            break;
          case "out_time":
            if (value) lastTime = parseTime(value);
            break;
          case "speed": {
            const s = parseFloat(value.replace("x", ""));
            if (Number.isFinite(s)) lastSpeed = s;
            break;
          }
          case "fps": {
            const f = parseFloat(value);
            if (Number.isFinite(f)) lastFps = f;
            break;
          }
          case "frame": {
            const f = parseInt(value, 10);
            if (Number.isFinite(f)) lastFrame = f;
            break;
          }
          case "total_size": {
            const s = parseInt(value, 10);
            if (Number.isFinite(s)) lastSize = s;
            break;
          }
        }
      }
      if (!cancelled) {
        const duration = sourceInfo.durationSec;
        const percent = duration > 0 ? Math.min(100, Math.max(0, (lastTime / duration) * 100)) : 0;
        const speedX = lastSpeed > 0 ? lastSpeed : percent > 0 && lastTime > 0 ? lastTime / ((Date.now() - startedAt) / 1000) : 1;
        const etaSec = speedX > 0.01 ? Math.max(0, (duration - lastTime) / speedX) : 0;
        onProgress({
          percent,
          timeSec: lastTime,
          durationSec: duration,
          etaSec,
          speedX,
          fps: lastFps,
          sizeBytes: lastSize,
          frame: lastFrame,
          totalFrames: sourceInfo.vframes,
          active: true,
        });
      }
    });

    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2000);
    });

    child.on("error", (err) => {
      if (!cancelled) {
        onError(err.message);
        reject(err);
      }
    });

    child.on("close", (code) => {
      if (cancelled) {
        reject(new Error("cancelled"));
        return;
      }
      if (code !== 0) {
        const lines = stderrTail.split("\n").filter(Boolean);
        const first = lines[0] || "";
        const last = lines[lines.length - 1] || "";
        const msg = [first, last].filter((l, i, a) => l && a.indexOf(l) === i).join("\n") || `FFmpeg exited with code ${code}`;
        onError(msg);
        reject(new Error(msg));
        return;
      }
      onProgress({
        percent: 100,
        timeSec: sourceInfo.durationSec,
        durationSec: sourceInfo.durationSec,
        etaSec: 0,
        speedX: lastSpeed,
        fps: lastFps,
        sizeBytes: lastSize,
        frame: lastFrame,
        totalFrames: sourceInfo.vframes,
        active: false,
      });
      resolve({
        outputPath: job.outputPath,
        outputSizeBytes: lastSize,
        durationSec: sourceInfo.durationSec,
        width: job.profile.width,
        height: job.profile.height,
        fps: job.profile.fps,
        encodingTimeSec: (Date.now() - startedAt) / 1000,
      });
    });
  });

  return {
    cancel: () => {
      cancelled = true;
      if (child && !child.killed) {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
      }
    },
    done,
  };
}

export function probeFile(filePath: string): Promise<MediaInfo> {
  return probeVideo(filePath);
}

/** Render a short stage-preview clip. Resolves with the output path on success. */
export function renderPreview(
  job: JobSpec,
  sourceFps: number,
  stage: "original" | "fps" | "blur" | "enhance" | "final",
  spec: { outputPath: string; startSec: number; durationSec: number; maxHeight: number; targetFps: number },
): Promise<string> {
  if (usesRealEsrgan(job)) {
    const ai = resolveRealesrgan();
    if (ai) return renderPreviewAI(job, sourceFps, stage, spec, ai);
    // Neural model unavailable — fall back to the CPU AI filters.
    if (job.enhance) job.enhance.aiReal = false;
  }
  return new Promise((resolve, reject) => {
    const bins = cached;
    if (!bins) {
      reject(new Error("FFmpeg binaries are not available"));
      return;
    }
    const args = buildPreviewCommand(job, sourceFps, stage, spec);
    const child = spawn(bins.ffmpeg, args, { windowsHide: true });
    let stderrTail = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2000);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(spec.outputPath);
        return;
      }
      const lines = stderrTail.split("\n").filter(Boolean);
      reject(new Error(lines[lines.length - 1] || `FFmpeg exited with code ${code}`));
    });
  });
}

/** Transcode an already-finished file to a short, low-res preview clip (no pipeline filters). */
export function renderFilePreview(
  inputPath: string,
  spec: { outputPath: string; startSec: number; durationSec: number; maxHeight: number; targetFps: number },
): Promise<string> {
  return new Promise((resolve, reject) => {
    const bins = cached;
    if (!bins) {
      reject(new Error("FFmpeg binaries are not available"));
      return;
    }
    const args = [
      "-y",
      "-hide_banner",
      "-loglevel", "error",
      "-nostdin",
      "-ss", String(spec.startSec),
      "-t", String(spec.durationSec),
      "-i", inputPath,
      "-map", "0:v:0",
      "-vf", `scale=-2:${spec.maxHeight}:flags=lanczos,setsar=1,fps=${spec.targetFps},format=yuv420p`,
      "-c:v", "libx264",
      "-preset", "veryfast",
      "-crf", "28",
      "-pix_fmt", "yuv420p",
      "-an",
      "-movflags", "+faststart",
      spec.outputPath,
    ];
    const child = spawn(bins.ffmpeg, args, { windowsHide: true });
    let stderrTail = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2000);
    });
    child.on("error", (err) => reject(err));
    child.on("close", (code) => {
      if (code === 0) {
        resolve(spec.outputPath);
        return;
      }
      const lines = stderrTail.split("\n").filter(Boolean);
      reject(new Error(lines[lines.length - 1] || `FFmpeg exited with code ${code}`));
    });
  });
}

// ---------------- Real-ESRGAN export + preview ----------------

interface FfmpegRunStats {
  timeSec: number;
  speedX: number;
  fps: number;
  frame: number;
}

/** Spawn ffmpeg, parse `-progress pipe:1` lines and resolve on a clean exit. */
function runFfmpegProcess(
  args: string[],
  durationSec: number,
  onStats: (stats: FfmpegRunStats) => void,
  isCancelled: () => boolean,
  setChild: (c: ReturnType<typeof spawn> | null) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const bins = cached;
    if (!bins) {
      reject(new Error("FFmpeg binaries are not available"));
      return;
    }
    const child = spawn(bins.ffmpeg, args, { windowsHide: true });
    setChild(child);
    let stderrTail = "";
    const stats: FfmpegRunStats = { timeSec: 0, speedX: 1, fps: 0, frame: 0 };
    child.stdout?.setEncoding("utf8");
    child.stdout?.on("data", (chunk: string) => {
      for (const line of chunk.split(/\r?\n/)) {
        const idx = line.indexOf("=");
        if (idx < 0) continue;
        const key = line.slice(0, idx).trim();
        const value = line.slice(idx + 1).trim();
        if (key === "out_time_us") stats.timeSec = Number(value) / 1_000_000;
        else if (key === "out_time_ms") stats.timeSec = Number(value) / 1000;
        else if (key === "out_time") {
          if (value) stats.timeSec = parseTime(value);
        } else if (key === "speed") {
          const s = parseFloat(value.replace("x", ""));
          if (Number.isFinite(s)) stats.speedX = s;
        } else if (key === "fps") {
          const f = parseFloat(value);
          if (Number.isFinite(f)) stats.fps = f;
        } else if (key === "frame") {
          const f = parseInt(value, 10);
          if (Number.isFinite(f)) stats.frame = f;
        }
      }
      if (!isCancelled()) onStats({ ...stats });
    });
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      stderrTail = (stderrTail + chunk).slice(-2000);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      setChild(null);
      if (isCancelled()) {
        reject(new Error("cancelled"));
        return;
      }
      if (code !== 0) {
        const lines = stderrTail.split("\n").filter(Boolean);
        reject(new Error(lines[lines.length - 1] || `FFmpeg exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

/** Run the Real-ESRGAN neural pass over a PNG frame directory. */
function runNeuralPass(ai: AiBinary, modelName: string, framesDir: string, outDir: string, totalFrames: number, onProgress: (n: number) => void, isCancelled: () => boolean, setChild: (c: ReturnType<typeof spawn> | null) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const child = spawn(ai.exe, ["-i", framesDir, "-o", outDir, "-m", ai.modelsDir, "-n", modelName, "-s", "2"], { windowsHide: true });
    setChild(child);
    let tail = "";
    child.stderr?.setEncoding("utf8");
    child.stderr?.on("data", (chunk: string) => {
      tail = (tail + chunk).slice(-3000);
      const m = chunk.match(/\[(\d+) (.+?)\]  queueC/);
      if (m && !gpuName) gpuName = m[2].trim();
    });
    const timer = setInterval(() => {
      try {
        const n = fs.readdirSync(outDir).filter((f) => f.endsWith(".png")).length;
        if (!isCancelled() && n > 0) onProgress(n);
      } catch {
        /* dir not ready yet */
      }
    }, 500);
    child.on("error", (err) => {
      clearInterval(timer);
      setChild(null);
      reject(err);
    });
    child.on("close", (code) => {
      clearInterval(timer);
      setChild(null);
      if (isCancelled()) {
        reject(new Error("cancelled"));
        return;
      }
      if (code !== 0) {
        const lines = tail.split("\n").filter(Boolean);
        reject(new Error(lines[lines.length - 1] || `AI model exited with code ${code}`));
        return;
      }
      resolve();
    });
  });
}

function aiModelName(job: JobSpec): string {
  return job.enhance?.aiModel === "x4plus" ? "realesrgan-x4plus" : "realesr-animevideov3";
}

/**
 * Full export through the Real-ESRGAN neural pass:
 *  1. render the pipeline (60FPS / blur / filters) to a PNG frame sequence
 *  2. restore/upscale every frame with the neural model on the GPU
 *  3. reassemble at the target resolution and encode with the profile + audio
 */
export function runExportAI(
  job: JobSpec,
  sourceInfo: MediaInfo,
  ai: AiBinary,
  onProgress: (p: ExportProgress) => void,
  onError: (message: string) => void,
): ExportRunner {
  const startedAt = Date.now();
  let cancelled = false;
  let child: ReturnType<typeof spawn> | null = null;

  const work = path.join(app.getPath("temp"), `sharpmotion-ai-${Date.now()}`);
  const framesDir = path.join(work, "frames");
  const aiDir = path.join(work, "ai");
  fs.mkdirSync(framesDir, { recursive: true });
  fs.mkdirSync(aiDir, { recursive: true });
  const framesPattern = path.join(framesDir, "%06d.png");
  const aiPattern = path.join(aiDir, "%06d.png");

  const setChild = (c: ReturnType<typeof spawn> | null) => {
    child = c;
  };

  const emit = (p: ExportProgress) => {
    if (!cancelled) onProgress(p);
  };

  const done = new Promise<ExportResult>((resolve, reject) => {
    (async () => {
      try {
        // ---- Stage 1: render frame sequence (0-15%) ----
        const s1 = buildFrameSequenceCommand(job, sourceInfo.fps, framesPattern);
        await runFfmpegProcess(
          s1,
          sourceInfo.durationSec,
          (stats) => {
            const time = stats.timeSec;
            const pct = Math.min(15, (time / sourceInfo.durationSec) * 15);
            const speedX = stats.speedX > 0 ? stats.speedX : 1;
            emit({
              percent: pct,
              timeSec: time,
              durationSec: sourceInfo.durationSec,
              etaSec: speedX > 0.01 ? Math.max(0, (sourceInfo.durationSec - time) / speedX) : 0,
              speedX,
              fps: stats.fps,
              sizeBytes: 0,
              frame: stats.frame,
              totalFrames: sourceInfo.vframes,
              active: true,
              phase: "render",
            });
          },
          () => cancelled,
          setChild,
        );
        const frameCount = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png")).length;
        if (frameCount === 0) throw new Error("No frames were generated for the AI pass");

        // ---- Stage 2: neural pass (15-85%) ----
        await runNeuralPass(
          ai,
          aiModelName(job),
          framesDir,
          aiDir,
          frameCount,
          (n) => {
            const pct = Math.min(85, 15 + (n / frameCount) * 70);
            const elapsed = (Date.now() - startedAt) / 1000;
            const speedX = elapsed > 0 && n > 0 ? Math.max(0.05, (n / elapsed) * 0.5) : 0;
            emit({
              percent: pct,
              timeSec: elapsed,
              durationSec: sourceInfo.durationSec,
              etaSec: speedX > 0.01 ? Math.max(0, (sourceInfo.durationSec * 0.8 - elapsed) / speedX) : 0,
              speedX,
              fps: 0,
              sizeBytes: 0,
              frame: n,
              totalFrames: frameCount,
              active: true,
              phase: "ai",
            });
          },
          () => cancelled,
          setChild,
        );

        // ---- Stage 3: final encode (85-100%) ----
        const s3 = buildFinalEncodeCommand(job, aiPattern, job.inputPath);
        await runFfmpegProcess(
          s3,
          sourceInfo.durationSec,
          (stats) => {
            const time = stats.timeSec;
            const pct = Math.min(100, 85 + (time / sourceInfo.durationSec) * 15);
            const speedX = stats.speedX > 0 ? stats.speedX : 1;
            emit({
              percent: pct,
              timeSec: time,
              durationSec: sourceInfo.durationSec,
              etaSec: speedX > 0.01 ? Math.max(0, (sourceInfo.durationSec - time) / speedX) : 0,
              speedX,
              fps: stats.fps,
              sizeBytes: 0,
              frame: stats.frame,
              totalFrames: sourceInfo.vframes,
              active: true,
              phase: "encode",
            });
          },
          () => cancelled,
          setChild,
        );

        const outputSizeBytes = fs.existsSync(job.outputPath) ? fs.statSync(job.outputPath).size : 0;
        emit({
          percent: 100,
          timeSec: sourceInfo.durationSec,
          durationSec: sourceInfo.durationSec,
          etaSec: 0,
          speedX: 1,
          fps: 0,
          sizeBytes: outputSizeBytes,
          frame: frameCount,
          totalFrames: frameCount,
          active: false,
        });
        resolve({
          outputPath: job.outputPath,
          outputSizeBytes,
          durationSec: sourceInfo.durationSec,
          width: job.profile.width,
          height: job.profile.height,
          fps: job.profile.fps,
          encodingTimeSec: (Date.now() - startedAt) / 1000,
        });
      } catch (err) {
        reject(err);
      } finally {
        try {
          fs.rmSync(work, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    })();
  });

  return {
    cancel: () => {
      cancelled = true;
      if (child && !child.killed) {
        try {
          child.kill();
        } catch {
          /* ignore */
        }
      }
    },
    done,
  };
}

/** Neural preview: render the stage to PNGs, run Real-ESRGAN, re-encode. */
function renderPreviewAI(job: JobSpec, sourceFps: number, stage: Parameters<typeof renderPreview>[2], spec: { outputPath: string; startSec: number; durationSec: number; maxHeight: number; targetFps: number }, ai: AiBinary): Promise<string> {
  return new Promise((resolve, reject) => {
    const work = path.join(app.getPath("temp"), `sharpmotion-pv-${Date.now()}`);
    const framesDir = path.join(work, "frames");
    const aiDir = path.join(work, "ai");
    fs.mkdirSync(framesDir, { recursive: true });
    fs.mkdirSync(aiDir, { recursive: true });
    const framesPattern = path.join(framesDir, "%06d.png");
    const aiPattern = path.join(aiDir, "%06d.png");
    let child: ReturnType<typeof spawn> | null = null;
    const setChild = (c: ReturnType<typeof spawn> | null) => {
      child = c;
    };
    (async () => {
      try {
        const s1 = buildPreviewFrameCommand(job, sourceFps, stage, spec, framesPattern);
        await runFfmpegProcess(s1, spec.durationSec, () => {}, () => false, setChild);
        const frameCount = fs.readdirSync(framesDir).filter((f) => f.endsWith(".png")).length;
        if (frameCount === 0) throw new Error("No frames generated for AI preview");
        await runNeuralPass(ai, aiModelName(job), framesDir, aiDir, frameCount, () => {}, () => false, setChild);
        const s3 = buildPreviewAiEncodeCommand(spec, aiPattern);
        await runFfmpegProcess(s3, spec.durationSec, () => {}, () => false, setChild);
        resolve(spec.outputPath);
      } catch (err) {
        reject(err);
      } finally {
        try {
          fs.rmSync(work, { recursive: true, force: true });
        } catch {
          /* ignore */
        }
      }
    })();
  });
}
