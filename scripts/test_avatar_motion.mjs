import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadModule } from './load_source.mjs';

const { createAvatarVisit, avatarPoseAt, AVATAR_POSES, AVATAR_VISIBILITY_THRESHOLD, AVATAR_ENTRANCE_MS, AVATAR_GREETING_MS } = await loadModule('src/components/avatarMotion.ts');
const ready = { visible: true, ready: true, pageVisible: true };
const documentVisit = createAvatarVisit();
assert.equal(documentVisit.hasEntered(), false);
for (const state of [
  { ...ready, visible: false }, // Home, including assets finishing in the background.
  { ...ready, ready: false }, // About visible, image still loading.
  { ...ready, pageVisible: false }, // Background tab.
]) {
  assert.equal(documentVisit.enter(state), 'waiting');
  assert.equal(documentVisit.hasEntered(), false, 'Waiting must not consume the entrance');
}
assert.equal(documentVisit.enter(ready), 'entering', 'First actual view starts entrance');
assert.equal(documentVisit.hasEntered(), true, 'Consume immediately, including an interrupted entrance');
for (const reason of ['scroll down then back', 'back-to-top passes about', 'anchor navigation', 'component remount', 'tab hidden then visible']) {
  assert.equal(documentVisit.enter(ready), 'idle', `No replay on ${reason}`);
}
assert.equal(documentVisit.enter({ ...ready, visible: false }), 'idle', 'Finished visit stays static offscreen');
const refreshVisit = createAvatarVisit();
assert.equal(refreshVisit.enter({ ...ready, visible: false }), 'waiting', 'Refresh starts on home; no offscreen animation');
assert.equal(refreshVisit.enter(ready), 'entering', 'Scroll to about after refresh gets a fresh entrance');
const reducedVisit = createAvatarVisit();
assert.equal(reducedVisit.enter({ ...ready, reducedMotion: true }), 'idle', 'Reduced motion skips entrance');
assert.equal(reducedVisit.enter(ready), 'idle', 'Changing reduced-motion preference must not replay');
assert.equal(AVATAR_VISIBILITY_THRESHOLD, .45);
assert.equal(AVATAR_ENTRANCE_MS, 1100);
assert.equal(AVATAR_GREETING_MS, 1400);
assert.deepEqual([0, 190, 670, 880].map(avatarPoseAt), [1, 2, 3, 0]);
assert.deepEqual([1100, 1240, 1390, 1540, 1690, 1840, 1990, 2170, 2500].map(avatarPoseAt), [4, 5, 6, 7, 6, 7, 5, 4, 0]);
assert.ok(AVATAR_POSES.every((pose, i) => pose.frame >= 0 && pose.frame < 8 && (!i || pose.at > AVATAR_POSES[i - 1].at)));
assert.ok(AVATAR_POSES.at(-1).at < AVATAR_ENTRANCE_MS + AVATAR_GREETING_MS);
assert.equal(avatarPoseAt(100000), 0, 'Finished motion never loops');
const component = await readFile('src/components/ProfileAvatar.tsx', 'utf8');
const styles = await readFile('src/components/ProfileAvatar.css', 'utf8');
assert.doesNotMatch(component, /pointermove|pointerdown|onKeyDown|tabIndex|GazeFrame|avatar-gaze|--look-|avatarLook|requestAnimationFrame|移动鼠标|轻触窗口/);
assert.doesNotMatch(styles, /avatar-head|avatar-gaze|--look-|avatar-instruction/);
assert.match(component, /className="avatar-sprite" src=\{AVATAR\}/, 'Resting character is the complete, unsplit original image');
console.log('PASS: home/loading/hidden gates; one entrance per document; refresh reset; static rest with no pointer, gaze or keyboard interaction.');
