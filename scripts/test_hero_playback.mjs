import assert from 'node:assert/strict';
import { loadModule } from './load_source.mjs';

const { attachHeroPlayback } = await loadModule('src/components/heroPlayback.ts');
const flush = async () => { for (let i = 0; i < 6; i++) await Promise.resolve(); };
const timers = new Map();
let timerId = 0;
let visibility;
let disconnected = false;
const motion = Object.assign(new EventTarget(), { matches: false });
globalThis.document = Object.assign(new EventTarget(), { hidden: false });
globalThis.window = {
  matchMedia: () => motion,
  setTimeout: (callback, delay) => { assert.equal(delay, 700); timers.set(++timerId, callback); return timerId; },
  clearTimeout: id => timers.delete(id),
};
globalThis.IntersectionObserver = class {
  constructor(callback) { visibility = value => callback([{ isIntersecting: value }]); }
  observe() {}
  disconnect() { disconnected = true; }
};
class Video extends EventTarget {
  paused = true;
  ended = false;
  currentTime = 0;
  playCount = 0;
  rejectPlay = false;
  play() {
    this.playCount++;
    if (this.rejectPlay) return Promise.reject(new Error('NotAllowedError'));
    this.paused = false;
    this.ended = false;
    this.dispatchEvent(new Event('playing'));
    return Promise.resolve();
  }
  pause() { this.paused = true; this.dispatchEvent(new Event('pause')); }
}
const video = new Video();
let state;
const cleanup = attachHeroPlayback(video, next => { state = next; });
assert.equal(video.playCount, 0, 'Do not play before the hero enters view');
visibility(true);
await flush();
assert.equal(video.muted, true);
assert.deepEqual(state, { ready: true, transitioning: false });
video.ended = true;
video.paused = true;
video.dispatchEvent(new Event('ended'));
assert.equal(state.transitioning, true);
assert.equal(timers.size, 1);
const callback = [...timers.values()][0]; timers.clear(); callback();
await flush();
assert.equal(video.currentTime, 0);
assert.equal(video.playCount, 2);
assert.equal(state.transitioning, false);
visibility(false);
assert.equal(video.paused, true);
visibility(true);
await flush();
assert.equal(video.paused, false);
document.hidden = true; document.dispatchEvent(new Event('visibilitychange'));
assert.equal(video.paused, true);
document.hidden = false; document.dispatchEvent(new Event('visibilitychange'));
await flush();
assert.equal(video.paused, false);
motion.matches = true; motion.dispatchEvent(new Event('change'));
assert.equal(video.paused, true);
assert.equal(state.ready, false);
video.rejectPlay = true;
motion.matches = false; motion.dispatchEvent(new Event('change'));
await flush();
assert.equal(state.ready, false, 'Autoplay rejection keeps the poster');
video.rejectPlay = false;
document.dispatchEvent(new Event('pointerdown'));
await flush();
assert.equal(state.ready, true, 'A user gesture can resume restricted playback');
video.dispatchEvent(new Event('error'));
assert.equal(state.ready, false, 'Decode failure restores the poster');
video.ended = true; video.paused = true;
video.dispatchEvent(new Event('ended'));
assert.equal(timers.size, 1);
cleanup();
assert.equal(timers.size, 0);
assert.ok(disconnected);
assert.equal(video.paused, true);
const count = video.playCount;
document.dispatchEvent(new Event('pointerdown'));
assert.equal(video.playCount, count, 'No handlers survive unmount');
console.log('PASS: hero visibility, loop fade, autoplay fallback, reduced motion, gesture recovery and cleanup.');
