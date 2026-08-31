import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { spawn } from 'node:child_process';
import { pipeline as streamPipeline } from 'node:stream/promises';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(ROOT, 'public/portfolio-assets');
const OUTPUT = path.join(ROOT, 'public/optimized-assets');
const MANIFEST = path.join(ROOT, 'src/generated/media-manifest.json');
const VERSION = 'media-v1';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const exists = async file => fs.access(file).then(() => true, () => false);
// A smaller image that costs more bytes than a larger one is never worth serving.
const usefulVariants = variants => variants.filter(v => !variants.some(other => other.width > v.width && other.bytes <= v.bytes));
const walk = async dir => (await Promise.all((await fs.readdir(dir, { withFileTypes: true })).map(async entry => {
  const full = path.join(dir, entry.name);
  return entry.isDirectory() ? walk(full) : [full];
}))).flat();
sharp.cache({ memory: 64, files: 0, items: 20 });
sharp.concurrency(2);

async function output(stem, suffix, bytes) {
  const name = `${stem}-${hash(bytes).slice(0, 12)}.${suffix}`;
  const target = path.join(OUTPUT, name);
  if (!await exists(target)) await fs.writeFile(target, bytes);
  return { url: `/optimized-assets/${name}`, bytes: bytes.length };
}

async function optimizeImage(file, stem) {
  const metadata = await sharp(file, { animated: true, limitInputPixels: false }).metadata();
  const animated = (metadata.pages || 1) > 1;
  // Atlases keep their exact registration and dimensions; ordinary images get srcset variants.
  const atlas = /software-icons|avatar-poses/.test(stem);
  const brand = /brand-app-icon/.test(stem);
  const widths = atlas ? [metadata.width] : brand ? [metadata.width] :
    [...new Set((animated ? [160, 320, 480, 720] : [480, 960, 1600, 2400]).map(w => Math.min(w, metadata.width)))];
  const variants = [];
  for (const width of widths) {
    const pipeline = sharp(file, { animated, limitInputPixels: false }).rotate();
    if (!atlas) pipeline.resize({ width, withoutEnlargement: true });
    let { data, info } = await pipeline.webp({
      quality: animated ? 82 : 88, alphaQuality: 100, effort: animated ? 4 : 5,
      ...(brand ? { lossless: true } : {}),
    }).toBuffer({ resolveWithObject: true });
    // Don't make a native-size WebP larger just by re-encoding it.
    if (info.width === metadata.width && path.extname(file) === '.webp' && data.length > (await fs.stat(file)).size) data = await fs.readFile(file);
    const check = await sharp(data, { animated: true, limitInputPixels: false }).metadata();
    if ((check.pages || 1) !== (metadata.pages || 1)) throw new Error(`Frame count changed: ${file}`);
    if (metadata.hasAlpha && !check.hasAlpha) throw new Error(`Alpha lost: ${file}`);
    if (animated && JSON.stringify(check.delay) !== JSON.stringify(metadata.delay)) throw new Error(`Animation timing changed: ${file}`);
    variants.push({ ...await output(`${stem}-${info.width}w`, 'webp', data), width: info.width, height: check.pageHeight || check.height });
  }
  let motion;
  // Opaque, constant-timing scene animations are much smaller as ordinary video.
  // Transparent character animations and variable-timing animations remain animated WebP.
  if (animated && metadata.pages > 100 && new Set(metadata.delay).size === 1) {
    const stats = await sharp(file, { animated: true, limitInputPixels: false }).stats();
    const opaque = !metadata.hasAlpha || stats.channels.at(-1).min === 255;
    if (opaque) motion = await optimizeSceneAnimation(file, stem, metadata);
  }
  return { kind: 'image', animated, alpha: metadata.hasAlpha, frames: metadata.pages || 1, variants: usefulVariants(variants), default: variants.at(-1).url, ...(motion ? { motion } : {}) };
}

async function optimizeSceneAnimation(file, stem, metadata) {
  const temporary = path.join(OUTPUT, `.${stem}.tmp.mp4`);
  const child = spawn(await ffmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-s', `${metadata.width}x${metadata.pageHeight}`, '-r', String(1000 / metadata.delay[0]), '-i', 'pipe:0', '-an', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '24', '-preset', 'medium', '-threads', '4', '-movflags', '+faststart', temporary], { windowsHide: true });
  let error = '';
  child.stderr.on('data', chunk => { error = (error + chunk).slice(-4000); });
  child.stdout.resume();
  const completed = new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', code => code === 0 ? resolve() : reject(new Error(error)));
  });
  await Promise.all([completed, streamPipeline(sharp(file, { animated: true, limitInputPixels: false }).removeAlpha().raw(), child.stdin)]);
  const video = await output(stem, 'mp4', await fs.readFile(temporary));
  await fs.unlink(temporary);
  const poster = await output(`${stem}-poster`, 'webp', await sharp(file).webp({ quality: 88 }).toBuffer());
  return { ...video, poster: poster.url, posterBytes: poster.bytes, width: metadata.width, height: metadata.pageHeight, frames: metadata.pages, duration: metadata.pages * metadata.delay[0] / 1000 };
}

