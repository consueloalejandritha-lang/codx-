import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadModule } from './load_source.mjs';

const { createModelTouch } = await loadModule('src/components/modelTouch.ts');
const touch = createModelTouch();
assert.equal(touch.move(1, 20, 20, 300, 200), undefined);
assert.equal(touch.begin(2, 100, 100, false), false);
assert.equal(touch.begin(1, 100, 100, true), true);
assert.equal(touch.active(), true);
assert.equal(touch.begin(2, 100, 100, true), false, 'Second finger cannot take over');
assert.equal(touch.move(2, 200, 200, 300, 200), undefined);
assert.equal(touch.move(1, 200, 200, 0, 200), undefined);
assert.deepEqual(touch.move(1, 100, 100, 300, 200), { x: 0, y: 0 });
for (const x of [-1, 1]) for (const y of [-1, 1]) {
  assert.deepEqual(touch.move(1, 100 + x * 50, 100 + y * 50, 300, 200), { x: x * .5, y: y * .5 });
}
assert.deepEqual(touch.move(1, 1000, -1000, 300, 200), { x: 1, y: -1 }, 'Captured pointer can leave the card without resetting');
assert.equal(touch.end(2), false, 'Unrelated touch ending does not interrupt a drag');
assert.equal(touch.active(), true);
assert.equal(touch.end(1), true);
assert.equal(touch.active(), false);
assert.equal(touch.move(1, 200, 200, 300, 200), undefined);
assert.equal(touch.begin(3, 5, 5, true), true);
touch.reset();
assert.equal(touch.active(), false);
const component = fs.readFileSync('src/components/InteractiveModel.tsx', 'utf8');
assert.match(component, /setPointerCapture\(event.pointerId\)/);
assert.match(component, /releasePointerCapture\(event.pointerId\)/);
assert.match(component, /onPointerCancel=/);
assert.match(component, /onLostPointerCapture=/);
assert.match(component, /onPointerLeave=.+event.pointerType !== 'touch'/);
assert.match(fs.readFileSync('src/styles.css', 'utf8'), /\.interactive-model\.is-ready\s*\{[^}]*touch-action:\s*none/);
console.log('PASS: all-axis touch drag, pointer ownership/capture, multi-touch guard, release/cancel and isolated touch-action.');
