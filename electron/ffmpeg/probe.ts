import { execFile } from "node:child_process";
import path from "node:path";
import type { MediaInfo } from "../../shared/types";
import { resolveFfprobe } from "./index";

interface ProbeStream {
  codec_type?: string;
  codec_name?: string;
  width?: number;
  height?: number;
  avg_frame_rate?: string;
  r_frame_rate?: string;
  bit_rate?: string;
  nb_frames?: string;
}

interface ProbeJson {
  streams?: ProbeStream[];
  format?: {
    duration?: string;
    size?: string;
    bit_rate?: string;
  };
}

function parseRate(rate: string): number {
  if (!rate) return 0;
  const [a, b] = rate.split("/");
  const num = parseFloat(a);
  const den = parseFloat(b);
  if (!Number.isFinite(num)) return 0;
  if (!Number.isFinite(den) || den === 0) return num;
  return Math.round((num / den) * 1000) / 1000;
}

export function probeVideo(filePath: string): Promise<MediaInfo> {
  return new Promise((resolve, reject) => {
    const ffprobe = resolveFfprobe();
    if (!ffprobe) {
      reject(new Error("ffprobe binary not found"));
      return;
    }
    const args = [
      "-v", "error",
      "-show_entries", "stream=codec_type,codec_name,width,height,avg_frame_rate,r_frame_rate,bit_rate,nb_frames",
      "-show_entries", "format=duration,size,bit_rate",
      "-of", "json",
      filePath,
    ];
    execFile(ffprobe, args, { windowsHide: true }, (err, stdout) => {
      if (err) {
        reject(err);
        return;
      }
      try {
        const data: ProbeJson = JSON.parse(stdout);
        const video = data.streams?.find((s) => s.codec_type === "video");
        const audio = data.streams?.find((s) => s.codec_type === "audio");
        const format = data.format;
        if (!video || !format) {
          reject(new Error("No video stream detected in file"));
          return;
        }
        const fps = parseRate(video.avg_frame_rate || video.r_frame_rate || "");
        const duration = parseFloat(format.duration || "0") || 0;
        const sizeBytes = parseInt(format.size || "0", 10) || 0;
        const bitrate = parseInt(video.bit_rate || format.bit_rate || "0", 10) || 0;
        const vframes = parseInt(video.nb_frames || "0", 10) || Math.round(fps * duration);
        const info: MediaInfo = {
          path: filePath,
          name: path.basename(filePath),
          sizeBytes,
          durationSec: duration,
          width: video.width || 0,
          height: video.height || 0,
          fps,
          codec: video.codec_name || "unknown",
          audioCodec: audio?.codec_name || "none",
          bitrateKbps: Math.round(bitrate / 1000),
          vframes,
        };
        resolve(info);
      } catch (e) {
        reject(e instanceof Error ? e : new Error("Failed to parse probe output"));
      }
    });
  });
}
