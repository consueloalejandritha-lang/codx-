import assert from 'node:assert/strict';
import { loadModule } from './load_source.mjs';

const { softwareOverflows, nextSoftwareOffset, attachSoftwareLoop } = await loadModule('src/components/softwareLoop.ts');
assert.equal(softwareOverflows(1048, 1361), false, 'Desktop fits: no loop');
assert.equal(softwareOverflows(1048, 721), true, 'Portrait iPad: loop');
assert.equal(softwareOverflows(1048, 343), true, 'Phone: loop');
assert.equal(softwareOverflows(720.4, 720), false, 'Ignore subpixel rounding');
for (const fps of [30, 60, 120]) {
  let x = 0;
  for (let n = 0; n < fps * 10; n++) x = nextSoftwareOffset(x, 1 / fps, 1066);
  assert.ok(Math.abs(x - 240) < 0.00001);
}
assert.ok(nextSoftwareOffset(1065.9, 1 / 60, 1066) < 1, 'Wrap without reversing');
assert.equal(nextSoftwareOffset(400, 1, 0), 0);

let onResize, onVisibility;
let listWidth = 1048;
let overflow;
const frames = new Map();
let frameId = 0;
const timers = new Map();
let timerId = 0;
const motion = Object.assign(new EventTarget(), { matches: false });
globalThis.document = Object.assign(new EventTarget(), { hidden: false });
globalThis.window = Object.assign(new EventTarget(), {
  matchMedia: () => motion,
  setTimeout: callback => { timers.set(++timerId, callback); return timerId; },
  clearTimeout: id => timers.delete(id),
});
globalThis.requestAnimationFrame = callback => { frames.set(++frameId, callback); return frameId; };
globalThis.cancelAnimationFrame = id => frames.delete(id);
globalThis.getComputedStyle = () => ({ columnGap: '18px' });
globalThis.ResizeObserver = class { constructor(callback) { onResize = callback; } observe() {} disconnect() {} };
globalThis.IntersectionObserver = class { constructor(callback) { onVisibility = value => callback([{ isIntersecting: value }]); } observe() {} disconnect() {} };
const viewport = Object.assign(new EventTarget(), { clientWidth: 343, scrollLeft: 0, matches: () => false });
const list = { getBoundingClientRect: () => ({ width: listWidth }), parentElement: {} };
const cleanup = attachSoftwareLoop(viewport, list, value => { overflow = value; });
assert.equal(overflow, true);
assert.equal(frames.size, 0, 'Offscreen does not animate');
onVisibility(true);
assert.equal(frames.size, 1);
function tick(time) { const callback = [...frames.values()][0]; frames.clear(); callback(time); }
tick(100); tick(120);
assert.ok(viewport.scrollLeft > 0);
const enter = new Event('pointerenter'); enter.pointerType = 'mouse'; viewport.dispatchEvent(enter);
assert.equal(frames.size, 0, 'Hover pauses');
viewport.dispatchEvent(new Event('pointerleave'));
assert.equal(frames.size, 1);
document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
assert.equal(frames.size, 0);
document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
motion.matches = true; motion.dispatchEvent(new Event('change'));
assert.equal(frames.size, 0, 'Reduced motion keeps manual scrolling');
motion.matches = false; motion.dispatchEvent(new Event('change'));
viewport.clientWidth = 1361; listWidth = 1361; onResize();
assert.equal(overflow, false);
assert.equal(viewport.scrollLeft, 0);
assert.equal(frames.size, 0, 'Resize to desktop stops loop');
viewport.clientWidth = 721; listWidth = 1048; onResize();
assert.equal(overflow, true);
assert.equal(frames.size, 1, 'Rotate to portrait restarts loop');
viewport.dispatchEvent(new Event('pointerdown'));
assert.equal(frames.size, 0, 'Touch interaction pauses');
window.dispatchEvent(new Event('pointerup'));
assert.equal(timers.size, 1);
cleanup();
assert.equal(frames.size, 0);
assert.equal(timers.size, 0);
console.log('PASS: overflow detection, seamless timing, tablet rotation, hover/touch pause, reduced motion and cleanup.');
