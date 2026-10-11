import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import sharp from 'sharp';
import { loadModule } from './load_source.mjs';

const manifest = JSON.parse(fs.readFileSync('src/generated/media-manifest.json', 'utf8'));
const { assetUrl, imageProps, motionAsset } = await loadModule('src/media.ts');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const glb = bytes => {
  const length = bytes.readUInt32LE(12);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  const doc = JSON.parse(bytes.subarray(20, 20 + length));
  const binary = bytes.subarray(28 + length);
  return { doc, part: index => { const view = doc.bufferViews[index]; return binary.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength); } };
};
let animations = 0;
let variants = 0;
let textureChecks = 0;
let expectedTextureChecks = 0;
for (const [source, entry] of Object.entries(manifest.entries)) {
  const original = fs.readFileSync(`public${source}`);
  assert.equal(hash(original), entry.sourceHash, `Stale source: ${source}`);
  assert.equal(original.length, entry.sourceBytes);
  assert.equal(assetUrl(source), entry.default);
  assert.equal(assetUrl(source, true), entry.mobile || entry.default);
  const originalImage = entry.kind === 'image' ? await sharp(original, { animated: true, limitInputPixels: false }).metadata() : null;
  const originalModel = entry.kind === 'model' ? glb(original) : null;
  if (originalModel) expectedTextureChecks += originalModel.doc.images.length * entry.variants.length;
  if (entry.animated) animations++;
  for (const variant of entry.variants) {
    variants++;
    const data = fs.readFileSync(`public${variant.url}`);
    assert.equal(data.length, variant.bytes);
    assert.ok(variant.url.includes(hash(data).slice(0, 12)), 'Filename reflects actual content');
    if (originalImage) {
      const metadata = await sharp(data, { animated: true, limitInputPixels: false }).metadata();
      assert.equal(metadata.width, variant.width);
      assert.equal(metadata.pageHeight || metadata.height, variant.height);
      assert.equal(metadata.pages || 1, originalImage.pages || 1, `Frame count: ${source}`);
      if (originalImage.hasAlpha) assert.equal(metadata.hasAlpha, true, `Alpha channel: ${source}`);
      if (entry.animated) assert.deepEqual(metadata.delay, originalImage.delay, `Timing: ${source}`);
      if (/avatar-poses|software-icons/.test(source)) assert.equal(metadata.width, originalImage.width, 'Atlas coordinates unchanged');
      assert.ok(imageProps(source).srcSet.includes(`${variant.url} ${variant.width}w`));
    }
    if (originalModel) {
      const result = glb(data);
      for (const field of ['nodes', 'meshes', 'materials', 'animations', 'scenes', 'scene', 'accessors', 'samplers']) assert.deepEqual(result.doc[field], originalModel.doc[field], `Model ${field} unchanged`);
      const imageViews = new Set(originalModel.doc.images.map(image => image.bufferView));
      for (let i = 0; i < result.doc.bufferViews.length; i++) {
        if (!imageViews.has(i)) assert.deepEqual(result.part(i), originalModel.part(i), 'Geometry bytes unchanged');
      }
      assert.equal(result.doc.textures.length, originalModel.doc.textures.length);
      result.doc.textures.forEach((texture, i) => assert.equal(texture.extensions.EXT_texture_webp.source, originalModel.doc.textures[i].source));
      for (const image of result.doc.images) {
        const metadata = await sharp(result.part(image.bufferView)).metadata();
        assert.equal(metadata.format, 'webp');
        assert.ok(metadata.width <= variant.maxTexture && metadata.height <= variant.maxTexture);
        const originalMetadata = await sharp(originalModel.part(image.bufferView)).metadata();
        if (originalMetadata.hasAlpha && !metadata.hasAlpha) {
          const alpha = await sharp(originalModel.part(image.bufferView)).extractChannel('alpha').raw().toBuffer();
          assert.ok(alpha.every(value => value === 255), 'Only an entirely opaque alpha channel may be omitted');
        }
        // Full-resolution data maps must remain numerically identical (no lossy normals/roughness).
        if (variant.maxTexture === 2048 && /normal|orm/i.test(image.name)) {
          const before = await sharp(originalModel.part(image.bufferView)).removeAlpha().raw().toBuffer();
          const after = await sharp(result.part(image.bufferView)).removeAlpha().raw().toBuffer();
          assert.deepEqual(after, before);
        }
        textureChecks++;
      }
    }
  }
  if (entry.motion) {
    assert.equal(motionAsset(source).url, entry.motion.url);
    assert.equal(new Set(originalImage.delay).size, 1, 'Video only for constant timing');
    assert.equal(entry.motion.frames, originalImage.pages);
    assert.equal(entry.motion.duration, originalImage.pages * originalImage.delay[0] / 1000);
    const stats = await sharp(original, { animated: true, limitInputPixels: false }).stats();
    assert.ok(!originalImage.hasAlpha || stats.channels.at(-1).min === 255, 'Never discard visible animation transparency');
    for (const [url, bytes] of [[entry.motion.url, entry.motion.bytes], [entry.motion.poster, entry.motion.posterBytes]]) {
      const data = fs.readFileSync(`public${url}`);
      assert.equal(data.length, bytes);
      assert.ok(url.includes(hash(data).slice(0, 12)));
    }
  }
}
assert.equal(animations, 8);
assert.equal(textureChecks, expectedTextureChecks);
assert.equal(assetUrl('/unknown-file.png'), '/unknown-file.png');
console.log(`PASS: ${variants} variants, ${animations} animations retain frames/timing/alpha; both models retain geometry/materials/effects; ${textureChecks} model textures checked; source hashes match.`);
