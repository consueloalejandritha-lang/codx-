import assert from 'node:assert/strict';
import { loadModule } from './load_source.mjs';
const { pointerRotation, approachAngle, MAX_PITCH, MAX_YAW } = await loadModule('src/components/modelMotion.ts');
assert.equal(MAX_PITCH, 0.65, 'Both interactive models use the wider vertical rotation range');
assert.equal(MAX_YAW, 1.75, 'Both interactive models use the wider horizontal rotation range');
assert.deepEqual(pointerRotation(0, 0), { pitch: 0, yaw: 0 });
assert.deepEqual(pointerRotation(2, -2), { pitch: -MAX_PITCH, yaw: MAX_YAW });
assert.deepEqual(pointerRotation(-1, 1), { pitch: MAX_PITCH, yaw: -MAX_YAW });
for (const fps of [30, 60, 120]) {
  let yaw = 0;
  for (let i = 0; i < fps * 2; i++) yaw = approachAngle(yaw, MAX_YAW, 1 / fps);
  assert.equal(yaw, MAX_YAW, `Tracking converges at ${fps}fps`);
  for (let i = 0; i < fps * 2; i++) yaw = approachAngle(yaw, 0, 1 / fps);
  assert.equal(yaw, 0, `Returns exactly to default at ${fps}fps`);
}
console.log('PASS: pointer mapping, rotation limits, smooth tracking, return to zero at 30/60/120fps.');
