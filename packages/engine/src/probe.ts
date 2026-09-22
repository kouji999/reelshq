import { execFile } from "child_process";
import { promisify } from "util";

const execFileP = promisify(execFile);

export interface VideoInfo {
  resolution: { width: number; height: number };
  fps: number;
  codec: string;
  bitrateKbps: number | null;
  duration: number;
  sizeBytes: number;
  audioCodec: string | null;
  container: string;
  pixelFormat: string | null;
  colorSpace: string | null;
  isHDR: boolean;
}

export async function probe(inputPath: string): Promise<VideoInfo> {
  const { stdout } = await execFileP(
    "ffprobe",
    [
      "-v", "quiet",
      "-print_format", "json",
      "-show_format",
      "-show_streams",
      inputPath,
    ],
    { maxBuffer: 10 * 1024 * 1024 }
  );

  const data = JSON.parse(stdout);
  const videoStream = data.streams?.find(
    (s: { codec_type?: string }) => s.codec_type === "video"
  );
  const audioStream = data.streams?.find(
    (s: { codec_type?: string }) => s.codec_type === "audio"
  );

  if (!videoStream) {
    throw new Error("No video stream found in file");
  }

  const fps = parseFps(videoStream.avg_frame_rate || videoStream.r_frame_rate);
  const height = videoStream.height || 0;
  const width = videoStream.width || 0;

  return {
    resolution: { width, height },
    fps,
    codec: videoStream.codec_name || "unknown",
    bitrateKbps: data.format?.bit_rate
      ? Math.round(parseInt(data.format.bit_rate, 10) / 1000)
      : null,
    duration: parseFloat(data.format?.duration || videoStream.duration || "0"),
    sizeBytes: parseInt(data.format?.size || "0", 10),
    audioCodec: audioStream?.codec_name || null,
    container: data.format?.format_name || "unknown",
    pixelFormat: videoStream.pix_fmt || null,
    colorSpace: videoStream.color_space || null,
    isHDR: isHdr(videoStream),
  };
}

function parseFps(rate: string | undefined): number {
  if (!rate) return 0;
  const [numStr, denStr] = rate.split("/");
  const num = parseInt(numStr, 10);
  const den = parseInt(denStr || "1", 10);
  if (!den) return 0;
  return parseFloat((num / den).toFixed(2));
}

function isHdr(stream: Record<string, unknown>): boolean {
  const colorTransfer = String(stream.color_transfer || "").toLowerCase();
  const colorPrimaries = String(stream.color_primaries || "").toLowerCase();
  return (
    colorTransfer.includes("smpte2084") || // PQ
    colorTransfer.includes("arib-std-b67") || // HLG
    colorPrimaries.includes("bt2020")
  );
}