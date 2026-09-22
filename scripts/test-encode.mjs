import { probe } from '@reelshq/engine';
import { encodeVideo } from '@reelshq/engine';
import { INSTAGRAM_TARGETS } from '@reelshq/engine';
import * as path from 'path';
import * as fs from 'fs';

const inputPath = 'test-data/sample-4k60.mp4';
const parsed = path.parse(inputPath);
const outPath = path.join(parsed.dir, parsed.name + '.optimized.balanced.mp4');

console.log('input:', inputPath);
console.log('parsed:', parsed);
console.log('outPath:', outPath);
console.log('input exists:', fs.existsSync(inputPath));
const info = await probe(inputPath);
console.log('probe ok:', info.resolution, info.fps, info.codec);
const result = await encodeVideo({
  inputPath,
  outputPath: outPath,
  spec: INSTAGRAM_TARGETS.reels,
  mode: 'balanced',
  sourceInfo: { codec: info.codec, bitrateKbps: info.bitrateKbps, isHDR: info.isHDR },
});
console.log('DONE size:', result.size);