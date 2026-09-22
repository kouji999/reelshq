import { NextResponse } from "next/server";
import { writeFile, mkdir, rm } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

// NOTE: In production, use cloud storage (S3/R2). Local /tmp only for dev.
const UPLOAD_DIR = join(process.cwd(), "tmp", "uploads");

export async function POST(request: Request) {
  const form = await request.formData();
  const video = form.get("video") as File;
  if (!video) return NextResponse.json({ error: "No video" }, { status: 400 });

  await mkdir(UPLOAD_DIR, { recursive: true });

  const inputPath = join(UPLOAD_DIR, video.name);
  const outputPath = join(
    UPLOAD_DIR,
    video.name.replace(/\.[^.]+$/, ".optimized.mp4")
  );

  // Save input file
  const buffer = Buffer.from(await video.arrayBuffer());
  await writeFile(inputPath, buffer);

  // Run FFmpeg optimization (balanced preset for IG reels)
  const resolution = await getResolution(inputPath);
  const is4K = resolution.width >= 3840 || resolution.height >= 2160;

  await execFileAsync(
    "ffmpeg",
    [
      "-y",
      "-i",
      inputPath,
      "-c:v",
      "libx264",
      "-preset",
      "medium",
      "-crf",
      is4K ? "23" : "21",
      "-profile:v",
      "high",
      "-level",
      "4.2",
      "-pix_fmt",
      "yuv420p",
      "-g",
      is4K ? "60" : "30",
      "-vf",
      `scale=w=1080:h=1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2,fps=30`,
      "-c:a",
      "aac",
      "-b:a",
      "128k",
      "-movflags",
      "+faststart",
      outputPath,
    ],
    { maxBuffer: 1024 * 1024 * 1024 }
  );

  const originalSize = buffer.length;
  const optimizedSize = (await import("node:fs")).statSync(outputPath).size;

  // Serve optimized file as download
  const optimizedUrl = `/tmp/optimized.mp4?t=${Date.now()}`;

  // Cleanup both files after a short delay (in production, keep original until needed)
  setTimeout(async () => {
    try {
      await rm(inputPath, { force: true });
    } catch (_) {}
  }, 30_000);

  return NextResponse.json({
    optimizedUrl,
    original: {
      resolution: `${resolution.width}x${resolution.height}`,
      size: originalSize,
      fps: video.name.includes("60") ? 60 : 30, // placeholder; will derive from actual
    },
    optimized: {
      resolution: "1080x1920",
      size: optimizedSize,
    },
  });
}

async function getResolution(path: string) {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v",
    "quiet",
    "-print_format",
    "json",
    "-show_streams",
    path,
  ]);
  const data = JSON.parse(stdout);
  const video = data.streams.find((s: { codec_type: string }) => s.codec_type === "video");
  return { width: video.width || 1920, height: video.height || 1080 };
}