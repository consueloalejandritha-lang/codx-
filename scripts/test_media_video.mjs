// Optional local media QA; cloud builds use committed variants and don't need FFmpeg.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
const vendor = 'scripts/_vendor/imageio_ffmpeg/binaries';
const ffmpeg = process.env.PORTFOLIO_FFMPEG || (fs.existsSync(vendor) && path.resolve(vendor, fs.readdirSync(vendor).find(name => /^ffmpeg.*\.exe$/.test(name)))) || 'ffmpeg';
const entries = JSON.parse(fs.readFileSync('src/generated/media-manifest.json', 'utf8')).entries;
let checked = 0;
const decode = (url, alpha) => {
  const result = spawnSync(ffmpeg, ['-hide_banner', ...(alpha ? ['-c:v', 'libvpx-vp9'] : []), '-i', `public${url}`, '-an', '-f', 'null', '-'], { windowsHide: true, encoding: 'utf8', maxBuffer: 4 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr || result.error?.message);
  const duration = result.stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
  return { frames: Number([...result.stderr.matchAll(/frame=\s*(\d+)/g)].at(-1)?.[1]), duration: Number(duration[1]) * 3600 + Number(duration[2]) * 60 + Number(duration[3]) };
};
for (const [source, entry] of Object.entries(entries)) {
  const original = entry.kind === 'video' ? decode(source, entry.alpha) : null;
  const videos = original ? entry.variants.map(v => ({ ...v, alpha: entry.alpha, ...original })) : entry.motion ? [entry.motion] : [];
  for (const video of videos) {
    const input = [...(video.alpha ? ['-c:v', 'libvpx-vp9'] : []), '-i', `public${video.url}`];
    const decoded = decode(video.url, video.alpha);
    assert.equal(decoded.frames, video.frames, `Video frame count: ${video.url}`);
    assert.ok(Math.abs(decoded.duration - video.duration) < 0.05, 'Animation duration unchanged');
    if (video.alpha) {
      const alpha = spawnSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', ...input, '-ss', String(video.duration / 2), '-vf', 'alphaextract', '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'gray', '-'], { windowsHide: true, maxBuffer: 8 * 1024 * 1024 });
      assert.equal(alpha.status, 0, alpha.stderr.toString());
      assert.ok(alpha.stdout.includes(0) && alpha.stdout.includes(255), 'Transparent and solid video pixels preserved');
    }
    checked++;
    console.log(`PASS: decoded ${video.frames} frames${video.alpha ? ' with real alpha pixels' : ''}: ${video.url}`);
  }
}
console.log(`PASS: ${checked} optimized videos decode with original frame counts.`);
