// Tileable, matching PBR channels for the helmet's UV-mapped shell and vents.
// Run with Node from the repository root; files are editable source assets and
// are embedded into the exported GLB, not served separately by the website.
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const size = 1024;
const directory = path.resolve('assets/helmet-pbr');
await fs.mkdir(directory, { recursive: true });

function hash(x, y) {
  let n = Math.imul(x + 0x9e3779b9, 374761393) ^ Math.imul(y + 0x85ebca6b, 668265263);
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 0xffffffff;
}
function clamp(value) { return Math.max(0, Math.min(255, Math.round(value))); }
function put(buffer, index, r, g = r, b = r) {
  buffer[index] = clamp(r);
  buffer[index + 1] = clamp(g);
  buffer[index + 2] = clamp(b);
}
async function save(name, buffer) {
  const filename = path.join(directory, name);
  await sharp(buffer, { raw: { width: size, height: size, channels: 3 } })
    .png({ compressionLevel: 9 }).toFile(filename);
  return filename;
}

function makeSet(kind) {
  const basecolor = Buffer.alloc(size * size * 3);
  const metallic = Buffer.alloc(size * size * 3);
  const roughness = Buffer.alloc(size * size * 3);
  const normal = Buffer.alloc(size * size * 3);
  const heights = new Float32Array(size * size);
  const carbon = kind === 'carbon';

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const pixel = y * size + x;
    const offset = pixel * 3;
    const noise = hash(x, y) - 0.5;
    if (carbon) {
      const cell = 16;
      const col = Math.floor(x / cell);
      const row = Math.floor(y / cell);
      const u = (x % cell) / cell;
      const v = (y % cell) / cell;
      const warpOver = ((col - row + size) % 4) < 2;
      const thread = warpOver ? u : v;
      const cross = warpOver ? v : u;
      const filament = Math.sin(thread * Math.PI * 2) * 0.5 + 0.5;
      const edge = Math.pow(Math.sin(cross * Math.PI), 1.8);
      const weave = 0.58 + 0.3 * edge + 0.13 * filament + 0.045 * noise;
      put(basecolor, offset, 2 + 11 * weave, 14 + 46 * weave, 17 + 45 * weave);
      put(metallic, offset, 44 + 28 * edge);
      put(roughness, offset, 50 + 21 * (1 - edge) + 8 * noise);
      heights[pixel] = 0.37 + 0.21 * edge + 0.025 * filament;
    } else {
      // Staggered perforations with a subtly raised rim, inspired by the
      // reference helmet's black mesh vents rather than painted dots.
      const spacing = 24;
      const row = Math.round(y / (spacing * 0.86));
      const localX = ((x - (row % 2) * spacing / 2) % spacing + spacing) % spacing;
      const localY = ((y % (spacing * 0.86)) + spacing * 0.86) % (spacing * 0.86);
      const distance = Math.hypot(localX - spacing / 2, localY - spacing * 0.43);
      const hole = distance < 5.1;
      const lip = distance >= 5.1 && distance < 7.5;
      const level = hole ? 4 : lip ? 38 : 19;
      put(basecolor, offset, level * 0.82 + 2 * noise, level * 0.98 + 2 * noise, level + 2 * noise);
      put(metallic, offset, hole ? 12 : 48);
      put(roughness, offset, hole ? 112 : lip ? 74 : 92);
      heights[pixel] = hole ? 0.12 : lip ? 0.61 : 0.42;
    }
  }

  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    const at = (row, column) => heights[((row + size) % size) * size + ((column + size) % size)];
    const dx = at(y, x + 1) - at(y, x - 1);
    const dy = at(y + 1, x) - at(y - 1, x);
    const strength = carbon ? 1.25 : 1.9;
    const nx = -dx * strength;
    const ny = -dy * strength;
    const length = Math.hypot(nx, ny, 1);
    put(normal, (y * size + x) * 3,
      127.5 + 127.5 * nx / length,
      127.5 + 127.5 * ny / length,
      127.5 + 127.5 / length);
  }
  return { basecolor, metallic, roughness, normal };
}

for (const kind of ['carbon', 'vent']) {
  const textures = makeSet(kind);
  for (const [channel, buffer] of Object.entries(textures)) {
    const filename = await save(`${kind}_${channel}.png`, buffer);
    const { size: bytes } = await fs.stat(filename);
    console.log(`${path.basename(filename)} ${(bytes / 1024).toFixed(0)} KiB`);
  }
}