function readGlb(bytes) {
  if (bytes.readUInt32LE(0) !== 0x46546c67) throw new Error('Not a GLB');
  const length = bytes.readUInt32LE(12);
  return { document: JSON.parse(bytes.subarray(20, 20 + length)), binary: bytes.subarray(28 + length) };
}
function writeGlb(document, parts) {
  let offset = 0;
  const chunks = parts.map((part, index) => {
    document.bufferViews[index].byteOffset = offset;
    document.bufferViews[index].byteLength = part.length;
    const padded = Buffer.concat([part, Buffer.alloc((4 - part.length % 4) % 4)]);
    offset += padded.length;
    return padded;
  });
  document.buffers[0].byteLength = offset;
  let json = Buffer.from(JSON.stringify(document));
  json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
  const header = Buffer.alloc(20);
  header.writeUInt32LE(0x46546c67); header.writeUInt32LE(2, 4);
  header.writeUInt32LE(28 + json.length + offset, 8);
  header.writeUInt32LE(json.length, 12); header.writeUInt32LE(0x4e4f534a, 16);
  const binaryHeader = Buffer.alloc(8);
  binaryHeader.writeUInt32LE(offset); binaryHeader.writeUInt32LE(0x004e4942, 4);
  return Buffer.concat([header, json, binaryHeader, ...chunks]);
}
async function optimizeModel(file, stem) {
  const original = await fs.readFile(file);
  const variants = [];
  for (const maxSize of [1024, 2048]) {
    const { document, binary } = readGlb(original);
    const parts = document.bufferViews.map(view => binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength));
    for (const image of document.images) {
      const dataMap = /normal|orm/i.test(image.name || '');
      const texture = await sharp(parts[image.bufferView]).resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
        .webp({ lossless: dataMap, quality: 92, alphaQuality: 100, effort: 6 }).toBuffer();
      parts[image.bufferView] = texture;
      image.mimeType = 'image/webp';
    }
    for (const texture of document.textures) {
      texture.extensions = { ...texture.extensions, EXT_texture_webp: { source: texture.source } };
      delete texture.source;
    }
    for (const field of ['extensionsUsed', 'extensionsRequired']) document[field] = [...new Set([...(document[field] || []), 'EXT_texture_webp'])];
    // All geometry buffer views, nodes, materials, alpha modes, lights and effects stay intact.
    const bytes = writeGlb(document, parts);
    variants.push({ ...await output(`${stem}-${maxSize}`, 'glb', bytes), maxTexture: maxSize });
  }
  return { kind: 'model', variants, mobile: variants[0].url, default: variants[1].url };
}

