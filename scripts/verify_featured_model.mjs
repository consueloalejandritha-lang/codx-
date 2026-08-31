import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { Box3, Vector3, BufferGeometry, BufferAttribute } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { loadModule } from './load_source.mjs';
import sharp from 'sharp';

const filename = process.argv[2] ?? 'public/portfolio-assets/12-models/pistol-blend-baked.glb';
const { categories, featuredProjects } = await loadModule('src/data/portfolio.ts');
const interactiveItems = categories.flatMap(category => category.items).filter(item => item.model);
assert.deepEqual(interactiveItems.map(item => item.id), ['plasticity-01'], 'Only archive Plasticity 01 is interactive');
assert.equal(interactiveItems[0].image, '/portfolio-assets/03-plasticity/plasticity-01.jpg');
assert.ok(featuredProjects.every(project => !project.model), 'Featured cards remain static');
assert.equal(featuredProjects[2].image, '/portfolio-assets/03-plasticity/plasticity-06.jpg');
const bytes = fs.readFileSync(filename);
assert.equal(bytes.readUInt32LE(0), 0x46546c67);
assert.equal(bytes.readUInt32LE(4), 2);
assert.equal(bytes.readUInt32LE(8), bytes.length);
const jsonLength = bytes.readUInt32LE(12);
const document = JSON.parse(bytes.subarray(20, 20 + jsonLength).toString());
const binary = bytes.subarray(28 + jsonLength);
let largestTexture = 0;
for (const image of document.images ?? []) {
  assert.ok(Number.isInteger(image.bufferView), 'All textures must be embedded');
  const view = document.bufferViews[image.bufferView];
  const data = binary.subarray(view.byteOffset, view.byteOffset + view.byteLength);
  const metadata = await sharp(data).metadata();
  assert.ok(['png', 'webp'].includes(metadata.format), 'Embedded browser-compatible texture');
  largestTexture = Math.max(largestTexture, metadata.width, metadata.height);
}
for (const view of document.bufferViews) {
  assert.equal((view.byteOffset ?? 0) % 4, 0);
  assert.ok((view.byteOffset ?? 0) + view.byteLength <= binary.length);
}
assert.ok(largestTexture <= 2048, 'Unexpected high-resolution texture');
assert.ok(document.materials.some(material => material.name.includes('MuzzleFlash1')), 'Original flame material is included');
assert.ok(document.materials.some(material => material.name.includes('MuzzleFlashSmoke')), 'Original smoke material is included');
for (const material of document.materials) {
  assert.ok(material.pbrMetallicRoughness.baseColorTexture, 'Baked base color is present');
  assert.ok(material.pbrMetallicRoughness.metallicRoughnessTexture, 'Baked metallic/roughness is present');
  assert.ok(material.normalTexture, 'Baked normal is present');
  assert.ok(material.emissiveTexture, 'Baked emission is present');
}
// Headless geometry validation: omit browser-only texture decoding, retain every mesh/transform.
document.images = [];
document.textures = [];
document.materials = [];
for (const mesh of document.meshes) for (const primitive of mesh.primitives) delete primitive.material;
let json = Buffer.from(JSON.stringify(document));
json = Buffer.concat([json, Buffer.alloc((4 - json.length % 4) % 4, 32)]);
const header = Buffer.alloc(20);
header.writeUInt32LE(0x46546c67, 0);
header.writeUInt32LE(2, 4);
header.writeUInt32LE(28 + json.length + binary.length, 8);
header.writeUInt32LE(json.length, 12);
header.writeUInt32LE(0x4e4f534a, 16);
const binHeader = Buffer.alloc(8);
binHeader.writeUInt32LE(binary.length, 0);
binHeader.writeUInt32LE(0x004e4942, 4);
const payload = Buffer.concat([header, json, binHeader, binary]);
// Decode the exact shipped Draco payload without requiring a browser worker.
const decoderModule = { exports: {} };
new Function('module', 'exports', 'require', '__dirname', fs.readFileSync('public/vendor/draco/draco_decoder.js', 'utf8'))(decoderModule, decoderModule.exports, createRequire(import.meta.url), path.resolve('public/vendor/draco'));
const draco = await decoderModule.exports();
const dracoLoader = {
  preload() {},
  decodeDracoFile(data, onLoad, attributeIds, attributeTypes) {
    const decoder = new draco.Decoder();
    const buffer = new draco.DecoderBuffer();
    buffer.Init(new Int8Array(data), data.byteLength);
    const mesh = new draco.Mesh();
    const result = decoder.DecodeBufferToMesh(buffer, mesh);
    assert.ok(result.ok(), 'Compressed mesh decodes successfully');
    const geometry = new BufferGeometry();
    for (const [name, id] of Object.entries(attributeIds)) {
      const attribute = decoder.GetAttributeByUniqueId(mesh, id);
      const values = new draco.DracoFloat32Array();
      decoder.GetAttributeFloatForAllPoints(mesh, attribute, values);
      const array = new Float32Array(values.size());
      for (let i = 0; i < array.length; i++) array[i] = values.GetValue(i);
      geometry.setAttribute(name, new BufferAttribute(array, attribute.num_components()));
      draco.destroy(values);
    }
    const indices = new Uint32Array(mesh.num_faces() * 3);
    const face = new draco.DracoInt32Array();
    for (let i = 0; i < mesh.num_faces(); i++) {
      decoder.GetFaceFromMesh(mesh, i, face);
      for (let j = 0; j < 3; j++) indices[i * 3 + j] = face.GetValue(j);
    }
    geometry.setIndex(new BufferAttribute(indices, 1));
    [face, mesh, buffer, decoder].forEach(value => draco.destroy(value));
    onLoad(geometry);
  },
};
const { scene } = await new GLTFLoader().setDRACOLoader(dracoLoader).parseAsync(payload.buffer.slice(payload.byteOffset, payload.byteOffset + payload.byteLength), '');
scene.updateMatrixWorld(true);
const bounds = new Box3().setFromObject(scene);
assert.ok(!bounds.isEmpty());
const meshes = [];
scene.traverse((object) => {
  if (!object.isMesh) return;
  const box = new Box3().setFromObject(object);
  meshes.push({ name: object.name, size: box.getSize(new Vector3()).toArray().map(v => +v.toFixed(2)), center: box.getCenter(new Vector3()).toArray().map(v => +v.toFixed(2)) });
});
const { prepareModel } = await loadModule('src/components/modelScene.ts');
const prepared = prepareModel(scene);
prepared.updateMatrixWorld(true);
const visibleBounds = new Box3();
let visibleMeshes = 0;
prepared.traverseVisible((object) => {
  if (!object.isMesh) return;
  visibleMeshes++;
  visibleBounds.union(new Box3().setFromObject(object));
});
assert.equal(visibleMeshes, meshes.length, 'Preserve every mesh, including flames and smoke');
assert.ok(visibleBounds.getCenter(new Vector3()).length() < 0.00001, 'Centered rotation pivot');
assert.ok(Math.abs(visibleBounds.getSize(new Vector3()).length() - 2.8) < 0.00001, 'Predictable model framing');
console.log(JSON.stringify({bytes: bytes.length, largestTexture, meshes: meshes.length, visibleMeshes, originalSceneSize: bounds.getSize(new Vector3()).toArray(), displaySize: visibleBounds.getSize(new Vector3()).toArray(), displayCenter: visibleBounds.getCenter(new Vector3()).toArray()}, null, 2));
