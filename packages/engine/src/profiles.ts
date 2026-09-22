export type QualityMode = "maximum" | "balanced" | "fast";

export interface OptimizationProfile {
  id: string;
  name: string;
  codec: string;
  preset: string;
  crf: number | null;
  bitrate: string | null;
  maxrate: string | null;
  bufsize: string | null;
  profile: string;
  level: string;
  gop: number;
  pixelFormat: string;
  audioBitrate: string;
  videoFilters: string[];
  scale?: string;
}

export interface TargetSpec {
  width: number;
  height: number;
  fps: number;
}

export const INSTAGRAM_TARGETS = {
  reels: { width: 1080, height: 1920, fps: 30 },
  feed: { width: 1080, height: 1080, fps: 30 },
  portrait: { width: 1080, height: 1350, fps: 30 },
} as const;

export const QUALITY_MODES: Record<QualityMode, string> = {
  maximum: "Prioritize visual quality (larger file)",
  balanced: "Balance quality and file size (recommended)",
  fast: "Prioritize file size and processing speed",
};

export function buildOptimizationProfile(
  spec: TargetSpec,
  mode: QualityMode = "balanced"
): OptimizationProfile {
  const is4K = spec.width >= 3840 || spec.height >= 2160;

  const profiles: Record<QualityMode, Omit<OptimizationProfile, "id" | "name">> = {
    maximum: {
      codec: "libx264",
      preset: "slow",
      crf: 18,
      bitrate: null,
      maxrate: null,
      bufsize: null,
      profile: "high",
      level: "4.2",
      gop: is4K ? 60 : 30,
      pixelFormat: "yuv420p",
      audioBitrate: "192k",
      videoFilters: [],
    },
    balanced: {
      codec: "libx264",
      preset: "medium",
      crf: 23,
      bitrate: null,
      maxrate: null,
      bufsize: null,
      profile: "high",
      level: "4.2",
      gop: is4K ? 60 : 30,
      pixelFormat: "yuv420p",
      audioBitrate: "128k",
      videoFilters: [],
    },
    fast: {
      codec: "libx264",
      preset: "veryfast",
      crf: 28,
      bitrate: "8M",
      maxrate: "8M",
      bufsize: "16M",
      profile: "main",
      level: "4.0",
      gop: is4K ? 60 : 30,
      pixelFormat: "yuv420p",
      audioBitrate: "96k",
      videoFilters: [],
    },
  };

  const base = profiles[mode];
  const needsScale =
    base.scale || (spec.width && spec.height
      ? `scale=w=${spec.width}:h=${spec.height}:force_original_aspect_ratio=decrease,pad=${spec.width}:${spec.height}:(ow-iw)/2:(oh-ih)/2`
      : "");

  return {
    ...base,
    id: `ig-${mode}-${spec.height}p${spec.fps}`,
    name: `Instagram ${mode} ${spec.height}p`,
    videoFilters: [needsScale].filter(Boolean),
  };
}

export interface BuildCommandArgs {
  inputPath: string;
  outputPath: string;
  spec: TargetSpec;
  mode?: QualityMode;
  sourceInfo?: {
    codec?: string;
    bitrateKbps?: number | null;
    isHDR?: boolean;
  };
}

export function clampFps(fps: number, maxFps: number): number {
  return Math.min(fps, maxFps);
}