import { execFile } from "child_process";
import { promisify } from "util";
import { buildOptimizationProfile, BuildCommandArgs } from "./profiles";

const execFileP = promisify(execFile);

export function clampFps(fps: number, maxFps: number): number {
  return Math.min(fps, maxFps);
}

export interface EncodeResult {
  outputPath: string;
  duration: number;
  bitrate: number;
  size: number;
  command: string;
}

export async function encodeVideo(args: BuildCommandArgs): Promise<EncodeResult> {
  const mode = args.mode || "balanced";
  const profile = buildOptimizationProfile(args.spec, mode);
  const targetFps = args.sourceInfo?.codec === "h265" || args.sourceInfo?.isHDR === true
    ? args.spec.fps
    : clampFps(args.spec.fps, 30);

  const videoFilters: string[] = profile.videoFilters.filter(Boolean) as string[];
  if (targetFps !== args.spec.fps) {
    videoFilters.push(`fps=${targetFps}`);
  }

  const cmdArgs: string[] = [
    "-y",
    "-i", args.inputPath,
    "-c:v", profile.codec,
    "-preset", profile.preset,
    ...(profile.crf !== null ? ["-crf", String(profile.crf)] : []),
    ...(profile.bitrate ? ["-b:v", profile.bitrate] : []),
    ...(profile.maxrate ? ["-maxrate", profile.maxrate] : []),
    ...(profile.bufsize ? ["-bufsize", profile.bufsize] : []),
    "-profile:v", profile.profile,
    "-level", profile.level,
    "-pix_fmt", profile.pixelFormat,
    "-g", String(profile.gop),
    "-c:a", "aac",
    "-b:a", profile.audioBitrate,
    "-movflags", "+faststart",
    ...(videoFilters.length ? ["-vf", videoFilters.join(",")] : []),
    args.outputPath,
  ];

  await new Promise<void>((resolve, reject) => {
    execFile("ffmpeg", cmdArgs, {
      maxBuffer: 1024 * 1024 * 1024,
      encoding: "utf8",
      windowsHide: true,
    }, (error, _stdout, stderr) => {
      if (error) {
        reject(new Error(`FFmpeg error: ${error.message}\n${stderr}`));
        return;
      }
      resolve();
    });
  });

  const size = await getFileSize(args.outputPath);

  return {
    outputPath: args.outputPath,
    duration: 0,
    bitrate: 0,
    size,
    command: `ffmpeg ${cmdArgs.map((a) => `"${a}"`).join(" ")}`,
  };
}

async function getFileSize(filePath: string): Promise<number> {
  const { stdout } = await execFileP("powershell", [
    "-Command",
    `Get-Item '${filePath}' | Select-Object -ExpandProperty Length`,
  ]);
  return parseInt(stdout.trim(), 10);
}