async function ffmpegPath() {
  if (process.env.PORTFOLIO_FFMPEG) return process.env.PORTFOLIO_FFMPEG;
  const vendor = path.join(ROOT, 'scripts/_vendor/imageio_ffmpeg/binaries');
  if (await exists(vendor)) {
    const name = (await fs.readdir(vendor)).find(n => /^ffmpeg.*\.exe$/.test(n));
    if (name) return path.join(vendor, name);
  }
  return 'ffmpeg';
}
async function run(executable, args) {
  await new Promise((resolve, reject) => {
    const child = spawn(executable, args, { windowsHide: true });
    let error = '';
    child.stderr.on('data', chunk => { error = (error + chunk).slice(-6000); });
    child.stdout.resume();
    child.on('error', () => reject(new Error('Changed video requires FFmpeg on PATH or PORTFOLIO_FFMPEG. Existing generated videos can be committed for cloud builds.')));
    child.on('close', code => code === 0 ? resolve() : reject(new Error(error)));
  });
}
async function optimizeVideo(file, stem) {
  const extension = path.extname(file).slice(1);
  const alpha = extension === 'webm';
  const variants = [];
  for (const [width, quality] of [[1280, alpha ? 35 : 27], [1600, alpha ? 32 : 24]]) {
    const temporary = path.join(OUTPUT, `.${stem}-${width}.tmp.${extension}`);
    const inputOptions = alpha ? ['-c:v', 'libvpx-vp9'] : [];
    const encoding = alpha ? ['-c:v', 'libvpx-vp9', '-pix_fmt', 'yuva420p', '-b:v', '0', '-crf', String(quality), '-auto-alt-ref', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4'] :
      ['-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', String(quality), '-preset', 'slow', '-movflags', '+faststart'];
    await run(await ffmpegPath(), ['-y', '-hide_banner', '-loglevel', 'error', ...inputOptions, '-i', file, '-vf', `scale=${width}:-2:flags=lanczos`, '-an', ...encoding, '-threads', '4', temporary]);
    const bytes = await fs.readFile(temporary);
    variants.push({ ...await output(`${stem}-${width}`, extension, bytes), width });
    await fs.unlink(temporary); // Exact generated temporary file, never a source asset.
  }
  return { kind: 'video', alpha, variants, mobile: variants[0].url, default: variants[1].url };
}

await fs.mkdir(OUTPUT, { recursive: true });
const previous = await fs.readFile(MANIFEST, 'utf8').then(JSON.parse, () => ({ entries: {} }));
const entries = {};
const checkOnly = process.argv.includes('--check');
for (const file of (await walk(SOURCE)).sort()) {
  const extension = path.extname(file).toLowerCase();
  if (!['.jpg', '.jpeg', '.png', '.webp', '.gif', '.webm', '.mp4', '.glb'].includes(extension)) continue;
  const url = `/portfolio-assets/${path.relative(SOURCE, file).split(path.sep).join('/')}`;
  const source = await fs.readFile(file);
  const sourceHash = hash(source);
  const saved = previous.entries[url];
  const revision = ['.webm', '.mp4', '.glb'].includes(extension) ? 'v1' : 'image-v2';
  const savedFiles = saved ? [...saved.variants.map(v => v.url), ...(saved.motion ? [saved.motion.url, saved.motion.poster] : [])] : [];
  const outputsExist = saved && (await Promise.all(savedFiles.map(url => exists(path.join(ROOT, 'public', url))))).every(Boolean);
  if (previous.version === VERSION && (saved?.revision || 'v1') === revision && saved?.sourceHash === sourceHash && outputsExist) {
    entries[url] = { ...saved, variants: usefulVariants(saved.variants) };
    continue;
  }
  if (checkOnly) throw new Error(`Stale or missing optimized media: ${url}. Run pnpm media before committing.`);
  const stem = path.relative(SOURCE, file).replace(/\.[^.]+$/, '').replace(/[/\\]/g, '-');
  const optimized = extension === '.glb' ? await optimizeModel(file, stem) : ['.webm', '.mp4'].includes(extension) ? await optimizeVideo(file, stem) : await optimizeImage(file, stem);
  entries[url] = { revision, sourceHash, sourceBytes: source.length, ...optimized };
  console.log(`${path.basename(file)}: ${(source.length / 1048576).toFixed(2)} MiB -> ${optimized.variants.map(v => (v.bytes / 1048576).toFixed(2)).join(' / ')} MiB`);
}
if (!checkOnly) {
  await fs.mkdir(path.dirname(MANIFEST), { recursive: true });
  const contents = `${JSON.stringify({ version: VERSION, entries }, null, 2)}\n`;
  if (contents !== await fs.readFile(MANIFEST, 'utf8').catch(() => '')) await fs.writeFile(MANIFEST, contents);
  const current = new Set(Object.values(entries).flatMap(entry => [...entry.variants.map(v => v.url), ...(entry.motion ? [entry.motion.url, entry.motion.poster] : [])]));
  const backup = path.join(ROOT, '.local-backups', `optimized-obsolete-${Date.now()}`);
  let moved = 0;
  for (const name of await fs.readdir(OUTPUT)) {
    if (!/-[0-9a-f]{12}\.(webp|webm|mp4|glb)$/.test(name) || current.has(`/optimized-assets/${name}`)) continue;
    const target = path.resolve(OUTPUT, name);
    if (path.dirname(target) !== OUTPUT) throw new Error('Generated cleanup target outside output directory');
    await fs.mkdir(backup, { recursive: true });
    await fs.rename(target, path.join(backup, name));
    moved++;
  }
  if (moved) console.log(`Archived ${moved} obsolete generated files to ${path.relative(ROOT, backup)}; no originals removed.`);
}
console.log(`PASS: ${Object.keys(entries).length} source media entries ready; originals unchanged.`);
