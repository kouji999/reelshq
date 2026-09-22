#!/usr/bin/env node
import { probe } from "./probe";
import { encodeVideo } from "./encode";
import {
  INSTAGRAM_TARGETS,
  QualityMode,
  QUALITY_MODES,
  TargetSpec,
} from "./profiles";
import * as fs from "fs";
import * as path from "path";

// CLI entry point for the engine prototype (Phase 3)
// Usage: node dist/cli.js <input> [--target reels|feed|portrait] [--mode maximum|balanced|fast] [--out <path>]

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 1 || args[0] === "--help" || args[0] === "-h") {
    console.log(`
ReelsHQ Engine CLI (Phase 3 prototype)

USAGE:
  node dist/cli.js <input-video> [--target <target>] [--mode <mode>] [--out <path>]

ARGS:
  --target  Instagram format: reels, feed, portrait (default: reels)
  --mode    Quality mode: maximum, balanced, fast (default: balanced)
  --out     Output file path (default: <input>.optimized.mp4)

TARGETS:
${Object.entries(INSTAGRAM_TARGETS)
  .map(([k, v]) => `  ${k.padEnd(8)} ${v.width}x${v.height} @ ${v.fps}fps`)
  .join("\n")}

MODES:
${Object.entries(QUALITY_MODES)
  .map(([k, v]) => `  ${k.padEnd(8)} ${v}`)
  .join("\n")}
`);
    process.exit(args[0] === "--help" || args[0] === "-h" ? 0 : 1);
  }

  const inputPath = args[0];
  if (!fs.existsSync(inputPath)) {
    console.error(`ERROR: input file not found: ${inputPath}`);
    process.exit(1);
  }

  const targetArg = args[args.indexOf("--target") + 1] || "reels";
  const modeArg = args[args.indexOf("--mode") + 1] || "balanced";
  const outArg = args[args.indexOf("--out") + 1];

  if (!(targetArg in INSTAGRAM_TARGETS)) {
    console.error(`ERROR: invalid target "${targetArg}". Valid: ${Object.keys(INSTAGRAM_TARGETS).join(", ")}`);
    process.exit(1);
  }
  if (!(modeArg in QUALITY_MODES)) {
    console.error(`ERROR: invalid mode "${modeArg}". Valid: ${Object.keys(QUALITY_MODES).join(", ")}`);
    process.exit(1);
  }

  const target = INSTAGRAM_TARGETS[targetArg as keyof typeof INSTAGRAM_TARGETS] as TargetSpec;
  const mode = modeArg as QualityMode;
  const parsed = path.parse(inputPath);
  const outPath = outArg || path.join(parsed.dir, `${parsed.name}.optimized.${modeArg}.mp4`);

  console.log(`\n[ReelsHQ] Analyzing: ${path.basename(inputPath)}`);
  const info = await probe(inputPath);
  console.log(`  Resolution: ${info.resolution.width}x${info.resolution.height}`);
  console.log(`  FPS: ${info.fps}`);
  console.log(`  Codec: ${info.codec}`);
  console.log(`  Bitrate: ${info.bitrateKbps ? `${info.bitrateKbps} kbps` : "n/a"}`);
  console.log(`  Duration: ${info.duration.toFixed(2)}s`);
  console.log(`  Size: ${(info.sizeBytes / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Audio: ${info.audioCodec || "none"}`);
  console.log(`  HDR: ${info.isHDR ? "yes" : "no"}`);

  console.log(`\n[ReelsHQ] Optimizing → ${target.width}x${target.height} @ ${target.fps}fps (${mode})`);
  console.log(`[ReelsHQ] Output: ${outPath}`);

  const startTime = Date.now();
  const result = await encodeVideo({
    inputPath,
    outputPath: outPath,
    spec: target,
    mode,
    sourceInfo: {
      codec: info.codec,
      bitrateKbps: info.bitrateKbps,
      isHDR: info.isHDR,
    },
  });
  const totalSeconds = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n[DONE] Output: ${result.outputPath}`);
  console.log(`  Duration: ${info.duration.toFixed(2)}s`);
  console.log(`  File size: ${(result.size / 1024 / 1024).toFixed(2)} MB`);
  console.log(`  Processing time: ${totalSeconds}s`);
  console.log(`  Command:\n  ${result.command}`);
}

main().catch((err) => {
  console.error("\n[ReelsHQ] Fatal error:", err.message);
  process.exit(1);
});